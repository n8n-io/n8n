import {
	methodQueryString,
	parseMethodParam,
	resourceUrlToWebhookPath,
	trimSlashes,
	trimTrailingSlash,
	webhookResourcePath,
} from '../utils';

describe('webhookResourcePath', () => {
	test('should return the path itself for a static webhook', () => {
		expect(webhookResourcePath('user/defined/path')).toBe('user/defined/path');
	});

	test('should prefix the webhookId for a dynamic webhook', () => {
		expect(webhookResourcePath('user/:id/posts', 'wh-1')).toBe('wh-1/user/:id/posts');
	});

	test('should not prefix a static path that merely contains a colon', () => {
		// a row only carries a webhookId when a segment *starts* with `:`
		expect(webhookResourcePath('orders:2024')).toBe('orders:2024');
		expect(webhookResourcePath('at/time:12')).toBe('at/time:12');
	});
});

describe('resourceUrlToWebhookPath', () => {
	test('should return the path for a URL under a root-mounted base URL', () => {
		expect(resourceUrlToWebhookPath('https://host.example/mcp/abc', 'https://host.example/')).toBe(
			'/mcp/abc',
		);
		// base URL without a trailing slash resolves the same way
		expect(resourceUrlToWebhookPath('https://host.example/mcp/abc', 'https://host.example')).toBe(
			'/mcp/abc',
		);
	});

	test('should strip the base URL path prefix for a sub-path deployment', () => {
		expect(
			resourceUrlToWebhookPath('https://host.example/n8n/mcp/abc', 'https://host.example/n8n/'),
		).toBe('/mcp/abc');
	});

	test('should reject a URL that omits the base URL path prefix', () => {
		// without the `/n8n` prefix the URL is not actually served by this instance,
		// so it must not resolve to the prefixed resource
		expect(
			resourceUrlToWebhookPath('https://host.example/mcp/abc', 'https://host.example/n8n/'),
		).toBeUndefined();
	});

	test('should reject a foreign origin', () => {
		expect(
			resourceUrlToWebhookPath('https://evil.example/mcp/abc', 'https://host.example/'),
		).toBeUndefined();
		// origin includes the port
		expect(
			resourceUrlToWebhookPath('https://host.example:9000/mcp/abc', 'https://host.example/'),
		).toBeUndefined();
	});

	test('should return undefined for a malformed resource URL', () => {
		expect(resourceUrlToWebhookPath('not-a-url', 'https://host.example/')).toBeUndefined();
	});

	test('should drop the query string', () => {
		// the query reaches resolvers separately, so it must never end up in the path
		expect(
			resourceUrlToWebhookPath('https://host.example/mcp/abc?foo=bar', 'https://host.example/'),
		).toBe('/mcp/abc');
		expect(
			resourceUrlToWebhookPath(
				'https://host.example/webhook/abc?method=GET',
				'https://host.example/',
			),
		).toBe('/webhook/abc');
	});
});

describe('method selector helpers', () => {
	test('methodQueryString upper-cases the method', () => {
		expect(methodQueryString('GET')).toBe('?method=GET');
		expect(methodQueryString('post')).toBe('?method=POST');
	});

	test('parseMethodParam canonicalises and returns undefined when absent', () => {
		expect(parseMethodParam('post')).toBe('POST');
		expect(parseMethodParam(' get ')).toBe('GET');
		expect(parseMethodParam(null)).toBeUndefined();
		expect(parseMethodParam(undefined)).toBeUndefined();
		expect(parseMethodParam('')).toBeUndefined();
		expect(parseMethodParam('  ')).toBeUndefined();
	});

	test('methodQueryString and parseMethodParam round-trip', () => {
		expect(parseMethodParam(methodQueryString('post').replace('?method=', ''))).toBe('POST');
	});
});

describe('trimSlashes / trimTrailingSlash', () => {
	test('trimTrailingSlash removes a single trailing slash', () => {
		expect(trimTrailingSlash('https://host.example/')).toBe('https://host.example');
		expect(trimTrailingSlash('https://host.example')).toBe('https://host.example');
	});

	test('trimSlashes removes a leading and a trailing slash', () => {
		expect(trimSlashes('/abc/')).toBe('abc');
		expect(trimSlashes('abc')).toBe('abc');
	});
});
