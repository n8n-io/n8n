/**
 * The converter compiles `localeCompare` with a locale of `ROOT_COLLATION_LOCALES`
 * to the runtime's CLDR root collation. This test checks, for each of these
 * locales, that Node.js orders the collation test corpus of the runtime
 * (`collate_cases.txt`) and some letters that other locales tailor as the
 * root collation does. A locale that differs must leave the list.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { ROOT_COLLATION_LOCALES } from '../translate.ts';

const here = dirname(fileURLToPath(import.meta.url));
const casesFile = join(
	here,
	'../../../../../../../workflow-runtime/src/core/testdata/collate_cases.txt',
);

function decode(hex: string): string {
	const points = hex
		.split(' ')
		.filter((h) => h !== '')
		.map((h) => parseInt(h, 16));
	return String.fromCodePoint(...points);
}

function corpusPairs(): Array<[string, string]> {
	const pairs: Array<[string, string]> = [];
	for (const line of readFileSync(casesFile, 'utf8').split('\n')) {
		if (line === '') continue;
		const [a = '', b = ''] = line.split('\t');
		pairs.push([decode(a), decode(b)]);
	}
	return pairs;
}

/** Letters and digraphs that some CLDR locales sort apart from the root order. */
const TAILORED = [
	'a',
	'ä',
	'å',
	'æ',
	'b',
	'c',
	'ch',
	'cz',
	'd',
	'h',
	'l',
	'll',
	'lz',
	'n',
	'ñ',
	'o',
	'ö',
	'ø',
	'œ',
	'ss',
	'ß',
	'u',
	'ü',
	'y',
	'z',
	'þ',
	'ı',
	'i',
	'İ',
];

describe('locales that compile to the root collation', () => {
	const pairs = corpusPairs();
	for (const a of TAILORED) for (const b of TAILORED) pairs.push([a, b]);

	it('has the runtime collation test corpus', () => {
		expect(pairs.length).toBeGreaterThan(10_000);
	});

	for (const locale of ROOT_COLLATION_LOCALES) {
		it(`${locale} orders as the root collation`, () => {
			const differs = pairs.filter(
				([a, b]) => Math.sign(a.localeCompare(b, locale)) !== Math.sign(a.localeCompare(b, 'und')),
			);
			expect(differs.slice(0, 5)).toEqual([]);
		});
	}
});
