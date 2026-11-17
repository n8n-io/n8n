import type { IHttpRequestOptions } from 'n8n-workflow';
import { requestPath, requestUrl } from 'n8n-workflow';

import { toHttpRequestOptions, toLegacyRequestOptions } from '../request-target';

describe('toHttpRequestOptions', () => {
	it('returns plain options unchanged', () => {
		const options = { url: 'https://example.com/a', method: 'GET' as const };

		expect(toHttpRequestOptions(options)).toBe(options);
	});

	it('resolves a requestUrl', () => {
		expect(toHttpRequestOptions({ url: requestUrl`https://example.com/${'a/b'}` })).toEqual({
			url: 'https://example.com/a%2Fb',
		});
	});

	it('resolves a requestPath next to a baseURL', () => {
		expect(
			toHttpRequestOptions({ baseURL: 'https://example.com', url: requestPath`items/${'a/b'}` }),
		).toEqual({ baseURL: 'https://example.com', url: 'items/a%2Fb' });
	});
});

describe('options without a url', () => {
	it('passes them through unchanged', () => {
		const withoutUrl = { method: 'POST' as const, body: {} };
		const withUndefinedUrl = { url: undefined, method: 'GET' as const };

		expect(toLegacyRequestOptions(withoutUrl)).toBe(withoutUrl);
		expect(toLegacyRequestOptions(withUndefinedUrl)).toBe(withUndefinedUrl);
		expect(toHttpRequestOptions(withUndefinedUrl as unknown as IHttpRequestOptions)).toBe(
			withUndefinedUrl,
		);
	});
});

describe('toLegacyRequestOptions', () => {
	it('returns plain options unchanged', () => {
		const options = { uri: 'https://example.com/a' };

		expect(toLegacyRequestOptions(options)).toBe(options);
	});

	it('resolves uri and keeps the other options', () => {
		expect(
			toLegacyRequestOptions({
				uri: requestUrl`https://example.com/${'a/b'}`,
				method: 'POST',
				qs: { page: 1 },
			}),
		).toEqual({ uri: 'https://example.com/a%2Fb', method: 'POST', qs: { page: 1 } });
	});

	it('resolves url next to a baseURL without adding a uri key', () => {
		const result = toLegacyRequestOptions({
			baseURL: 'https://example.com',
			url: requestPath`items/${1}`,
		});

		expect(result).toEqual({ baseURL: 'https://example.com', url: 'items/1' });
		expect('uri' in result).toBe(false);
	});
});
