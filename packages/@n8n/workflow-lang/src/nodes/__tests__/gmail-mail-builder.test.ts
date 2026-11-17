/**
 * The messages of the Gmail library node from the mail builder of the runtime, against the
 * v1 node.
 *
 * Live (the v1 recorder is built, and `wfrt` is built in `workflow-runtime/zig-out`): each
 * case runs the v1 node, which builds its message with nodemailer. Then the converted
 * workflow runs with the library node, and the real runtime answers each `smtp` effect
 * with `build` (`wfrt serve --smtp-native`). The test compares the requests and the output
 * or the error. The message in `raw` must have the bytes of v1: the Message-ID digits, the
 * boundaries and the Date value change from run to run, so both sides get the same mask.
 *
 * `GMAIL_MAIL_RECORD=1` writes `gmail-mail-recordings.json`: what v1 gave, and the `smtp`
 * calls of the library node with the results of the runtime.
 *
 * Without the recorder or without `wfrt`, the test runs the library node on the recorded
 * results and checks its calls, its requests and its output against the recording, in the
 * reference runner and in the bytecode VM.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from '../../compiler/index.ts';
import { decodeModule } from '../../compiler/decode.ts';
import { convertWorkflow } from '../../convert/index.ts';
import type { Fixture } from '../../reference/runner.ts';
import { runReference } from '../../reference/runner.ts';
import { runModule } from '../../testing/vm.ts';
import { EQUIVALENCE_CASES } from './equivalence-cases.ts';
import type { ErrorDetail } from './equivalence.ts';
import { errorDetailOfResult } from './equivalence.ts';
import type { GmailMailCase } from './gmail-mail-cases.ts';
import { GMAIL_MAIL_CASES } from './gmail-mail-cases.ts';
import type { MailRuntime } from './smtp-runtime.ts';
import { runSmtpEffect, runtimeBuilt, startMailRuntime, withInstanceId } from './smtp-runtime.ts';
import { maskMessage } from './smtp-server.ts';
import { recordV1, recorderAvailable } from './v1-recorder.ts';

const here = dirname(fileURLToPath(import.meta.url));
const recordingFile = join(here, 'gmail-mail-recordings.json');
const NODE = 'Node';
const HOST_NODE = 'Node (fallback host)';
const TYPE = 'n8n-nodes-base.gmail';
/** The name of the credential of the node: the name of its slot in the converted workflow. */
const SLOT = 'gmail';
/** The instance id of the converted workflows. The id of the recorder is replaced with it. */
const INSTANCE_ID = 'c0de'.repeat(16);
const instance = { baseUrl: 'http://127.0.0.1:5678/', id: INSTANCE_ID };

/** The cases of the library equivalence test for the messages that the node writes. */
const WRITTEN = /^gmail (message\.send|message\.reply|thread\.reply|draft\.create)\b/;
const CASES: GmailMailCase[] = [
	...EQUIVALENCE_CASES.filter(
		(c) => c.type === TYPE && WRITTEN.test(c.name) && !c.settings && !c.subNodes,
	),
	...GMAIL_MAIL_CASES,
];

interface Request {
	method: string;
	url: string;
	qs: unknown;
	body: unknown;
}

interface Outcome {
	output?: unknown;
	error?: string;
	errorDetail?: ErrorDetail;
}

interface GmailMailRecording {
	/** The requests of the v1 node, with the masks in each message. */
	requests: Request[];
	v1: Outcome;
	/** The `smtp` calls of the library node, with the results of the runtime (masked). */
	calls: Array<{ args: unknown; result: unknown }>;
	/** The kind of each effect of the library node, in order. */
	order: string[];
	/** The runtime did not build a message, and the fallback host ran the node. */
	host?: boolean;
}

const live = recorderAvailable() && runtimeBuilt();
const record = live && process.env.GMAIL_MAIL_RECORD === '1';
const stored: Record<string, GmailMailRecording> = existsSync(recordingFile)
	? JSON.parse(readFileSync(recordingFile, 'utf8'))
	: {};
const written: Record<string, GmailMailRecording> = {};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function jsonCopy<T>(value: T): T {
	return JSON.parse(JSON.stringify(value));
}

function workflowOf(c: GmailMailCase, settings: Record<string, unknown> = {}) {
	return {
		name: 'Gmail',
		nodes: [
			{
				name: 'Hook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				position: [0, 0],
				parameters: { path: 'p', httpMethod: 'POST' },
			},
			{
				name: 'Split',
				type: 'n8n-nodes-base.splitOut',
				typeVersion: 1,
				position: [200, 0],
				parameters: { fieldToSplitOut: 'body.rows', options: {} },
			},
			{
				id: 'step',
				name: NODE,
				type: TYPE,
				typeVersion: c.typeVersion,
				position: [400, 0],
				parameters: c.parameters,
				credentials: { gmailOAuth2: { id: SLOT, name: SLOT } },
				...settings,
			},
		],
		connections: {
			Hook: { main: [[{ node: 'Split', type: 'main', index: 0 }]] },
			Split: { main: [[{ node: NODE, type: 'main', index: 0 }]] },
		},
	};
}

