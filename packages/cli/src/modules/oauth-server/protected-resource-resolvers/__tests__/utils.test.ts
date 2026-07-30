import {
	canonicalMethodSet,
	methodsQueryString,
	parseMethodsParam,
	resourceUrlToWebhookPath,
	trimSlashes,
	trimTrailingSlash,
} from '../utils';

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

	test('should preserve the query string (carries the methods disambiguator)', () => {
		expect(
			resourceUrlToWebhookPath(
				'https://host.example/webhook/abc?methods=GET,POST',
				'https://host.example/',
			),
		).toBe('/webhook/abc?methods=GET,POST');
	});
});

describe('method-set helpers', () => {
	test('canonicalMethodSet upper-cases, de-duplicates and sorts', () => {
		expect(canonicalMethodSet(['post', 'GET', 'Get'])).toEqual(['GET', 'POST']);
		expect(canonicalMethodSet(new Set(['DELETE', 'get']))).toEqual(['DELETE', 'GET']);
	});

	test('methodsQueryString serialises a set, empty set -> no query', () => {
		expect(methodsQueryString(['GET', 'POST'])).toBe('?methods=GET,POST');
		expect(methodsQueryString([])).toBe('');
	});

	test('parseMethodsParam canonicalises and returns undefined when absent', () => {
		expect(parseMethodsParam('post,GET')).toEqual(['GET', 'POST']);
		expect(parseMethodsParam('GET, ,')).toEqual(['GET']);
		expect(parseMethodsParam(null)).toBeUndefined();
		expect(parseMethodsParam(undefined)).toBeUndefined();
		expect(parseMethodsParam('')).toBeUndefined();
	});

	test('methodsQueryString and parseMethodsParam round-trip', () => {
		const methods = canonicalMethodSet(['POST', 'get']);
		const query = methodsQueryString(methods).replace('?methods=', '');
		expect(parseMethodsParam(query)).toEqual(methods);
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
