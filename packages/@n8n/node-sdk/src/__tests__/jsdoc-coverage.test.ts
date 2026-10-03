import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { jsdocCoverage, packageEntries, type EntryCoverage } from '../../scripts/jsdoc-coverage';

const undocumented = (coverage: readonly EntryCoverage[]) => [
	...new Set(
		coverage
			.flatMap(({ exports, fields }) => [...exports, ...fields])
			.filter((part) => !part.documented && !part.external)
			.map((part) => part.name),
	),
];

const FIXTURE = `
/** Docs of str. */
const str = () => 'a';
const num = () => 1;
/** The builders. */
export const t = { str, num };

/** Options. */
export interface Options {
	/** Documented. */
	readonly a: string;
	readonly b: number;
	readonly c?: never;
	readonly nested: { readonly inner: string };
	readonly hidden: Hidden;
}

interface Hidden {
	readonly deep: string;
}

/** First overload. */
export function f(options: { readonly x: string }): string;
export function f(options: { readonly y: number }): number;
export function f(options: { readonly x?: string; readonly y?: number; readonly impl?: true }): unknown {
	return options;
}

export type Pick1<T> = T extends { readonly pattern: string } ? T : never;
`;

describe('jsdocCoverage', () => {
	it('lists each export and field without a JSDoc summary, as a hover shows it', () => {
		const dir = mkdtempSync(path.join(tmpdir(), 'jsdoc-coverage-'));
		try {
			mkdirSync(path.join(dir, 'src'));
			writeFileSync(
				path.join(dir, 'package.json'),
				JSON.stringify({ name: 'fixture', exports: { '.': { types: './dist/index.d.ts' } } }),
			);
			writeFileSync(
				path.join(dir, 'tsconfig.json'),
				JSON.stringify({ compilerOptions: { strict: true } }),
			);
			writeFileSync(path.join(dir, 'src', 'index.ts'), FIXTURE);
			const coverage = jsdocCoverage([packageEntries(dir, 'src')]);
			expect(coverage.map(({ entry }) => entry)).toEqual(['fixture']);
			expect(undocumented(coverage).sort()).toEqual(
				[
					'Hidden.deep',
					'Options.b',
					'Options.hidden',
					'Options.inner',
					'Options.nested',
					'Pick1',
					'f.x',
					'f.y',
					't.num',
				].sort(),
			);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it('finds a JSDoc summary on every export and field of node-sdk and workflow-sdk/next', () => {
		expect(undocumented(jsdocCoverage())).toEqual([]);
	}, 60_000);
});
