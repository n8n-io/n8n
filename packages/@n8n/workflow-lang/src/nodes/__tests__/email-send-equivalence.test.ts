/**
 * Equivalence of the Send Email library node and the v1 node.
 *
 * Live (the v1 recorder is built, and `wfrt` is built in `workflow-runtime/zig-out`): each
 * case runs the v1 node with nodemailer in n8n's engine against a scripted SMTP server on a
 * loopback socket (`smtp-server.ts`). Then the converted workflow runs with the library
 * node, and the real runtime answers each `smtp` effect: `wfrt serve --smtp-native` builds
 * the message and talks to the same server. The test compares the output or the error of
 * the node, the commands that the server got and the message that it got. The Message-ID
 * digits, the boundaries, the Date value and the two times of the result change from run to
 * run: both sides get the same mask. The third part runs the whole converted workflow as
 * bytecode in `wfrt` against the same server.
 *
 * `EMAIL_SEND_RECORD=1` writes `email-send-recordings.json`: what v1 gave, and the `smtp`
 * calls of the library node with the results of the runtime.
 *
 * Without the recorder or without `wfrt`, the test runs the library node on the recorded
 * results and checks its `smtp` calls and its output against the recording, in the
 * reference runner and in the bytecode VM.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from '../../compiler/index.ts';
import { decodeModule } from '../../compiler/decode.ts';
import { convertWorkflow } from '../../convert/index.ts';
import type { EffectRecord, Fixture } from '../../reference/runner.ts';
import { runReference } from '../../reference/runner.ts';
import { runModule } from '../../testing/vm.ts';
import type { EmailSendCase, EmailSendCredential } from './email-send-cases.ts';
import { EMAIL_SEND_CASES, EMAIL_SEND_HOST_SETTINGS } from './email-send-cases.ts';
import type { ErrorDetail } from './equivalence.ts';
import { errorDetailOfResult } from './equivalence.ts';
import type { SmtpServer, SmtpSession } from './smtp-server.ts';
import { maskInfo, maskMessage, startSmtpServer } from './smtp-server.ts';
import { recordV1, recorderAvailable } from './v1-recorder.ts';

const here = dirname(fileURLToPath(import.meta.url));
const recordingFile = join(here, 'email-send-recordings.json');
const WFRT = join(here, '../../../../../../workflow-runtime/zig-out/bin/wfrt');
const NODE = 'Node';
const HOST_NODE = 'Node (fallback host)';
const TYPE = 'n8n-nodes-base.emailSend';
/** The instance id of the converted workflows. The id of the recorder is replaced with it. */
const INSTANCE_ID = 'c0de'.repeat(16);
const SLOTS: EmailSendCredential[] = ['login', 'open', 'plain', 'direct', 'closed'];

interface SmtpCallRecord {
	args: unknown;
	/** The result of the effect, or `{ $error }` for an effect that failed. */
	result: unknown;
}

interface Outcome {
	output?: unknown;
	error?: string;
	errorDetail?: ErrorDetail;
}

interface EmailSendRecording {
	/** The output items of the v1 node, or its error. */
	v1: Outcome;
	/** What the server got from the v1 node, with the masks. */
	sessions: SmtpSession[];
	/** The `smtp` calls of the library node, with the results of the runtime. */
	calls: SmtpCallRecord[];
	/** The runtime gave a call to the fallback host. */
	host?: boolean;
}

const hasRuntime = existsSync(WFRT);
const live = recorderAvailable() && hasRuntime;
const record = live && process.env.EMAIL_SEND_RECORD === '1';
const stored: Record<string, EmailSendRecording> = existsSync(recordingFile)
	? JSON.parse(readFileSync(recordingFile, 'utf8'))
	: {};
const written: Record<string, EmailSendRecording> = {};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function jsonCopy<T>(value: T): T {
	return JSON.parse(JSON.stringify(value));
}

function nodeOf(c: EmailSendCase, settings: Record<string, unknown> = {}) {
	return {
		id: 'step',
		name: NODE,
		type: TYPE,
		typeVersion: c.typeVersion ?? 2.1,
		position: [400, 0],
		parameters: c.parameters,
		// The name of the credential is the name of its slot in the converted workflow.
		credentials: { smtp: { id: c.credential ?? 'login', name: c.credential ?? 'login' } },
		...(c.onError ? { onError: c.onError } : {}),
		...settings,
	};
}

