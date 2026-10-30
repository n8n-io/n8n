import type { INode, NodeEgressFilter } from 'n8n-workflow';

import { createCustomModelEndpointAuthFetch } from './auth-fetch';
import type { CustomModelEndpointFetchContext } from './auth-fetch';
import { endpointSecrets, wrapCustomModelEndpointErrorFetch } from './error-handling';
import type { EndpointCredential, LoginMethod } from './types';

const BASE_URL = 'https://gateway.example.com/v1';
const KEY = 'sk-live-9f2a71c4ab';

const endpointWith = (
	login: LoginMethod,
	gatewayHeaders: Record<string, string> = {},
): EndpointCredential => ({ baseUrl: BASE_URL, login, gatewayHeaders });

const failingWith = (body: string, status = 401) =>
	(async () => new Response(body, { status, statusText: 'Unauthorized' })) as typeof fetch;

const surfaced = async (body: string, secrets: string[] = []) => {
	const response = await wrapCustomModelEndpointErrorFetch(failingWith(body), { secrets })(
		BASE_URL,
	);
	const parsed: unknown = JSON.parse(await response.text());
	return (parsed as { error?: { message?: unknown } }).error?.message;
};

const html = (inner: string) => `<html><body>${inner}</body></html>`;

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
	])('surfaces %s', async (_name, body, expected) => {
		expect(await surfaced(JSON.stringify(body))).toBe(expected);
	});

	it.each([
		['plain text', 'Unauthorized\n', 'Unauthorized'],
		['a body that never parsed as JSON', '{oops', '{oops'],
		[
			'the title of an HTML error page',
			'<html><head><title>503 Service Unavailable</title></head></html>',
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
		[
			'one already shaped for the client',
			JSON.stringify({ error: { message: 'Model not found', type: 'invalid_request' } }),
		],
		['an empty one', ''],
		['JSON that is not an object', '[1,2,3]'],
	])('passes through %s unchanged', async (_name, body) => {
		const response = await wrapCustomModelEndpointErrorFetch(failingWith(body), { secrets: [] })(
			BASE_URL,
		);

		expect(await response.text()).toBe(body);
	});

	it('leaves a successful response untouched', async () => {
		const ok = new Response('{"choices":[]}', { status: 200 });
		const wrapped = wrapCustomModelEndpointErrorFetch((async () => ok) as typeof fetch, {
			secrets: [],
		});

		expect(await wrapped(BASE_URL)).toBe(ok);
	});

	it('keeps the status the gateway sent', async () => {
		const wrapped = wrapCustomModelEndpointErrorFetch(failingWith('Too many requests', 429), {
			secrets: [],
		});

		expect((await wrapped(BASE_URL)).status).toBe(429);
	});

	it('truncates a body long enough to be a page rather than a sentence', async () => {
		const message = String(await surfaced('x'.repeat(900)));

		expect(message.length).toBeLessThan(900);
		expect(message.endsWith('…')).toBe(true);
	});

	it.each([
		['one it reshapes', JSON.stringify({ message: `Rejected ${KEY}` })],
		[
			'one already shaped for the client',
			JSON.stringify({ error: { message: `Rejected ${KEY}` } }),
		],
	])('redacts a secret the gateway echoed into %s', async (_name, body) => {
		const response = await wrapCustomModelEndpointErrorFetch(failingWith(body), {
			secrets: [KEY],
		})(BASE_URL);

		expect(await response.text()).not.toContain(KEY);
	});

	it('keeps the fields beside the message when it redacts in place', async () => {
		const body = JSON.stringify({ error: { message: `Rejected ${KEY}`, type: 'auth_error' } });
		const response = await wrapCustomModelEndpointErrorFetch(failingWith(body), {
			secrets: [KEY],
		})(BASE_URL);

		expect(JSON.parse(await response.text())).toEqual({
			error: { message: 'Rejected [redacted]', type: 'auth_error' },
		});
	});
});

describe('endpointSecrets', () => {
	const encoded = Buffer.from('user:pass-9f2a71c4').toString('base64');

	it.each<[string, LoginMethod, Record<string, string>, string[]]>([
		['the bearer token', { type: 'bearer', token: 'tok-9f2a71c4' }, {}, ['tok-9f2a71c4']],
		[
			'the key, never the header name',
			{ type: 'header', name: 'X-Api-Key', prefix: 'Token', key: 'key-9f2a71c4' },
			{},
			['key-9f2a71c4'],
		],
		[
			'the basic password and the pair that travels on the wire',
			{ type: 'basic', username: 'user', password: 'pass-9f2a71c4' },
			{},
			['pass-9f2a71c4', encoded],
		],
		['gateway header values', { type: 'none' }, { 'X-Team': 'team-9f2a71c4' }, ['team-9f2a71c4']],
		['nothing when there is no login and no header', { type: 'none' }, {}, []],
		[
			'nothing short enough to censor ordinary words',
			{ type: 'bearer', token: 'key' },
			{ 'X-Env': 'prod' },
			[],
		],
	])('collects %s', (_name, login, gatewayHeaders, expected) => {
		expect(endpointSecrets(endpointWith(login, gatewayHeaders))).toEqual(expected);
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
		const endpoint = endpointWith({ type: 'header', name: 'X-Api-Key', prefix: '', key: KEY });

		const authFetch = createCustomModelEndpointAuthFetch(
			ctx,
			{},
			{
				endpoint,
				egressFilter: allowAll,
				baseFetch: wrapCustomModelEndpointErrorFetch(baseFetch, {
					secrets: endpointSecrets(endpoint),
				}),
			},
		);
		const response = await authFetch(BASE_URL);

		expect(calls).toBe(1);
		expect(response.status).toBe(401);
	});
});
