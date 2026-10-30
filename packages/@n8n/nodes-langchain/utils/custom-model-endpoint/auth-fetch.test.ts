import type { ICredentialDataDecryptedObject, INode, NodeEgressFilter } from 'n8n-workflow';

import { createCustomModelEndpointAuthFetch } from './auth-fetch';
import type { CustomModelEndpointFetchContext } from './auth-fetch';
import type { EndpointCredential, LoginMethod } from './types';

const BASE_URL = 'https://gateway.example.com/v1';
const INHERITED = { Authorization: 'Bearer placeholder' };

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

const endpointWith = (
	login: LoginMethod,
	gatewayHeaders: Record<string, string> = {},
): EndpointCredential => ({ baseUrl: BASE_URL, login, gatewayHeaders });

function recordingFetch(responses: Response[] = []) {
	const calls: Array<{ url: string; headers: Headers }> = [];
	const queue = [...responses];
	const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
		calls.push({
			url: input instanceof Request ? input.url : input.toString(),
			headers: new Headers(init?.headers ?? {}),
		});
		return queue.shift() ?? new Response('{}', { status: 200 });
	};
	return { calls, fetchImpl: fetchImpl as unknown as typeof fetch };
}

function authFetchFor(
	endpoint: EndpointCredential,
	overrides: {
		credential?: ICredentialDataDecryptedObject;
		egressFilter?: NodeEgressFilter;
		responses?: Response[];
		requestHeaders?: Record<string, string>;
	} = {},
) {
	const { calls, fetchImpl } = recordingFetch(overrides.responses);
	const authFetch = createCustomModelEndpointAuthFetch(ctx, overrides.credential ?? {}, {
		endpoint,
		egressFilter: overrides.egressFilter ?? allowAll,
		baseFetch: fetchImpl,
		requestHeaders: overrides.requestHeaders,
	});
	return { calls, authFetch };
}

const redirectTo = (location: string) => new Response(null, { status: 302, headers: { location } });

const restrictedTo = (domains: string): ICredentialDataDecryptedObject => ({
	allowedHttpRequestDomains: 'domains',
	allowedDomains: domains,
});