function workflowOf(c: EmailSendCase, path = 'p', settings: Record<string, unknown> = {}) {
	return {
		name: 'Send Email',
		nodes: [
			{
				name: 'Hook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				position: [0, 0],
				parameters: { path, httpMethod: 'POST', responseMode: 'lastNode', options: {} },
			},
			{
				name: 'Split',
				type: 'n8n-nodes-base.splitOut',
				typeVersion: 1,
				position: [200, 0],
				parameters: { fieldToSplitOut: 'body.rows', options: {} },
			},
			nodeOf(c, settings),
		],
		connections: {
			Hook: { main: [[{ node: 'Split', type: 'main', index: 0 }]] },
			Split: { main: [[{ node: NODE, type: 'main', index: 0 }]] },
		},
	};
}

const instance = { baseUrl: 'http://127.0.0.1:5678/', id: INSTANCE_ID };

function sourceOf(c: EmailSendCase): string {
	const out = convertWorkflow(workflowOf(c), { smtp: true, instance, trace: 'all' });
	expect(out.ok).toBe(true);
	expect(out.fallbackNodes).toEqual([]);
	return out.source;
}

function fixtureOf(c: EmailSendCase, effects: Record<string, unknown[]>): Fixture {
	return {
		trigger: { body: { rows: c.items ?? [{}] }, headers: {}, query: {} },
		now: 0,
		seed: 1,
		effects,
		trace: true,
	};
}

interface Run {
	outcome: Outcome;
	host: boolean;
	smtp: EffectRecord[];
}

/** What a run of the converted workflow gave for the node. */
function runOf(run: Awaited<ReturnType<typeof runReference>>): Run {
	const smtp = run.effects.filter((e) => e.kind === 'smtp');
	const host = run.effects.some((e) => e.kind === 'node' && e.step === HOST_NODE);
	if (run.status !== 'ok') {
		const message = isRecord(run.result) ? String(run.result.message) : String(run.result);
		return {
			outcome: { error: message, errorDetail: errorDetailOfResult(run.result) },
			host,
			smtp,
		};
	}
	const traced = [...(run.trace ?? [])]
		.reverse()
		.find((t) => t.step === NODE && Array.isArray(t.items));
	return { outcome: { output: Array.isArray(traced?.items) ? traced.items : [] }, host, smtp };
}

/** The answer of the fallback host for the node of a case, from what v1 gave. */
function hostAnswer(v1: Outcome): unknown {
	return v1.error !== undefined ? { $error: v1.error } : v1.output;
}

/** The instance id of the recorder in `text`, also across the soft line breaks of a part. */
function withInstanceId(text: string, id: string): string {
	if (id === '') return text;
	const pattern = new RegExp(id.split('').join('(?:=\\r\\n)?'), 'g');
	return text.replace(pattern, (found) => {
		let k = 0;
		return found.replace(/[0-9a-f]/g, () => INSTANCE_ID[k++]);
	});
}

function masked(sessions: SmtpSession[], id = ''): SmtpSession[] {
	return sessions.map((session) => ({
		...session,
		...(session.message === undefined
			? {}
			: { message: withInstanceId(maskMessage(session.message), id) }),
	}));
}

interface Bed {
	server: SmtpServer;
	work: string;
	runtime: ChildProcess;
	port: number;
	/** The instance id of the v1 recorder. */
	v1InstanceId: string;
}
let bed: Bed | undefined;

async function freePort(): Promise<number> {
	return await new Promise((resolve, reject) => {
		const probe = net.createServer();
		probe.on('error', reject);
		probe.listen(0, '127.0.0.1', () => {
			const address = probe.address();
			const port = typeof address === 'object' && address !== null ? address.port : 0;
			probe.close(() => resolve(port));
		});
	});
}

