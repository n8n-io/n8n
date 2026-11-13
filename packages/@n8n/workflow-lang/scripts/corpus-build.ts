/**
 * Regenerates `expected.json` (reference output) and `module.wfm` (compiled
 * module) for each corpus workflow.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from '../src/compiler/index.ts';
import type { Fixture } from '../src/reference/runner.ts';
import { runReference } from '../src/reference/runner.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'corpus');
const hasher = (bytes: Uint8Array) => new Uint8Array(createHash('sha256').update(bytes).digest());

let failed = false;
for (const name of readdirSync(root).sort()) {
	const dir = join(root, name);
	let source: string;
	try {
		source = readFileSync(join(dir, 'workflow.ts'), 'utf8');
	} catch {
		continue;
	}
	const fixture: Fixture = JSON.parse(readFileSync(join(dir, 'fixture.json'), 'utf8'));
	const result = compile(source, { fileName: 'workflow.ts', hasher });
	if (!result.ok || !result.module) {
		failed = true;
		console.error(`${name}: compile failed`);
		for (const d of result.diagnostics)
			console.error(`  ${d.line}:${d.column} ${d.code} ${d.message}`);
		continue;
	}
	writeFileSync(join(dir, 'module.wfm'), result.module);
	const expected = await runReference(source, fixture);
	writeFileSync(join(dir, 'expected.json'), `${JSON.stringify(expected, null, 2)}\n`);
	console.log(
		`${name}: ${expected.status}, ${expected.effects.length} effects, ${result.module.length} bytes`,
	);
}
process.exit(failed ? 1 : 0);
