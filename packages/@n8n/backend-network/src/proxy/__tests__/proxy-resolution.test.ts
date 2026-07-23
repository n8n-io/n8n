import { resolveProxyUrl } from '../proxy-resolution';

const PROXY_URL = 'http://127.0.0.1:8888';

describe('resolveProxyUrl', () => {
	beforeEach(() => {
		delete process.env.HTTP_PROXY;
		delete process.env.HTTPS_PROXY;
		delete process.env.NO_PROXY;
		delete process.env.ALL_PROXY;
	});

	test('returns the configured proxy for a matching target', () => {
		process.env.HTTP_PROXY = PROXY_URL;

		expect(resolveProxyUrl('http://api.example.com:8080/test')).toBe(PROXY_URL);
	});

	test('returns undefined when no proxy is configured', () => {
		expect(resolveProxyUrl('http://api.example.com:8080/test')).toBeUndefined();
	});

	test('returns undefined when the target is excluded by NO_PROXY', () => {
		process.env.HTTP_PROXY = PROXY_URL;
		process.env.NO_PROXY = 'api.example.com';

		expect(resolveProxyUrl('http://api.example.com:8080/test')).toBeUndefined();
	});

	test('resolves ALL_PROXY when no scheme-specific proxy is set', () => {
		process.env.ALL_PROXY = PROXY_URL;

		expect(resolveProxyUrl('http://api.example.com:8080/test')).toBe(PROXY_URL);
	});

	test('resolves against the fallback URL when no target is provided', () => {
		process.env.HTTPS_PROXY = PROXY_URL;

		expect(resolveProxyUrl(undefined, 'https://example.nonexistent/')).toBe(PROXY_URL);
	});

	test('prefers the target URL over the fallback when both are given', () => {
		process.env.HTTP_PROXY = PROXY_URL;
		process.env.NO_PROXY = 'api.example.com';

		// Target is excluded by NO_PROXY, so resolution returns undefined even
		// though the fallback would have matched.
		expect(
			resolveProxyUrl('http://api.example.com:8080/test', 'http://other.example.com'),
		).toBeUndefined();
	});
});
