/**
 * Minimal reproduction of a compiler bug (`src/compiler`): a function
 * declaration inside `run` that captures a variable of `run` is created at the
 * start of `run` (hoisting), before the cell of the variable exists. The
 * closure then holds the register value, and `wfrt` fails with
 * `TypeError: value is not a cell` (disassembly: `CLOSURE` at pc 1, `NEWCELL`
 * at pc 4). The reference runner gives 5. An arrow function works.
 *
 *   node scripts/gym/repro/hoisted-closure.ts
 *
 * It exits with 1 while `wfrt run` and the reference runner disagree.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { compile } from '../../../src/compiler/index.ts';
import { runReference } from '../../../src/reference/runner.ts';
import { repoRoot } from '../sample.ts';

const source = readFileSync(join(import.meta.dirname, 'hoisted-closure.wf.ts'), 'utf8');
const fixture = { trigger: { body: {} }, now: 1_700_000_000_000, seed: 1, effects: {} };
const reference = await runReference(source, fixture);
const compiled = compile(source, { fileName: '/workflow.ts' });
if (!compiled.ok || !compiled.module) throw new Error('compile failed');
const dir = mkdtempSync(join(tmpdir(), 'wfrt-repro-'));
writeFileSync(join(dir, 'm.wfm'), compiled.module);
writeFileSync(join(dir, 'f.json'), JSON.stringify(fixture));
const runtime: unknown = JSON.parse(
	execFileSync(
		join(repoRoot, 'workflow-runtime', 'zig-out', 'bin', 'wfrt'),
		['run', join(dir, 'm.wfm'), join(dir, 'f.json')],
		{
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		},
	),
);
process.stdout.write(
	`reference: ${JSON.stringify(reference)}\nwfrt:      ${JSON.stringify(runtime)}\n`,
);
const same = JSON.stringify(reference) === JSON.stringify(runtime);
process.stdout.write(same ? 'ok: the results are the same\n' : 'BUG: the results differ\n');
process.exitCode = same ? 0 : 1;
