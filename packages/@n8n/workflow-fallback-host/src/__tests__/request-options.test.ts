import type { IRequestOptionsSimplified } from 'n8n-workflow';

import { toHttpRequestOptions } from '../node-step';

/** Legacy request options as nodes pass them to `requestWithAuthentication`. */
const legacy = (o: Record<string, unknown>) => o as unknown as IRequestOptionsSimplified;

describe('toHttpRequestOptions', () => {
	it('keeps the URL of legacy request options in `url`', () => {
		const options = toHttpRequestOptions(
			legacy({ uri: 'https://slack.com/api/chat.postMessage', method: 'POST' }),
		);
		expect(options.url).toBe('https://slack.com/api/chat.postMessage');
		expect(Reflect.get(options, 'uri')).toBe('https://slack.com/api/chat.postMessage');
	});

	it('keeps the same object, so signing changes the request that n8n-core sends', () => {
		const input = legacy({ uri: 'https://example.test/x', headers: {} });
		expect(toHttpRequestOptions(input)).toBe(input);
	});

	it('gives HTTP request options back as they are', () => {
		const input = { url: 'https://example.test/y' };
		expect(toHttpRequestOptions(input)).toBe(input);
	});
});
