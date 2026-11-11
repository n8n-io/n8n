import type { INode, NodeEgressFilter } from 'n8n-workflow';

import { createCustomModelEndpointAuthFetch } from './auth-fetch';
import type { CustomModelEndpointFetchContext } from './auth-fetch';
import { wrapCustomModelEndpointErrorFetch } from './error-handling';
import type { EndpointCredential } from './types';

const BASE_URL = 'https://gateway.example.com/v1';
const KEY = 'sk-live-9f2a71c4ab';

const failingWith = (body: string, status = 401) =>
	(async () => new Response(body, { status, statusText: 'Unauthorized' })) as typeof fetch;

const surfaced = async (body: string) => {
	const response = await wrapCustomModelEndpointErrorFetch(failingWith(body))(BASE_URL);
	const parsed: unknown = JSON.parse(await response.text());
	return (parsed as { error?: { message?: unknown } }).error?.message;
};

const html = (inner: string) => `<html><body>${inner}</body></html>`;
const titled = (title: string) => `<html><head><title>${title}</title></head></html>`;

describe('wrapCustomModelEndpointErrorFetch', () => {
	it.each([
		[
			'a top-level message, as API management and Databricks send',
			{ statusCode: 401, message: 'Access denied due to missing subscription key.' },
			'Access denied due to missing subscription key.',
		],
		['an error that is a bare string', { error: 'quota exceeded' }, 'quota exceeded'],
		[
			'an OAuth error_description ahead of the code beside it',
			{ error: 'invalid_client', error_description: 'Bad client' },
			'Bad client',
		],
		['the detail a FastAPI gateway sends', { detail: 'Not authenticated' }, 'Not authenticated'],
		[
			'a message ahead of the detail beside it',
			{ message: 'Subscription key is invalid', detail: 'Not authenticated' },
			'Subscription key is invalid',
		],
	])('surfaces %s', async (_name, body, expected) => {
		expect(await surfaced(JSON.stringify(body))).toBe(expected);
	});

	it.each([
		['plain text', 'Unauthorized\n', 'Unauthorized'],
		['a body that never parsed as JSON', '{oops', '{oops'],
		[
			'the title of an HTML error page',
			titled('503 Service Unavailable'),
			'503 Service Unavailable',
		],
		[
			'an HTML page without a title, flattened',
			html('<h1>Gateway   Timeout</h1>'),
			'Gateway Timeout',
		],
	])('surfaces %s', async (_name, body, expected) => {
		expect(await surfaced(body)).toBe(expected);
	});

	it.each([
		['&amp;', 'Denied & here'],
		['&lt;', 'Denied < here'],
		['&gt;', 'Denied > here'],
		['&quot;', 'Denied " here'],
		['&apos;', "Denied ' here"],
		['&#8212;', 'Denied \u2014 here'],
		['&#x2014;', 'Denied \u2014 here'],
		['&nbsp;', 'Denied here'],
	])('decodes %s out of an HTML error page', async (entity, expected) => {
		expect(await surfaced(titled(`Denied ${entity} here`))).toBe(expected);
	});

	it.each([
		[
			'one already shaped for the client',
			JSON.stringify({ error: { message: 'Model not found', type: 'invalid_request' } }),
		],
		['an empty one', ''],
		['JSON that is not an object', '[1,2,3]'],
	])('passes through %s unchanged', async (_name, body) => {
		const response = await wrapCustomModelEndpointErrorFetch(failingWith(body))(BASE_URL);

		expect(await response.text()).toBe(body);
	});

	it('hands back the very same 200, so a stream is never buffered', async () => {
		const ok = new Response('{"choices":[{"text":"hello"}]}', { status: 200 });
		const wrapped = wrapCustomModelEndpointErrorFetch((async () => ok) as typeof fetch);

		expect(await wrapped(BASE_URL)).toBe(ok);
	});

	it('keeps the status the gateway sent', async () => {
		const wrapped = wrapCustomModelEndpointErrorFetch(failingWith('Too many requests', 429));

		expect((await wrapped(BASE_URL)).status).toBe(429);
	});

	it('truncates a body long enough to be a page rather than a sentence', async () => {
		const message = String(await surfaced('x'.repeat(900)));

		expect(message.length).toBeLessThan(900);
		expect(message.endsWith('…')).toBe(true);
	});
});

describe('a rejected login', () => {
	const node = {
		id: '1',
		name: 'Custom Model Endpoint',
		type: 'test',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	} as INode;
	const ctx = { getNode: () => node } as unknown as CustomModelEndpointFetchContext;
	const allowAll = { validateUrl: async () => ({ ok: true }) } as unknown as NodeEgressFilter;

	it('sends one request, because these login methods have nothing to refresh', async () => {
		let calls = 0;
		const baseFetch = (async () => {
			calls += 1;
			return new Response(JSON.stringify({ message: 'Subscription key is invalid' }), {
				status: 401,
			});
		}) as typeof fetch;
		const endpoint: EndpointCredential = {
			baseUrl: BASE_URL,
			login: { type: 'header', name: 'X-Api-Key', prefix: '', key: KEY },
			gatewayHeaders: {},
		};

		const { fetch: authFetch } = createCustomModelEndpointAuthFetch(
			ctx,
			{},
			{
				endpoint,
				egressFilter: allowAll,
				baseFetch,
			},
		);
		const response = await authFetch(BASE_URL);

		expect(calls).toBe(1);
		expect(response.status).toBe(401);
	});
});