function sourceOf(c: GmailMailCase): string {
	const out = convertWorkflow(workflowOf(c), { smtp: true, instance, trace: 'all' });
	expect(out.ok).toBe(true);
	expect(out.fallbackNodes).toEqual([]);
	// The node gets its messages from the runtime.
	expect(out.source).toContain('mailBuilder: true');
	return out.source;
}

/**
 * The fixture of a case. The runner answers the effects of a step from one list, in order,
 * and starts the list again at its end. Live, the list has the HTTP responses, and the
 * runtime answers the calls that build a message. For a recording, the list has the answer
 * of each effect in the recorded order.
 */
function fixtureOf(c: GmailMailCase, host: unknown, recording?: GmailMailRecording): Fixture {
	const http = c.responses.map((r) => ({ status: 200, headers: {}, ...r }));
	let list: unknown[] = http;
	if (recording) {
		let requests = 0;
		let calls = 0;
		list = recording.order.map((kind) =>
			kind === 'smtp' ? recording.calls[calls++].result : http[requests++ % http.length],
		);
	}
	return {
		trigger: { body: { rows: c.items ?? [{}] }, headers: {}, query: {} },
		now: 0,
		seed: 1,
		effects: { ...(list.length > 0 ? { [NODE]: list } : {}), [HOST_NODE]: [host] },
		trace: true,
	};
}

/** The message of a `raw` text, with the masks. `id` is the instance id of the v1 recorder. */
function maskedRaw(raw: string, id = ''): string {
	const message = Buffer.from(raw, 'base64url').toString('latin1');
	return withInstanceId(maskMessage(message), id, INSTANCE_ID);
}

/** A request body with each `raw` replaced by its masked message. */
function withMaskedRaw(body: unknown, id = ''): unknown {
	if (!isRecord(body)) return body;
	const out: Record<string, unknown> = { ...body };
	if (typeof out.raw === 'string') {
		// The Gmail node of n8n removes the padding.
		expect(out.raw).not.toContain('=');
		out.raw = maskedRaw(out.raw, id);
	}
	if (isRecord(out.message)) out.message = withMaskedRaw(out.message, id);
	return out;
}

function requestOf(given: unknown, id = ''): Request {
	const r = isRecord(given) ? given : {};
	return {
		method: String(r.method),
		url: String(r.url),
		qs: r.qs ?? {},
		body: withMaskedRaw(r.body, id),
	};
}

interface Run {
	outcome: Outcome;
	host: boolean;
	requests: Request[];
	smtp: unknown[];
	order: string[];
}

function runOf(run: Awaited<ReturnType<typeof runReference>>): Run {
	const requests = run.effects.filter((e) => e.kind === 'http').map((e) => requestOf(e.args));
	const smtp = run.effects.filter((e) => e.kind === 'smtp').map((e) => e.args);
	const host = run.effects.some((e) => e.kind === 'node' && e.step === HOST_NODE);
	const order = run.effects
		.filter((e) => e.kind === 'http' || e.kind === 'smtp')
		.map((e) => e.kind);
	if (run.status !== 'ok') {
		const message = isRecord(run.result) ? String(run.result.message) : String(run.result);
		const outcome = { error: message, errorDetail: errorDetailOfResult(run.result) };
		return { outcome, host, requests, smtp, order };
	}
	const traced = [...(run.trace ?? [])]
		.reverse()
		.find((t) => t.step === NODE && Array.isArray(t.items));
	const output = Array.isArray(traced?.items) ? traced.items : [];
	return { outcome: { output }, host, requests, smtp, order };
}

/** The result of a call that builds, with the masks in the message. */
function maskedResult(result: unknown): unknown {
	if (!isRecord(result) || typeof result.raw !== 'string') return result;
	const message = maskedRaw(result.raw);
	return {
		raw: Buffer.from(message, 'latin1').toString('base64url'),
		messageId: maskMessage(String(result.messageId)),
	};
}

function hostAnswer(v1: Outcome): unknown {
	return v1.error !== undefined ? { $error: v1.error } : v1.output;
}

interface Bed {
	work: string;
	runtime: MailRuntime;
	/** The instance id of the v1 recorder. */
	v1InstanceId: string;
}
let bed: Bed | undefined;

