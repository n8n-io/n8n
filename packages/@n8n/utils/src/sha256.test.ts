import { createHash, webcrypto } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { sha256 } from './sha256';

afterEach(() => vi.unstubAllGlobals());

describe.each([
	['Web Crypto', webcrypto],
	['no subtle API', {}],
	['no crypto API', undefined],
] as const)('sha256 with %s', (_name, cryptoApi) => {
	it.each(['', 'abc', 'Help with café notes 📝', '\ud800', 'a'.repeat(1000)])(
		'hashes UTF-8 input %j',
		async (input) => {
			vi.stubGlobal('crypto', cryptoApi);
			const expected = createHash('sha256').update(input, 'utf8').digest('hex');
			expect(await sha256(input)).toBe(expected);
		},
	);
});
