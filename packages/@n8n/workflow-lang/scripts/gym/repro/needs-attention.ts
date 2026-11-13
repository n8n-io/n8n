/**
 * Minimal reproduction of a `wfrt` event gap (spec 9.2): a step that fails
 * outside a try block ends the execution with `finished` /
 * `needs_attention`, but no `step` event with `status: "failed"` and the
 * error comes before it, also with `trace: true`. n8n then cannot show why
 * the step failed.
 *
 *   node scripts/gym/repro/needs-attention.ts
 *
 * It prints the events and exits with 1 when the `failed` event is missing.
 */
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { compile } from '../../../src/compiler/index.ts';
import { freePort } from '../processes.ts';
import { repoRoot } from '../sample.ts';
import { WfrtClient } from '../wfrt.ts';

const here = import.meta.dirname;
const source = readFileSync(join(here, 'needs-attention.wf.ts'), 'utf8');
const compiled = compile(source, { fileName: '/workflow.ts' });
if (!compiled.ok || !compiled.module) throw new Error('compile failed');
const dir = mkdtempSync(join(tmpdir(), 'wfrt-repro-'));
const secret = randomBytes(24).toString('hex');
const [port, admin] = [await freePort(), await freePort()];
const child = spawn(
	join(repoRoot, 'workflow-runtime', 'zig-out', 'bin', 'wfrt'),
	[
		'serve',
		'--port',
		String(port),
		'--admin-port',
		String(admin),
		'--admin-secret-env',
		'WFRT_ADMIN_SECRET',
		'--log-dir',
		dir,
		'--shards',
		'1',
	],
	{ env: { ...process.env, WFRT_ADMIN_SECRET: secret }, stdio: 'ignore' },
);
try {
	const client = new WfrtClient(`http://127.0.0.1:${admin}`, secret);
	for (let i = 0; i < 50; i++) {
		try {
			await client.open();
			break;
		} catch {
			await new Promise((r) => setTimeout(r, 100));
		}
	}
	await client.putWorkflow('repro', {
		versionId: 'v1',
		module: Buffer.from(compiled.module).toString('base64'),
		active: false,
		webhookPrefix: '/webhook',
	});
	const run = await client.run('repro', '1', { body: {} }, 10_000);
	for (const e of run.events) process.stdout.write(`${JSON.stringify(e)}\n`);
	client.close();
	const failed = run.events.some((e) => e.type === 'step' && e.status === 'failed');
	process.stdout.write(
		failed ? 'ok: a failed event came\n' : 'BUG: no failed step event before needs_attention\n',
	);
	process.exitCode = failed ? 0 : 1;
} finally {
	child.kill('SIGTERM');
}