async function startBed(): Promise<Bed> {
	const work = mkdtempSync(join(tmpdir(), 'gmail-mail-'));
	const runtime = await startMailRuntime(work, [SLOT], {});
	// The instance id of the recorder is in the attribution link of an HTML message.
	const probe = await recordV1({
		name: 'instance id',
		type: TYPE,
		typeVersion: 2.2,
		parameters: { sendTo: 'a@example.com', subject: 'x', message: 'x', options: {} },
		credential: GMAIL_MAIL_CASES[0].credential,
		responses: [{ body: {} }],
	});
	const body = probe.requests[0]?.body;
	const raw = isRecord(body) && typeof body.raw === 'string' ? body.raw : '';
	const message = Buffer.from(raw, 'base64url').toString('latin1').replace(/=\r\n/g, '');
	const v1InstanceId = /gmail_([0-9a-f]{64})/.exec(message)?.[1] ?? '';
	return { work, runtime, v1InstanceId };
}

/** Runs the v1 node and the library node with the runtime, and compares them. */
async function runLive(c: GmailMailCase, b: Bed): Promise<GmailMailRecording> {
	const recorded = await recordV1(c);
	const v1: Outcome = jsonCopy(
		recorded.error === undefined
			? { output: recorded.output ?? [] }
			: { error: recorded.error, errorDetail: recorded.errorDetail },
	);
	expect(v1.error).toBe(c.expectedError);
	const requests = recorded.requests.map((r) => requestOf(r, b.v1InstanceId));

	const calls: GmailMailRecording['calls'] = [];
	const run = await runReference(sourceOf(c), fixtureOf(c, hostAnswer(v1)), {
		answer: async (effect) => {
			if (effect.kind !== 'smtp') return undefined;
			const result = jsonCopy(await runSmtpEffect(b.runtime.port, effect.args));
			calls.push(jsonCopy({ args: effect.args, result: maskedResult(result) }));
			return result;
		},
	});
	const native = runOf(run);
	if (c.host === true) {
		expect(native.host).toBe(true);
		// The library node sent no message: the message goes out once, from the host.
		expect(native.requests.filter((r) => r.method === 'POST')).toEqual([]);
		if (v1.error === undefined) expect(native.outcome.output).toEqual(v1.output);
	} else {
		expect(native.host).toBe(false);
		expect(native.requests).toEqual(requests);
		expect(native.outcome).toEqual(v1);
	}
	const order = native.order;
	return { requests, v1, calls, order, ...(c.host === true ? { host: true } : {}) };
}

describe('Gmail library node with the mail builder of the runtime, and the v1 node', () => {
	beforeAll(async () => {
		if (live) bed = await startBed();
	}, 120_000);

	afterAll(() => {
		if (bed) {
			bed.runtime.process.kill('SIGKILL');
			rmSync(bed.work, { recursive: true, force: true });
		}
		if (!record) return;
		// A run of some cases (`-t`) keeps the recordings of the other cases.
		const kept: Record<string, GmailMailRecording> = {};
		for (const c of CASES) {
			const recording = written[c.name] ?? stored[c.name];
			if (recording !== undefined) kept[c.name] = recording;
		}
		writeFileSync(recordingFile, `${JSON.stringify(kept, null, '\t')}\n`);
	});

	describe.each(CASES.map((c) => ({ ...c, label: c.name })))('$label', (c) => {
		it.runIf(live)(
			'sends the requests of v1, with the message of v1 from the runtime',
			async () => {
				if (!bed) throw new Error('the test bed did not start');
				const recording = await runLive(c, bed);
				written[c.name] = recording;
				if (!record) expect(recording).toEqual(stored[c.name]);
			},
			60_000,
		);

		it.skipIf(record)(
			'makes the recorded calls and gives the recorded requests and result',
			async () => {
				const recording = stored[c.name];
				expect(recording).toBeDefined();
				const source = sourceOf(c);
				const compiled = compile(source);
				expect(compiled.diagnostics).toEqual([]);
				const fixture = fixtureOf(c, hostAnswer(recording.v1), recording);
				const run = await runReference(source, fixture);
				const native = runOf(run);
				expect(native.smtp).toEqual(recording.calls.map((call) => call.args));
				expect(native.host).toBe(recording.host === true);
				if (recording.host !== true) {
					expect(native.requests).toEqual(recording.requests);
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
		const names = CASES.map((c) => c.name);
		expect(new Set(names).size).toBe(names.length);
		expect(Object.keys(stored).sort()).toEqual([...names].sort());
	});

	it('without the mail builder of the runtime, a message with files stays in the fallback host', () => {
		const [files] = GMAIL_MAIL_CASES;
		const out = convertWorkflow(workflowOf(files), { instance });
		expect(out.ok).toBe(true);
		expect(out.fallbackNodes).toEqual([NODE]);
		// A message without files is written by the node itself, as before.
		const plain = CASES[0];
		const before = convertWorkflow(workflowOf(plain), { instance });
		expect(before.fallbackNodes).toEqual([]);
		expect(before.source).not.toContain('mailBuilder');
	});

	it('with "retry on fail", the node writes the message itself', () => {
		const out = convertWorkflow(workflowOf(CASES[0], { retryOnFail: true }), {
			smtp: true,
			instance,
		});
		expect(out.ok).toBe(true);
		expect(out.source).not.toContain('mailBuilder');
	});
});
