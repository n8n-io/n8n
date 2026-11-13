/**
 * Runs one `ctx.node` step in the fallback host's node runner, in process,
 * to read the error of a step that ended an execution with
 * `needs_attention`: `wfrt` does not send a `failed` event with the error
 * then (see `docs/gym-diff.md`, runtime findings). The caller runs it after
 * it has read the gym state, because the step can call the gym again.
 *
 *   node scripts/gym/host-step.ts <step.json> <result.json>
 *
 * `step.json` is `{ args, step, credentials: { <slot>: { type, data } } }`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { isRecord, packageRoot } from './sample.ts';

async function main() {
	const [stepFile, outFile] = process.argv.slice(2);
	const job: unknown = JSON.parse(readFileSync(stepFile, 'utf8'));
	if (!isRecord(job)) throw new Error('bad step file');
	const dist = join(packageRoot, '..', 'workflow-fallback-host', 'dist');
	const req = createRequire(join(dist, 'index.js'));
	const mod: unknown = req(join(dist, 'node-step.js'));
	const Runner: unknown = Reflect.get(Object(mod), 'NodeStepRunner');
	const parse: unknown = Reflect.get(Object(mod), 'parseNodeStepArgs');
	if (typeof Runner !== 'function' || typeof parse !== 'function')
		throw new Error('host dist is missing');
	const creds = isRecord(job.credentials) ? job.credentials : {};
	const store = {
		get: async (slot: string) => {
			const e = creds[slot];
			if (isRecord(e) && isRecord(e.data)) return e.data;
			throw new Error(`No credential for slot "${slot}"`);
		},
	};
	const runner: unknown = Reflect.construct(Runner, [{ credentials: store }]);
	let out: unknown;
	const jobArgs = isRecord(job.args) ? job.args : {};
	if (typeof jobArgs.code === 'string') {
		// A `ctx.code` step: the host's code runner.
		const code: unknown = req(join(dist, 'code-step.js'));
		const runCode: unknown = Reflect.get(Object(code), 'runCodeStep');
		const parseCode: unknown = Reflect.get(Object(code), 'parseCodeStepArgs');
		if (typeof runCode !== 'function' || typeof parseCode !== 'function')
			throw new Error('host dist is missing');
		try {
			const result: unknown = await Promise.resolve(
				Reflect.apply(runCode, undefined, [Reflect.apply(parseCode, undefined, [jobArgs])]),
			);
			out = { ok: true, result };
		} catch (e) {
			out = { ok: false, error: e instanceof Error ? e.message : String(e) };
		}
		writeFileSync(outFile, JSON.stringify(out));
		process.exit(0);
	}
	try {
		const args: unknown = Reflect.apply(parse, undefined, [job.args]);
		const result: unknown = await Promise.resolve(
			Reflect.apply(Reflect.get(Object(runner), 'run'), runner, [
				args,
				{ step: String(job.step), key: `${String(job.step)}-diag`, credentials: store },
			]),
		);
		out = { ok: true, result };
	} catch (e) {
		out = { ok: false, error: e instanceof Error ? e.message : String(e) };
	}
	writeFileSync(outFile, JSON.stringify(out));
	process.exit(0);
}

void main().catch((e: unknown) => {
	process.stderr.write(`host-step: ${e instanceof Error ? e.message : String(e)}\n`);
	process.exit(2);
});
