import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Fixture } from '../reference/runner.ts';

export const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CORPUS = join(PACKAGE_ROOT, 'corpus');

export interface CorpusCase {
	name: string;
	source: string;
	fixture: Fixture;
	expected: unknown;
	module: Uint8Array;
}

export function corpusCases(): CorpusCase[] {
	return readdirSync(CORPUS)
		.sort()
		.filter((name) => existsSync(join(CORPUS, name, 'workflow.ts')))
		.map((name) => {
			const dir = join(CORPUS, name);
			return {
				name,
				source: readFileSync(join(dir, 'workflow.ts'), 'utf8'),
				fixture: JSON.parse(readFileSync(join(dir, 'fixture.json'), 'utf8')),
				expected: JSON.parse(readFileSync(join(dir, 'expected.json'), 'utf8')),
				module: new Uint8Array(readFileSync(join(dir, 'module.wfm'))),
			};
		});
}

export function corpusCase(name: string): CorpusCase {
	const found = corpusCases().find((c) => c.name === name);
	if (!found) throw new Error(`no corpus case ${name}`);
	return found;
}