describe('createCustomModelEndpointAuthFetch', () => {
	it.each<[string, LoginMethod, string | null]>([
		[
			'no Authorization when the key goes in a header the user named',
			{ type: 'header', name: 'X-Api-Key', prefix: '', key: 'secret' },
			null,
		],
		['no Authorization when the gateway needs no login', { type: 'none' }, null],
		['its own Bearer token', { type: 'bearer', token: 'real' }, 'Bearer real'],
		[
			'its own Basic credentials',
			{ type: 'basic', username: 'u', password: 'p' },
			`Basic ${Buffer.from('u:p').toString('base64')}`,
		],
	])('sends %s, replacing the one the AI library added', async (_name, login, expected) => {
		const { calls, authFetch } = authFetchFor(endpointWith(login));

		await authFetch(BASE_URL, { headers: INHERITED });

		expect(calls[0].headers.get('authorization')).toBe(expected);
	});

	it('strips the inherited header when the caller passes a Request', async () => {
		const { calls, authFetch } = authFetchFor(endpointWith({ type: 'none' }));

		await authFetch(new Request(BASE_URL, { headers: INHERITED }));

		expect(calls[0].headers.has('authorization')).toBe(false);
	});

	it('sends the credential login and the gateway headers together', async () => {
		const endpoint = endpointWith(
			{ type: 'header', name: 'X-Api-Key', prefix: 'Token', key: 'secret' },
			{ 'X-Gateway-Team': 'platform' },
		);
		const { calls, authFetch } = authFetchFor(endpoint, { requestHeaders: { 'X-Run-Id': '42' } });

		await authFetch(BASE_URL);

		expect(Object.fromEntries(calls[0].headers)).toMatchObject({
			'x-api-key': 'Token secret',
			'x-gateway-team': 'platform',
			'x-run-id': '42',
		});
	});

	describe('redirects', () => {
		const endpoint = endpointWith(
			{ type: 'bearer', token: 'real' },
			{ 'X-Gateway-Team': 'platform' },
		);

		it.each<[string, string, boolean]>([
			['keeps them while the hops stay on one origin', 'https://gateway.example.com/v2/chat', true],
			['withholds them once a hop leaves the origin', 'https://elsewhere.example.net/v1', false],
		])('%s', async (_name, location, stillSent) => {
			const { calls, authFetch } = authFetchFor(endpoint, { responses: [redirectTo(location)] });

			await authFetch(BASE_URL);

			expect(calls).toHaveLength(2);
			expect(calls[1].headers.has('authorization')).toBe(stillSent);
			expect(calls[1].headers.has('x-gateway-team')).toBe(stillSent);
		});

		it('fails when a hop leaves the domains the credential allows', async () => {
			const { authFetch } = authFetchFor(endpoint, {
				credential: restrictedTo('gateway.example.com'),
				responses: [redirectTo('https://elsewhere.example.net/v1')],
			});

			await expect(authFetch(BASE_URL)).rejects.toThrow('Domain not allowed');
		});

		it('allows the base URL host even when the user listed other domains', async () => {
			const { calls, authFetch } = authFetchFor(endpoint, {
				credential: restrictedTo('other.example.org'),
			});

			await authFetch(BASE_URL);

			expect(calls).toHaveLength(1);
		});
	});

	describe('egress filter', () => {
		it('fails when the filter blocks the address', async () => {
			const blocked = {
				validateUrl: async () => ({ ok: false, error: new Error('Address is blocked') }),
			} as unknown as NodeEgressFilter;
			const { authFetch } = authFetchFor(endpointWith({ type: 'none' }), { egressFilter: blocked });

			await expect(authFetch(BASE_URL)).rejects.toThrow('Address is blocked');
		});

		it('checks every hop, not only the first', async () => {
			const seen: string[] = [];
			const recording = {
				validateUrl: async (url: string) => {
					seen.push(url);
					return { ok: true };
				},
			} as unknown as NodeEgressFilter;
			const { authFetch } = authFetchFor(endpointWith({ type: 'none' }), {
				egressFilter: recording,
				responses: [redirectTo('https://gateway.example.com/v2/chat')],
			});

			await authFetch(BASE_URL);

			expect(seen).toEqual([BASE_URL, 'https://gateway.example.com/v2/chat']);
		});
	});

	describe('an OAuth2 client credentials login', () => {
		const TOKEN_URL = 'https://login.example.com/oauth2/token';
		const oauth2 = endpointWith({
			type: 'oauth2',
			tokenUrl: TOKEN_URL,
			clientId: 'client-1',
			clientSecret: 'cs-9f2a71c4ab',
			scope: '',
			sendCredentialsIn: 'header',
		});

		function routedFetch(gatewayStatuses: number[]) {
			const calls: Array<{ url: string; headers: Headers }> = [];
			const statuses = [...gatewayStatuses];
			let issued = 0;
			const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
				const url = input instanceof Request ? input.url : input.toString();
				calls.push({ url, headers: new Headers(init?.headers ?? {}) });
				if (url === TOKEN_URL) {
					issued += 1;
					return new Response(JSON.stringify({ access_token: `tok-${issued}`, expires_in: 3600 }), {
						status: 200,
					});
				}
				return new Response('{}', { status: statuses.shift() ?? 200 });
			};
			return { calls, fetchImpl: fetchImpl as unknown as typeof fetch };
		}

		const gatewayCalls = (calls: Array<{ url: string; headers: Headers }>) =>
			calls.filter((c) => c.url !== TOKEN_URL);

		it('sends the token it fetched from the login server', async () => {
			const { calls, fetchImpl } = routedFetch([200]);
			const authFetch = createCustomModelEndpointAuthFetch(
				ctx,
				{},
				{
					endpoint: oauth2,
					egressFilter: allowAll,
					baseFetch: fetchImpl,
				},
			);

			await authFetch(BASE_URL);

			expect(gatewayCalls(calls)[0].headers.get('authorization')).toBe('Bearer tok-1');
		});

		it('fetches a new token once when the gateway rejects the old one', async () => {
			const { calls, fetchImpl } = routedFetch([401, 200]);
			const authFetch = createCustomModelEndpointAuthFetch(
				ctx,
				{},
				{
					endpoint: oauth2,
					egressFilter: allowAll,
					baseFetch: fetchImpl,
				},
			);

			const response = await authFetch(BASE_URL);

			expect(response.status).toBe(200);
			expect(gatewayCalls(calls).map((c) => c.headers.get('authorization'))).toEqual([
				'Bearer tok-1',
				'Bearer tok-2',
			]);
		});

		it('gives up after the second rejection rather than looping', async () => {
			const { calls, fetchImpl } = routedFetch([401, 401]);
			const authFetch = createCustomModelEndpointAuthFetch(
				ctx,
				{},
				{
					endpoint: oauth2,
					egressFilter: allowAll,
					baseFetch: fetchImpl,
				},
			);

			const response = await authFetch(BASE_URL);

			expect(response.status).toBe(401);
			expect(gatewayCalls(calls)).toHaveLength(2);
		});

		it('fails before reaching the gateway when the login server is not an allowed domain', async () => {
			const { calls, fetchImpl } = routedFetch([200]);
			const authFetch = createCustomModelEndpointAuthFetch(
				ctx,
				restrictedTo('gateway.example.com'),
				{
					endpoint: oauth2,
					egressFilter: allowAll,
					baseFetch: fetchImpl,
				},
			);

			await expect(authFetch(BASE_URL)).rejects.toThrow('Domain not allowed');
			expect(gatewayCalls(calls)).toHaveLength(0);
		});
	});
});
