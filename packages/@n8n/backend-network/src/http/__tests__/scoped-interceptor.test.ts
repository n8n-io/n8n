import { describe, expect, it, vi } from 'vitest';

import {
	getScopedHttpInterceptor,
	runWithScopedHttpInterceptor,
	type ScopedFetchInterceptor,
} from '../scoped-interceptor';
import { dispatchedFetch } from '../undici/transport';
import { httpRequest } from '../axios/request';

describe('scoped HTTP interceptor', () => {
	it('routes matching dispatchedFetch calls to the active interceptor without hitting network', async () => {
		const fetchSpy = vi.fn(async () => {
			return new Response(JSON.stringify({ ok: true, from: 'gym' }), {
				status: 200,
				headers: { 'content-type': 'application/json' },
			});
		});
		const interceptor: ScopedFetchInterceptor = {
			matches: (url) => url.host === 'slack.com',
			fetch: fetchSpy,
		};

		const result = await runWithScopedHttpInterceptor(interceptor, async () => {
			expect(getScopedHttpInterceptor()).toBe(interceptor);
			const res = await dispatchedFetch(undefined, 'https://slack.com/api/chat.postMessage', {
				method: 'POST',
				body: JSON.stringify({ channel: 'C123', text: 'hello' }),
			});
			return await res.json();
		});

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(result).toEqual({ ok: true, from: 'gym' });
		expect(getScopedHttpInterceptor()).toBeUndefined();
	});

	it('routes matching axios httpRequest calls to the active interceptor and decodes JSON', async () => {
		const fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const target =
				typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
			expect(target).toBe('https://slack.com/api/chat.postMessage?pretty=1');
			expect(init?.method).toBe('POST');
			return new Response(JSON.stringify({ ok: true, ts: '1700000000.000100' }), {
				status: 200,
				headers: { 'content-type': 'application/json' },
			});
		});
		const interceptor: ScopedFetchInterceptor = {
			matches: (url) => url.host === 'slack.com',
			fetch: fetchSpy,
		};

		const response = await runWithScopedHttpInterceptor(interceptor, async () => {
			return await httpRequest({
				method: 'POST',
				url: 'https://slack.com/api/chat.postMessage',
				qs: { pretty: '1' },
				body: { channel: 'C123', text: 'hi' },
				json: true,
			});
		});

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(response).toEqual({ ok: true, ts: '1700000000.000100' });
	});
});
