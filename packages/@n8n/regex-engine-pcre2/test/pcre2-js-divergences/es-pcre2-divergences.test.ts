import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import {
	createPcre2RegexEngine,
	initPcre2Engine,
	type RegexEngine,
} from '../../src/pcre2-engine.js';

type PackedResult = null | [string, ...(string | null)[]];

interface DivergenceCase {
	category: string;
	pattern: string;
	flags: string;
	input: string;
	pcre2Result: PackedResult;
	jsResult: PackedResult;
}

type DivergenceCaseTuple = [
	DivergenceCase['category'],
	DivergenceCase['pattern'],
	DivergenceCase['flags'],
	DivergenceCase['input'],
	DivergenceCase['pcre2Result'],
	DivergenceCase['jsResult'],
];

const FIXTURE = path.join(__dirname, '../fixtures/corpus/es-pcre2-divergences.json');
const tuples: DivergenceCaseTuple[] = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
const cases: DivergenceCase[] = tuples.map(
	([category, pattern, flags, input, pcre2Result, jsResult]) => ({
		category,
		pattern,
		flags,
		input,
		pcre2Result,
		jsResult,
	}),
);

let engine: RegexEngine;

beforeAll(async () => {
	await initPcre2Engine();
	engine = createPcre2RegexEngine({
		compileOptions: ['altBsux', 'matchUnsetBackref'],
		jsFlags: ['g', 'u'],
	});
});

it("has cases (sanity check the fixture file isn't empty)", () => {
	expect(cases.length).toBeGreaterThan(0);
});

for (const [index, c] of cases.entries()) {
	describe(`${c.category}#${index}`, () => {
		it(`our engine matches real PCRE2, not native JS, for /${c.pattern}/${c.flags} on ${JSON.stringify(c.input)}`, () => {
			const native = new RegExp(c.pattern, c.flags).exec(c.input);
			if (c.jsResult === null) {
				expect(native).toBeNull();
			} else {
				expect(native?.[0]).toBe(c.jsResult[0]);
			}

			const result = engine.exec(c.pattern, c.input, c.flags);
			if (c.pcre2Result === null) {
				expect(result).toBeNull();
				return;
			}
			const [whole, ...expectedGroups] = c.pcre2Result;
			expect(result).not.toBeNull();
			expect(result?.[0]).toBe(whole);
			for (let i = 0; i < expectedGroups.length; i++) {
				const expectedGroup = expectedGroups[i];
				if (expectedGroup === null) {
					expect(result?.[i + 1]).toBeUndefined();
					continue;
				}
				expect(result?.[i + 1]).toBe(expectedGroup);
			}
		});
	});
}
