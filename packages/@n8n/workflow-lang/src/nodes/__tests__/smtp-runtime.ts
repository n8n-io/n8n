/**
 * The real runtime for the tests of the mail nodes: `wfrt serve --smtp-native` as a child
 * process, with a workflow that gives the body of its webhook to the `smtp` effect. A test
 * answers the `smtp` effects of a library node with it, so the message builder and the SMTP
 * client of the runtime do the work. The runtime listens on a loopback socket.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from '../../compiler/index.ts';

const here = dirname(fileURLToPath(import.meta.url));
const WFRT = join(here, '../../../../../../workflow-runtime/zig-out/bin/wfrt');

/** True when the runtime is built (`zig build -Drelease=true` in `workflow-runtime`). */
export function runtimeBuilt(): boolean {
	return existsSync(WFRT);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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

/** A workflow that gives the body of its webhook to the `smtp` effect, for each credential slot. */
function effectSource(slots: string[]): string {
	const fields = [
		'from',
		'to',
		'cc',
		'bcc',
		'replyTo',
		'subject',
		'text',
		'html',
		'inReplyTo',
		'references',
		'keepBcc',
		'build',
		'attachments',
		'allowUnauthorizedCerts',
	];
	const branch = (slot: string) => `if (slot === '${slot}') {
				return { result: await ctx.smtp({
					name: 'Send ${slot}',
					credential: '${slot}',
					${fields.map((f) => `${f}: a.${f},`).join('\n\t\t\t\t\t')}
				}) };
			}`;
	return `import { webhook, workflow, type SmtpRequest } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<{ slot: string; args: SmtpRequest }>({ path: 'smtp-effect', method: 'POST' })],
	credentials: { ${slots.map((slot) => `${slot}: { type: 'smtp' }`).join(', ')} },
	async run(ctx, trigger) {
		const slot = trigger.body.slot;
		const a = trigger.body.args;
		try {
			${slots.map(branch).join('\n\t\t\t')}
		} catch (e) {
			return { failed: String((e as { message?: string }).message) };
		}
		return { failed: 'no such slot' };
	},
});
`;
}

export interface MailRuntime {
	port: number;
	process: ChildProcess;
}

/**
 * Starts the runtime in `work` with the effect workflow for `slots`, the modules of
 * `modules` (file name and bytes) and the credentials document.
 */
export async function startMailRuntime(
	work: string,
	slots: string[],
	credentials: Record<string, unknown>,
	modules: Record<string, Uint8Array> = {},
): Promise<MailRuntime> {
	writeFileSync(join(work, 'credentials.json'), JSON.stringify(credentials), { mode: 0o600 });
	const effect = compile(effectSource(slots), { fileName: '/workflow.ts' });
	if (!effect.module) throw new Error(`the effect workflow: ${JSON.stringify(effect.diagnostics)}`);
	writeFileSync(join(work, 'effect.wfm'), effect.module);
	const args = ['--module', join(work, 'effect.wfm')];
	for (const [name, bytes] of Object.entries(modules)) {
		writeFileSync(join(work, name), bytes);
		args.push('--module', join(work, name));
	}
	const port = await freePort();
	const child = spawn(
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
			...args,
		],
		{ stdio: 'ignore', env: { ...process.env, TZ: 'UTC' } },
	);
	// The runtime answers when it listens. A path without a workflow gives 404.
	for (let tries = 0; tries < 200; tries++) {
		try {
			await fetch(`http://127.0.0.1:${port}/ready-probe`);
			break;
		} catch {
			await new Promise((resolve) => setTimeout(resolve, 50));
		}
	}
	return { port, process: child };
}

/** A POST request to a webhook of the runtime. */
export async function postToRuntime(
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
export async function runSmtpEffect(port: number, args: unknown): Promise<unknown> {
	const slot = isRecord(args) ? args.credential : undefined;
	const answer = await postToRuntime(port, 'smtp-effect', { slot, args });
	const body = isRecord(answer.body) ? answer.body : {};
	if ('result' in body) return body.result;
	return { $error: typeof body.failed === 'string' ? body.failed : JSON.stringify(answer) };
}

/**
 * `text` with the instance id `id` (of the v1 recorder) replaced with `fixed`, also where a
 * soft line break of a quoted-printable part is in the id. Both ids have 64 hex digits.
 */
export function withInstanceId(text: string, id: string, fixed: string): string {
	if (id === '') return text;
	const pattern = new RegExp(id.split('').join('(?:=\\r\\n)?'), 'g');
	return text.replace(pattern, (found) => {
		let k = 0;
		return found.replace(/[0-9a-f]/g, () => fixed[k++]);
	});
}
