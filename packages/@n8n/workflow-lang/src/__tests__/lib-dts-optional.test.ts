/**
 * Each method of the subset library (`LIB_DTS`) that has optional or rest
 * parameters must have a call that uses them in corpus case
 * `36-optional-params`. The corpus test runs that case on the reference
 * runner (V8) and the TS VM, and `wfrt corpus` (ci.sh) runs it on the
 * runtime, so a parameter that a native method ignores fails there.
 *
 * Methods that other corpus cases cover are listed with the case.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { LIB_DTS } from '../compiler/lib-dts.ts';

const corpus = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'corpus');

/** Methods with optional parameters that other corpus cases test against V8. */
const COVERED_ELSEWHERE: Record<string, string> = {
	normalize: '35-text-errors',
	toLocaleString: '21-dates',
	toLocaleDateString: '21-dates',
	toLocaleTimeString: '21-dates',
	setSeconds: '21-dates',
	setMinutes: '21-dates',
	setHours: '21-dates',
	setMonth: '21-dates',
	setFullYear: '21-dates',
};

/** Declared only to type `await`: the validator rejects calls (WL020). */
const NOT_CALLABLE = new Set(['then']);

/** The names of declared methods and functions with an optional (`?:`) or rest (`...`) parameter. */
function optionalMethods(): string[] {
	const names = new Set<string>();
	for (const line of LIB_DTS.split('\n')) {
		const method = /^\s+(?:new\s*)?([A-Za-z]+)?(?:<[^>]*>)?\((.*)\)\s*:/.exec(line);
		if (method && /\?:|\.\.\./.test(method[2])) names.add(method[1] ?? 'Date');
		const fn = /^declare function (\w+)\(([^)]*)\)/.exec(line);
		if (fn && /\?:|\.\.\./.test(fn[2])) names.add(fn[1]);
	}
	return [...names].sort();
}

describe('optional parameters of the library', () => {
	const source = readFileSync(join(corpus, '36-optional-params', 'workflow.ts'), 'utf8');
	const names = optionalMethods();

	it('finds the methods', () => {
		expect(names).toContain('startsWith');
		expect(names).toContain('stringify');
	});

	for (const name of names) {
		it(`${name} has a corpus case`, () => {
			if (NOT_CALLABLE.has(name)) return;
			const elsewhere = Object.hasOwn(COVERED_ELSEWHERE, name)
				? COVERED_ELSEWHERE[name]
				: undefined;
			if (elsewhere !== undefined) {
				const other = readFileSync(join(corpus, elsewhere, 'workflow.ts'), 'utf8');
				expect(other).toMatch(new RegExp(`\\b${name}\\(`));
				return;
			}
			expect(source).toMatch(new RegExp(`\\b${name}\\(`));
		});
	}
});
