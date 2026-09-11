import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import {
	createPcre2RegexEngine,
	initPcre2Engine,
	type RegexEngine,
} from '../../src/pcre2-engine.js';

type PackedResult = null | [string, ...(string | null)[]];

interface CorpusCase {
	pattern: string;
	flags: string;
	input: string;
	esAgree: 0 | 1;
	expected: PackedResult;
}

type CorpusCaseTuple = [
	CorpusCase['pattern'],
	CorpusCase['flags'],
	string | number,
	CorpusCase['esAgree'],
	CorpusCase['expected'],
];
type CorpusFile = CorpusCaseTuple[] | { subjects: string[]; cases: CorpusCaseTuple[] };

const FIXTURES_DIR = path.join(__dirname, '../fixtures/corpus');
const RUST_REGEX_DIR = path.join(FIXTURES_DIR, 'rust-regex');

function loadCategory(file: string): CorpusCase[] {
	const parsed: CorpusFile = JSON.parse(fs.readFileSync(file, 'utf8'));
	const tuples = Array.isArray(parsed) ? parsed : parsed.cases;
	const subjects = Array.isArray(parsed) ? [] : parsed.subjects;
	return tuples.map(([pattern, flags, input, esAgree, expected]) => ({
		pattern,
		flags,
		input: typeof input === 'number' ? (subjects[input] as string) : input,
		esAgree,
		expected,
	}));
}

const categoryFiles = [
	...fs
		.readdirSync(FIXTURES_DIR)
		.filter((f) => f.endsWith('.json'))
		.map((f) => ({ category: f.replace(/\.json$/, ''), file: path.join(FIXTURES_DIR, f) })),
	...fs
		.readdirSync(RUST_REGEX_DIR)
		.filter((f) => f.endsWith('.json'))
		.map((f) => ({ category: f.replace(/\.json$/, ''), file: path.join(RUST_REGEX_DIR, f) })),
];

let engine: RegexEngine;

beforeAll(async () => {
	await initPcre2Engine();
	engine = createPcre2RegexEngine({
		compileOptions: ['altBsux', 'matchUnsetBackref'],
		jsFlags: ['g', 'u'],
	});
});

for (const { category, file } of categoryFiles) {
	describe(`corpus: ${category}`, () => {
		const cases = loadCategory(file);

		it(`has cases (sanity check the fixture file isn't empty)`, () => {
			expect(cases.length).toBeGreaterThan(0);
		});

		for (const [index, c] of cases.entries()) {
			const validity = c.esAgree ? 'es-pcre2-agree' : 'pcre2-only';
			it(`[${validity}] ${category}#${index}: /${c.pattern}/${c.flags} on ${JSON.stringify(c.input)}`, () => {
				const result = engine.exec(c.pattern, c.input, c.flags);
				if (c.expected === null) {
					expect(result).toBeNull();
					return;
				}
				const [whole, ...expectedGroups] = c.expected;
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
		}
	});
}
