import fc from 'fast-check';

import { scrubSecretsInText } from './scrub-secrets';

const ALNUM = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const alnum = (minLength: number, maxLength: number) =>
	fc.stringOf(fc.constantFrom(...ALNUM), { minLength, maxLength });

// The documented vocabulary, optionally as a snake/kebab compound in any case.
const SECRET_WORDS = [
	'password',
	'passwd',
	'secret',
	'credentials',
	'credential',
	'api_key',
	'api-key',
	'apikey',
	'authorization',
	'access_token',
	'refresh_token',
	'id_token',
	'session_token',
	'auth_token',
	'client_secret',
	'private_key',
	'session_cookie',
	'token',
];
const keyArb = fc
	.tuple(
		fc.option(fc.tuple(alnum(1, 12), fc.constantFrom('_', '-')), { nil: undefined }),
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
			'a_',
			'-',
			'_',
			'\\',
			'"',
			"'",
			'https://',
			'"password": "',
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