function credentialData(server: SmtpServer, slot: EmailSendCredential): Record<string, unknown> {
	const login = { user: 'user', password: 'secret' };
	const base = { host: '127.0.0.1', port: server.port, secure: false, hostName: 'client.test' };
	if (slot === 'open') return { ...base, user: '', password: '', disableStartTls: false };
	if (slot === 'plain') return { ...base, ...login, disableStartTls: true };
	if (slot === 'direct') return { ...base, ...login, port: server.securePort, secure: true };
	if (slot === 'closed') return { ...base, ...login, port: 1, disableStartTls: false };
	return { ...base, ...login, disableStartTls: false };
}

/** A workflow that gives the body of its webhook to the `smtp` effect, for each credential. */
function effectSource(): string {
	const fields = ['from', 'to', 'cc', 'bcc', 'replyTo', 'subject', 'text', 'html'];
	const branch = (slot: string) => `if (slot === '${slot}') {
				return { result: await ctx.smtp({
					name: 'Send ${slot}',
					credential: '${slot}',
					${fields.map((f) => `${f}: a.${f},`).join('\n\t\t\t\t\t')}
					attachments: a.attachments,
					allowUnauthorizedCerts: a.allowUnauthorizedCerts,
				}) };
			}`;
	return `import { webhook, workflow, type SmtpRequest } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<{ slot: string; args: SmtpRequest }>({ path: 'smtp-effect', method: 'POST' })],
	credentials: { ${SLOTS.map((slot) => `${slot}: { type: 'smtp' }`).join(', ')} },
	async run(ctx, trigger) {
		const slot = trigger.body.slot;
		const a = trigger.body.args;
		try {
			${SLOTS.map(branch).join('\n\t\t\t')}
		} catch (e) {
			return { failed: String((e as { message?: string }).message) };
		}
		return { failed: 'no such slot' };
	},
});
`;
}

/** The module of the whole converted workflow of a case, for the run in `wfrt`. */
function moduleOf(c: EmailSendCase, k: number): Uint8Array {
	const out = convertWorkflow(workflowOf(c, `case-${k}`), { smtp: true, instance });
	expect(out.ok).toBe(true);
	const compiled = compile(out.source, { fileName: '/workflow.ts', extraNodes: out.nodes });
	expect(compiled.diagnostics).toEqual([]);
	return compiled.module ?? new Uint8Array();
}

async function startBed(): Promise<Bed> {
	const server = await startSmtpServer();
	const work = mkdtempSync(join(tmpdir(), 'email-send-'));
	const credentials: Record<string, unknown> = {};
	for (const slot of SLOTS)
		credentials[slot] = { type: 'smtp', data: credentialData(server, slot) };
	writeFileSync(join(work, 'credentials.json'), JSON.stringify(credentials), { mode: 0o600 });
	const effect = compile(effectSource(), { fileName: '/workflow.ts' });
	expect(effect.diagnostics).toEqual([]);
	writeFileSync(join(work, 'effect.wfm'), effect.module ?? new Uint8Array());
	const modules = ['--module', join(work, 'effect.wfm')];
	EMAIL_SEND_CASES.forEach((c, k) => {
		if (c.host === true) return;
		writeFileSync(join(work, `case-${k}.wfm`), moduleOf(c, k));
		modules.push('--module', join(work, `case-${k}.wfm`));
	});
	const port = await freePort();
	const runtime = spawn(
		WFRT,
		[
			'serve',
			'--profile',
			'embedded',
			'--port',
			String(port),
			'--smtp-native',
			'--credentials',
			join(work, 'credentials.json'),
			...modules,
		],
		{ stdio: 'ignore', env: { ...process.env, TZ: 'UTC' } },
	);
	// The runtime answers when it listens. A module without the path gives 404.
	for (let tries = 0; tries < 200; tries++) {
		try {
			await fetch(`http://127.0.0.1:${port}/ready-probe`);
			break;
		} catch {
			await new Promise((resolve) => setTimeout(resolve, 50));
		}
	}
	// The instance id of the recorder is in the attribution link of an HTML message.
	server.script({ auth: 'PLAIN LOGIN' });
	await recordV1({
		name: 'instance id',
		type: TYPE,
		typeVersion: 2.1,
		parameters: { fromEmail: 'a@x.test', toEmail: 'b@x.test', emailFormat: 'html', html: 'x' },
		credential: { type: 'smtp', data: credentialData(server, 'login') },
		responses: [],
	});
	const sent = (server.sessions()[0]?.message ?? '').replace(/=\r\n/g, '');
	const v1InstanceId = /emailSend_([0-9a-f]{64})/.exec(sent)?.[1] ?? '';
	return { server, work, runtime, port, v1InstanceId };
}

