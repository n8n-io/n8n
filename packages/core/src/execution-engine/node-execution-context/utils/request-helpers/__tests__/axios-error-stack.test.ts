import type { AxiosStatic } from 'axios';
import axios from 'axios';
import { createRequire } from 'node:module';

// The `import` above loads axios's lib/ build; production code `require`s
// dist/node/axios.cjs instead. Both are patched, so test both.
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- require() is untyped
const axiosCjs: AxiosStatic = createRequire(__filename)('axios');

/**
 * Guards `patches/axios.patch`. Without it, axios crashes on a non-string
 * `error.stack` (caused by an overridden `Error.prepareStackTrace`) and replaces
 * the real request error with its own TypeError.
 */
describe('axios error handling with overridden Error.prepareStackTrace', () => {
	// eslint-disable-next-line @typescript-eslint/unbound-method -- saved only to restore, never invoked
	const original = Error.prepareStackTrace;

	beforeEach(() => {
		Error.prepareStackTrace = () => ({});
	});

	afterEach(() => {
		Error.prepareStackTrace = original;
	});

	it.each([
		['import (lib build)', axios],
		['require (dist/node build)', axiosCjs],
	])('should surface the original request error via %s', async (_name, axiosInstance) => {
		const failure = Object.assign(new Error('boom'), { code: 'ETEST' });
		await expect(
			axiosInstance.get('http://unit.test', { adapter: async () => await Promise.reject(failure) }),
		).rejects.toBe(failure);
	});
});
