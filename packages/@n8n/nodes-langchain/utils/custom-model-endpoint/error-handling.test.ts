import type { INode, NodeEgressFilter } from 'n8n-workflow';

import { createCustomModelEndpointAuthFetch } from './auth-fetch';
import type { CustomModelEndpointFetchContext } from './auth-fetch';
import { endpointSecrets, wrapCustomModelEndpointErrorFetch } from './error-handling';
import type { EndpointCredential, LoginMethod } from './types';

const BASE_URL = 'https://gateway.example.com/v1';

const endpointWith = (
	login: LoginMethod,
	gatewayHeaders: Record<string, string> = {},
): EndpointCredential => ({ baseUrl: BASE_URL, login, gatewayHeaders });

const failingWith = (body: string, status = 401, headers: Record<string, string> = {}) =>
	(async () => new Response(body, { status, statusText: 'Unauthorized', headers })) as typeof fetch;

/** The message the OpenAI client would read off the reshaped body. */
async function surfacedMessage(response: Response): Promise<unknown> {
	const parsed: unknown = JSON.parse(await response.text());
	return (parsed as { error?: { message?: unknown } }).error?.message;
}

const noSecrets = { secrets: [] };

describe('wrapCustomModelEndpointErrorFetch', () => {
	it('leaves a successful response untouched', async () => {
		const stream = new Response('{"choices":[]}', { status: 200 });
		const wrapped = wrapCustomModelEndpointErrorFetch(
			(async () => stream) as typeof fetch,
			noSecrets,
		);

		expect(await wrapped(BASE_URL)).toBe(stream);
	});

	it('leaves an OpenAI-style error alone, because the client already reads it', async () => {
		const body = JSON.stringify({ error: { message: 'Model not found', type: 'invalid_request' } });
		const wrapped = wrapCustomModelEndpointErrorFetch(failingWith(body, 404), noSecrets);

		const response = await wrapped(BASE_URL);

		expect(await response.text()).toBe(body);
	});

	describe('error shapes gateways actually send', () => {
		it('reshapes an API-management body that puts the message at the top level', async () => {
			const body = JSON.stringify({
				statusCode: 401,
				message: 'Access denied due to missing subscription key.',
			});
			const wrapped = wrapCustomModelEndpointErrorFetch(failingWith(body), noSecrets);

			const response = await wrapped(BASE_URL);

			expect(response.status).toBe(401);
			expect(await surfacedMessage(response)).toBe(
				'Access denied due to missing subscription key.',
			);
		});

		it('reshapes an error that is a bare string', async () => {
			const wrapped = wrapCustomModelEndpointErrorFetch(
				failingWith(JSON.stringify({ error: 'quota exceeded' }), 429),
				noSecrets,
			);

			expect(await surfacedMessage(await wrapped(BASE_URL))).toBe('quota exceeded');
		});

		it('reshapes an OAuth error_description', async () => {
			const body = JSON.stringify({ error: 'invalid_client', error_description: 'Bad client' });
			const wrapped = wrapCustomModelEndpointErrorFetch(failingWith(body), noSecrets);

			expect(await surfacedMessage(await wrapped(BASE_URL))).toBe('Bad client');
		});

		it('reshapes a plain-text body', async () => {
			const wrapped = wrapCustomModelEndpointErrorFetch(failingWith('Unauthorized\n'), noSecrets);

			expect(await surfacedMessage(await wrapped(BASE_URL))).toBe('Unauthorized');
		});

		it('takes the title out of an HTML error page', async () => {
			const page =
				'<html><head><title>401 Authorization Required</title></head><body>…</body></html>';
			const wrapped = wrapCustomModelEndpointErrorFetch(failingWith(page), noSecrets);

			expect(await surfacedMessage(await wrapped(BASE_URL))).toBe('401 Authorization Required');
		});

		it('flattens an HTML page that has no title', async () => {
			const page = '<html><body><h1>Gateway   Timeout</h1></body></html>';
			const wrapped = wrapCustomModelEndpointErrorFetch(failingWith(page, 504), noSecrets);

			expect(await surfacedMessage(await wrapped(BASE_URL))).toBe('Gateway Timeout');
		});

		it('leaves an empty body alone, so the client reports the bare status', async () => {
			const wrapped = wrapCustomModelEndpointErrorFetch(failingWith(''), noSecrets);

			expect(await (await wrapped(BASE_URL)).text()).toBe('');
		});

		it('truncates a body long enough to be a page rather than a sentence', async () => {
			const wrapped = wrapCustomModelEndpointErrorFetch(failingWith('x'.repeat(900)), noSecrets);

			const message = await surfacedMessage(await wrapped(BASE_URL));

			expect(String(message)).toHaveLength(501);
			expect(String(message).endsWith('…')).toBe(true);
		});
	});

	describe('secrets', () => {
		it('never repeats a secret the gateway echoed back', async () => {
			const endpoint = endpointWith(
				{ type: 'header', name: 'X-Api-Key', prefix: '', key: 'sk-live-123' },
				{ 'X-Gateway-Team': 'team-token-abc' },
			);
			const body = JSON.stringify({
				message: 'Key sk-live-123 rejected for team-token-abc',
			});
			const wrapped = wrapCustomModelEndpointErrorFetch(failingWith(body), {
				secrets: endpointSecrets(endpoint),
			});

			const message = String(await surfacedMessage(await wrapped(BASE_URL)));

			expect(message).toBe('Key [redacted] rejected for [redacted]');
			expect(message).not.toContain('sk-live-123');
			expect(message).not.toContain('team-token-abc');
		});

		it('leaves a value too short to be a credential alone, rather than censoring words', async () => {
			const body = JSON.stringify({ message: 'The subscription key is invalid' });
			const wrapped = wrapCustomModelEndpointErrorFetch(failingWith(body), { secrets: ['key'] });

			expect(await surfacedMessage(await wrapped(BASE_URL))).toBe(
				'The subscription key is invalid',
			);
		});
	});
});

describe('endpointSecrets', () => {
	it('collects the bearer token', () => {
		expect(endpointSecrets(endpointWith({ type: 'bearer', token: 'tok' }))).toEqual(['tok']);
	});

	it('collects the key but not the header name, which is not a secret', () => {
		const endpoint = endpointWith({ type: 'header', name: 'X-Api-Key', prefix: 'Token', key: 'k' });

		expect(endpointSecrets(endpoint)).toEqual(['k']);
	});

	it('collects both the basic password and the encoded pair that travels on the wire', () => {
		const endpoint = endpointWith({ type: 'basic', username: 'u', password: 'p' });

		expect(endpointSecrets(endpoint)).toEqual(['p', Buffer.from('u:p').toString('base64')]);
	});

	it('collects gateway header values', () => {
		const endpoint = endpointWith({ type: 'none' }, { 'X-Team': 'secret-team' });

		expect(endpointSecrets(endpoint)).toEqual(['secret-team']);
	});

	it('skips empty values, which would redact every character', () => {
		const endpoint = endpointWith({ type: 'bearer', token: '' }, { 'X-Team': '' });

		expect(endpointSecrets(endpoint)).toEqual([]);
	});
});

describe('a rejected login', () => {
	const node = {
		id: '1',
		name: 'Custom Model Endpoint',
		type: '@n8n/n8n-nodes-langchain.customModelEndpoint',
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

		const endpoint = endpointWith({
			type: 'header',
			name: 'X-Api-Key',
			prefix: '',
			key: 'sub-key-9f2a71c4',
		});
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
		expect(await surfacedMessage(response)).toBe('Subscription key is invalid');
	});
});