async function post(
	port: number,
	path: string,
	body: unknown,
): Promise<{ status: number; body: unknown }> {
	const response = await fetch(`http://127.0.0.1:${port}/${path}`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body),
	});
	const text = await response.text();
	let parsed: unknown = text;
	try {
		parsed = JSON.parse(text);
	} catch {}
	return { status: response.status, body: parsed };
}

/** The `smtp` effect on the real runtime: its result, or `{ $error }`. */
async function runEffect(port: number, args: unknown): Promise<unknown> {
	const slot = isRecord(args) ? args.credential : undefined;
	const answer = await post(port, 'smtp-effect', { slot, args });
	const body = isRecord(answer.body) ? answer.body : {};
	if ('result' in body) return body.result;
	return { $error: typeof body.failed === 'string' ? body.failed : JSON.stringify(answer) };
}

/** Runs the v1 node and the library node against the server, and compares them. */
async function runLive(c: EmailSendCase, b: Bed): Promise<EmailSendRecording> {
	const behaviour = c.server ?? { auth: 'PLAIN LOGIN' };
	b.server.script(behaviour);
	const recorded = await recordV1({
		name: c.name,
		type: TYPE,
		typeVersion: c.typeVersion ?? 2.1,
		parameters: c.parameters,
		items: c.items,
		credential: { type: 'smtp', data: credentialData(b.server, c.credential ?? 'login') },
		responses: [],
		// With settings, also empty ones, the recorder runs the node in n8n's engine.
		settings: c.onError ? { onError: c.onError } : {},
	});
	const v1Sessions = masked(jsonCopy(b.server.sessions()), b.v1InstanceId);
	const v1: Outcome = jsonCopy(
		recorded.error === undefined
			? { output: maskInfo((recorded.outputs ?? [])[0] ?? []) }
			: { error: recorded.error, errorDetail: recorded.errorDetail },
	);

	b.server.script(behaviour);
	const calls: SmtpCallRecord[] = [];
	const run = await runReference(sourceOf(c), fixtureOf(c, {}), {
		answer: async (effect) => {
			if (effect.kind === 'smtp') {
				const call = { args: effect.args, result: jsonCopy(await runEffect(b.port, effect.args)) };
				calls.push(jsonCopy({ args: call.args, result: maskInfo(call.result) }));
				return call.result;
			}
			if (effect.kind === 'node' && effect.step === HOST_NODE) return hostAnswer(v1);
			return undefined;
		},
	});
	const native = runOf(run);
	const nativeSessions = masked(jsonCopy(b.server.sessions()));
	if (c.host === true) {
		expect(native.host).toBe(true);
		// The runtime wrote no MAIL command: the message goes out once, from the host.
		expect(nativeSessions.flatMap((s) => s.commands).filter((l) => l.startsWith('MAIL'))).toEqual(
			[],
		);
	} else {
		expect(native.host).toBe(false);
		expect({ ...native.outcome, output: maskInfo(native.outcome.output) }).toEqual({
			output: v1.output,
			error: v1.error,
			errorDetail: v1.errorDetail,
		});
		expect(nativeSessions).toEqual(v1Sessions);
	}
	return { v1, sessions: v1Sessions, calls, ...(c.host === true ? { host: true } : {}) };
}

