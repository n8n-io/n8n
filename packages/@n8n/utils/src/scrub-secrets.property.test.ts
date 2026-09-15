import fc from 'fast-check';

import { SECRET_KEYS, scrubSecretsInText } from './scrub-secrets';

const ALNUM = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const alnum = (minLength: number, maxLength: number) =>
	fc.stringOf(fc.constantFrom(...ALNUM), { minLength, maxLength });

// Every concrete spelling of the SECRET_KEYS vocabulary, so a word added to the
// scrubber is sampled here without a second list to maintain. An alternative
// with a construct this expander does not know stays a raw pattern string, and
// the property then fails on it instead of skipping it.
const expandAlternative = (alternative: string): string[] => {
	if (alternative.includes('[_-]?')) {
		return ['', '_', '-'].map((joiner) => alternative.replace('[_-]?', joiner));
	}
	if (alternative.endsWith('s?')) {
		return [alternative.slice(0, -2), alternative.slice(0, -1)];
	}
	return [alternative];
};
const SECRET_WORDS = SECRET_KEYS.split('|').flatMap(expandAlternative);
const keyArb = fc
	.tuple(
		fc.option(fc.tuple(alnum(1, 12), fc.constantFrom('_', '-', '.')), { nil: undefined }),
		fc.constantFrom(...SECRET_WORDS),
		fc.constantFrom('lower', 'upper', 'capital'),
	)
	.map(([prefix, word, casing]) => {
		const key = prefix ? `${prefix[0]}${prefix[1]}${word}` : word;
		if (casing === 'upper') return key.toUpperCase();
		if (casing === 'capital') return key[0].toUpperCase() + key.slice(1);
		return key;
	});
// Long enough to satisfy every value pattern's minimum (Bearer, sk-, xox…).
const valueArb = alnum(16, 40);

const shapeArb = fc.constantFrom<(key: string, value: string) => string>(
	(k, v) => `${k}=${v}`,
	(k, v) => `${k}: ${v}`,
	(k, v) => `${k} = ${v}`,
	(k, v) => `"${k}": "${v}"`,
	(k, v) => `'${k}': '${v}'`,
	(k, v) => `"${k}": '${v}'`,
	(k, v) => `{"outer": {"${k}": "${v}"}}`,
	(k, v) => `{"${k}": "${v}", "next": 1}`,
	(k, v) => `{"message": "failed: {\\"${k}\\": \\"${v}\\"}"}`,
	(_, v) => `Authorization: Bearer ${v}`,
	(_, v) => `sk-${v}`,
	(_, v) => `xoxb-${v}`,
	(_, v) => `https://user:${v}@db.example.com/app`,
);
const contextArb = fc.tuple(
	fc.constantFrom('', 'Error: request failed with ', 'see\n', '"'),
	fc.constantFrom('', ' please retry', '\n', '"'),
);
const secretTextArb = fc
	.tuple(keyArb, valueArb, shapeArb, contextArb)
	.map(([key, value, shape, [pre, post]]) => ({
		text: `${pre}${shape(key, value)}${post}`,
		value,
	}));

describe('scrubSecretsInText properties', () => {
	it('never leaves the secret value visible in a supported shape', () => {
		fc.assert(
			fc.property(secretTextArb, ({ text, value }) => !scrubSecretsInText(text).includes(value)),
		);
	});

	it('is idempotent, so chained scrubbers do not nest placeholders', () => {
		fc.assert(
			fc.property(secretTextArb, ({ text }) => {
				const once = scrubSecretsInText(text);
				return scrubSecretsInText(once) === once;
			}),
		);
	});

	it('stays fast on any long run of a regex-hostile fragment', () => {
		// Every past backtracking bug was a repeated fragment: `ab-`, `\`, `https://`.
		// From 10k repetitions the quadratic form needs 400 ms+; the linear one <15 ms.
		const fragmentArb = fc.constantFrom(
			'ab-',
			'ab.',
			'1.2.',
			'a_',
			'-',
			'_',
			'\\',
			'"',
			"'",
			'https://',
			'"password": "',
			'\\"password\\": \\"',
			'\\\\\\"',
			'token=',
			'{"a":',
			' Bearer',
			'[REDACTED:secret:1]',
			'x=y ',
			'api-key:',
		);
		fc.assert(
			fc.property(fragmentArb, fc.integer({ min: 10_000, max: 20_000 }), (fragment, count) => {
				const input = fragment.repeat(count);
				const start = performance.now();
				scrubSecretsInText(input);
				return performance.now() - start < 250;
			}),
			{ numRuns: 30 },
		);
	});
});
