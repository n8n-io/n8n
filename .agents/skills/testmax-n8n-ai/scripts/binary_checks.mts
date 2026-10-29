// Runs the deterministic binary checks of the Instance AI eval suite on each workflow of a run.
// Run it with tsx from the instance-ai package, because the checks are TypeScript sources:
//
//   pnpm --filter @n8n/instance-ai exec tsx <skill>/scripts/binary_checks.mts <run-dir>
//
// Writes <builder>/binary-checks.json with {source, outcomes: [{name, description, dimension, status, comment}]}.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const SOURCE = 'packages/@n8n/instance-ai/evaluations/binaryChecks/checks';

type Check = {
	name: string;
	description: string;
	kind: 'deterministic' | 'llm';
	dimension: string;
	run(workflow: unknown, ctx: Record<string, unknown>): unknown;
};
type Result = { pass: boolean; comment?: string; applicable?: boolean; errored?: boolean };

const readJson = (file: string): unknown => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null);

const runDir = resolve(process.argv[2] ?? '.');
const { DETERMINISTIC_CHECKS } = (await import(pathToFileURL(join(repo, SOURCE, 'index.ts')).href)) as { DETERMINISTIC_CHECKS: Check[] };
const prompt = existsSync(join(runDir, 'prompt.txt')) ? readFileSync(join(runDir, 'prompt.txt'), 'utf8') : '';

for (const entry of readdirSync(runDir, { withFileTypes: true })) {
	const dir = join(runDir, entry.name);
	const workflow = entry.isDirectory() ? readJson(join(dir, 'workflow.json')) : null;
	if (!workflow) continue;
	const outcomes = [];
	for (const check of DETERMINISTIC_CHECKS) {
		let status: string;
		let comment: string | undefined;
		try {
			const r = (await check.run(workflow, { prompt })) as Result;
			status = r.errored ? 'error' : r.applicable === false ? 'n_a' : r.pass ? 'pass' : 'fail';
			comment = r.comment;
		} catch (error) {
			status = 'error';
			comment = error instanceof Error ? error.message : String(error);
		}
		outcomes.push({ name: check.name, description: check.description, dimension: check.dimension, status, ...(comment ? { comment } : {}) });
	}
	writeFileSync(join(dir, 'binary-checks.json'), JSON.stringify({ source: SOURCE, outcomes }, null, 1));
	const scored = outcomes.filter((o) => o.status === 'pass' || o.status === 'fail');
	console.log(`${entry.name}: binary-checks.json written (${scored.filter((o) => o.status === 'pass').length}/${scored.length})`);
}