describe('Send Email library node and the v1 node', () => {
	beforeAll(async () => {
		if (live) bed = await startBed();
	}, 120_000);

	afterAll(async () => {
		if (bed) {
			bed.runtime.kill('SIGKILL');
			await bed.server.close();
			rmSync(bed.work, { recursive: true, force: true });
		}
		if (!record) return;
		// A run of some cases (`-t`) keeps the recordings of the other cases.
		const kept: Record<string, EmailSendRecording> = {};
		for (const c of EMAIL_SEND_CASES) {
			const recording = written[c.name] ?? stored[c.name];
			if (recording !== undefined) kept[c.name] = recording;
		}
		writeFileSync(recordingFile, `${JSON.stringify(kept, null, '\t')}\n`);
	});

	describe.each(EMAIL_SEND_CASES.map((c, k) => ({ ...c, label: c.name, k })))('$label', (c) => {
		it.runIf(live)(
			'gives the result of v1 and sends the message of v1, with the runtime on the server',
			async () => {
				if (!bed) throw new Error('the test bed did not start');
				const recording = await runLive(c, bed);
				written[c.name] = recording;
				if (!record) expect(recording).toEqual(stored[c.name]);
			},
			60_000,
		);

		it.runIf(live && c.host !== true)(
			'runs as bytecode in the runtime and sends the message of v1',
			async () => {
				if (!bed) throw new Error('the test bed did not start');
				const recording = written[c.name] ?? stored[c.name];
				expect(recording).toBeDefined();
				bed.server.script(c.server ?? { auth: 'PLAIN LOGIN' });
				const answer = await post(bed.port, `case-${c.k}`, { rows: c.items ?? [{}] });
				expect(masked(jsonCopy(bed.server.sessions()))).toEqual(recording.sessions);
				if (recording.v1.error === undefined) {
					// The run answers the webhook with the items of its last node.
					expect(answer.status).toBe(200);
					expect(maskInfo(answer.body)).toEqual({ [NODE]: recording.v1.output });
				} else {
					expect(answer.status).toBe(500);
				}
			},
			60_000,
		);

		it.skipIf(record)(
			'makes the recorded calls and gives the recorded result',
			async () => {
				const recording = stored[c.name];
				expect(recording).toBeDefined();
				const source = sourceOf(c);
				const compiled = compile(source);
				expect(compiled.diagnostics).toEqual([]);
				const fixture = fixtureOf(c, {
					[NODE]: recording.calls.map((call) => call.result),
					[HOST_NODE]: [hostAnswer(recording.v1)],
				});
				const run = await runReference(source, fixture);
				const native = runOf(run);
				expect(native.smtp.map((e) => e.args)).toEqual(recording.calls.map((call) => call.args));
				expect(native.host).toBe(recording.host === true);
				if (recording.host !== true) {
					expect(native.outcome).toEqual(recording.v1);
				}
				const bytecode = runModule(decodeModule(compiled.module ?? new Uint8Array()), fixture);
				expect(JSON.stringify(bytecode)).toBe(JSON.stringify(run));
			},
			60_000,
		);
	});

	it('has a recording for each case, and no other', () => {
		if (record) return;
		const names = EMAIL_SEND_CASES.map((c) => c.name);
		expect(new Set(names).size).toBe(names.length);
		expect(Object.keys(stored).sort()).toEqual([...names].sort());
	});

	it('without the SMTP client of the runtime, the node stays in the fallback host', () => {
		const out = convertWorkflow(workflowOf(EMAIL_SEND_CASES[0]), { instance });
		expect(out.ok).toBe(true);
		expect(out.fallbackNodes).toEqual([NODE]);
	});

	it('without the instance id, a node with the attribution stays in the fallback host', () => {
		const [linked, plain] = EMAIL_SEND_CASES;
		expect(convertWorkflow(workflowOf(linked), { smtp: true }).fallbackNodes).toEqual([NODE]);
		expect(convertWorkflow(workflowOf(plain), { smtp: true }).fallbackNodes).toEqual([]);
	});

	it.each(EMAIL_SEND_HOST_SETTINGS)('with %j, the node stays in the fallback host', (settings) => {
		const out = convertWorkflow(workflowOf(EMAIL_SEND_CASES[0], 'p', settings), {
			smtp: true,
			instance,
		});
		expect(out.ok).toBe(true);
		expect(out.fallbackNodes).toEqual([NODE]);
	});

	it('the operation sendAndWait is not a call of the library node', () => {
		const c: EmailSendCase = {
			name: 'wait',
			parameters: { operation: 'sendAndWait', fromEmail: 'a@x.test', toEmail: 'b@x.test' },
		};
		const out = convertWorkflow(workflowOf(c), { smtp: true, instance });
		expect(out.ok).toBe(true);
		// The converter has its own form for a node that sends and waits.
		expect(out.source).not.toContain('nodeVersion');
	});
});
