import { ensureUrlPathSuffix } from '../request';

describe('ensureUrlPathSuffix', () => {
	it('appends the suffix when the path is missing it', () => {
		expect(ensureUrlPathSuffix('https://dashscope-intl.aliyuncs.com', '/compatible-mode/v1')).toBe(
			'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
		);
	});

	it('returns the base URL unchanged, not a re-serialized equivalent, when the suffix is already present', () => {
		// The default HTTPS port is dropped when a URL is re-serialized via `new URL(...).toString()`,
		// so this distinguishes an early return of `baseURL` from returning `url.toString()`.
		const baseURL = 'https://example.com:443/compatible-mode/v1';

		expect(ensureUrlPathSuffix(baseURL, '/compatible-mode/v1')).toBe(baseURL);
	});

	it('strips a trailing stripSuffix before appending the suffix', () => {
		expect(
			ensureUrlPathSuffix('https://api.minimax.io/v1', '/anthropic/v1', { stripSuffix: '/v1' }),
		).toBe('https://api.minimax.io/anthropic/v1');
	});

	it('appends the suffix without stripping when stripSuffix does not match the path end', () => {
		expect(ensureUrlPathSuffix('https://x.com/foo', '/anthropic/v1', { stripSuffix: '/v1' })).toBe(
			'https://x.com/foo/anthropic/v1',
		);
	});

	it('throws on an invalid URL, matching the underlying URL constructor', () => {
		expect(() => ensureUrlPathSuffix('not-a-url', '/v1')).toThrow();
	});
});
