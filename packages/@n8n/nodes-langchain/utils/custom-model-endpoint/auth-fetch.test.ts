import type { ICredentialDataDecryptedObject, INode, NodeEgressFilter } from 'n8n-workflow';

import { createCustomModelEndpointAuthFetch } from './auth-fetch';
import type { CustomModelEndpointFetchContext } from './auth-fetch';
import type { EndpointCredential, LoginMethod } from './types';

const BASE_URL = 'https://gateway.example.com/v1';

const node = {
	id: '1',
	name: 'Custom Model Endpoint',
	type: '@n8n/n8n-nodes-langchain.customModelEndpoint',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
} as INode;

const ctx = { getNode: () => node } as unknown as CustomModelEndpointFetchContext;

const allowAll = {
	validateUrl: async () => ({ ok: true }),
} as unknown as NodeEgressFilter;

const endpointWith = (
	login: LoginMethod,
	gatewayHeaders: Record<string, string> = {},
): EndpointCredential => ({ baseUrl: BASE_URL, login, gatewayHeaders });

/** Records what every hop received, and replays the queued responses in order. */
function recordingFetch(responses: Response[]) {
	const calls: Array<{ url: string; headers: Headers }> = [];
	const queue = [...responses];
	const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = input instanceof Request ? input.url : input.toString();
		calls.push({ url, headers: new Headers(init?.headers ?? {}) });
		return queue.shift() ?? new Response('{}', { status: 200 });
	};
	return { calls, fetchImpl: fetchImpl as unknown as typeof fetch };
}

const redirectTo = (location: string) => new Response(null, { status: 302, headers: { location } });

describe('createCustomModelEndpointAuthFetch', () => {
	describe('the login header the AI library already added', () => {
		it('removes it when the key belongs in a header the user named', async () => {
			const { calls, fetchImpl } = recordingFetch([]);
			const authFetch = createCustomModelEndpointAuthFetch(
				ctx,
				{},
				{
					endpoint: endpointWith({ type: 'header', name: 'X-Api-Key', prefix: '', key: 'secret' }),
					egressFilter: allowAll,
					baseFetch: fetchImpl,
				},
			);

			await authFetch(BASE_URL, { headers: { Authorization: 'Bearer placeholder' } });

			expect(calls[0].headers.get('x-api-key')).toBe('secret');
			expect(calls[0].headers.has('authorization')).toBe(false);
		});

		it('removes it when the gateway needs no login at all', async () => {
			const { calls, fetchImpl } = recordingFetch([]);
			const authFetch = createCustomModelEndpointAuthFetch(
				ctx,
				{},
				{
					endpoint: endpointWith({ type: 'none' }),
					egressFilter: allowAll,
					baseFetch: fetchImpl,
				},
			);

			await authFetch(BASE_URL, { headers: { Authorization: 'Bearer placeholder' } });

			expect(calls[0].headers.has('authorization')).toBe(false);
		});

		it('replaces it when the credential signs with a Bearer token of its own', async () => {
			const { calls, fetchImpl } = recordingFetch([]);
			const authFetch = createCustomModelEndpointAuthFetch(
				ctx,
				{},
				{
					endpoint: endpointWith({ type: 'bearer', token: 'real' }),
					egressFilter: allowAll,
					baseFetch: fetchImpl,
				},
			);

			await authFetch(BASE_URL, { headers: { Authorization: 'Bearer placeholder' } });

			expect(calls[0].headers.get('authorization')).toBe('Bearer real');
		});

		it('removes it when the caller passes a Request rather than headers in init', async () => {
			const { calls, fetchImpl } = recordingFetch([]);
			const authFetch = createCustomModelEndpointAuthFetch(
				ctx,
				{},
				{
					endpoint: endpointWith({ type: 'none' }),
					egressFilter: allowAll,
					baseFetch: fetchImpl,
				},
			);

			await authFetch(new Request(BASE_URL, { headers: { Authorization: 'Bearer placeholder' } }));

			expect(calls[0].headers.has('authorization')).toBe(false);
		});
	});

	describe('redirects', () => {
		it('sends no login or gateway header once a hop leaves the origin', async () => {
			const { calls, fetchImpl } = recordingFetch([redirectTo('https://elsewhere.example.net/v1')]);
			const authFetch = createCustomModelEndpointAuthFetch(
				ctx,
				{},
				{
					endpoint: endpointWith(
						{ type: 'header', name: 'X-Api-Key', prefix: '', key: 'secret' },
						{ 'X-Gateway-Team': 'platform' },
					),
					egressFilter: allowAll,
					baseFetch: fetchImpl,
				},
			);

			await authFetch(BASE_URL);

			expect(calls).toHaveLength(2);
			expect(calls[0].headers.get('x-api-key')).toBe('secret');
			expect(calls[0].headers.get('x-gateway-team')).toBe('platform');
			expect(calls[1].headers.has('x-api-key')).toBe(false);
			expect(calls[1].headers.has('x-gateway-team')).toBe(false);
		});

		it('keeps sending them while the hops stay on the same origin', async () => {
			const { calls, fetchImpl } = recordingFetch([
				redirectTo('https://gateway.example.com/v2/chat'),
			]);
			const authFetch = createCustomModelEndpointAuthFetch(
				ctx,
				{},
				{
					endpoint: endpointWith(
						{ type: 'bearer', token: 'real' },
						{ 'X-Gateway-Team': 'platform' },
					),
					egressFilter: allowAll,
					baseFetch: fetchImpl,
				},
			);

			await authFetch(BASE_URL);

			expect(calls[1].headers.get('authorization')).toBe('Bearer real');
			expect(calls[1].headers.get('x-gateway-team')).toBe('platform');
		});

		it('fails when a hop leaves the domains the credential allows', async () => {
			const credential: ICredentialDataDecryptedObject = {
				allowedHttpRequestDomains: 'domains',
				allowedDomains: 'gateway.example.com',
			};
			const { fetchImpl } = recordingFetch([redirectTo('https://elsewhere.example.net/v1')]);
			const authFetch = createCustomModelEndpointAuthFetch(ctx, credential, {
				endpoint: endpointWith({ type: 'bearer', token: 'real' }),
				egressFilter: allowAll,
				baseFetch: fetchImpl,
			});

			await expect(authFetch(BASE_URL)).rejects.toThrow('Domain not allowed');
		});

		it('allows the base URL host even when the user listed other domains', async () => {
			const credential: ICredentialDataDecryptedObject = {
				allowedHttpRequestDomains: 'domains',
				allowedDomains: 'other.example.org',
			};
			const { calls, fetchImpl } = recordingFetch([]);
			const authFetch = createCustomModelEndpointAuthFetch(ctx, credential, {
				endpoint: endpointWith({ type: 'bearer', token: 'real' }),
				egressFilter: allowAll,
				baseFetch: fetchImpl,
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
			const { fetchImpl } = recordingFetch([]);
			const authFetch = createCustomModelEndpointAuthFetch(
				ctx,
				{},
				{
					endpoint: endpointWith({ type: 'bearer', token: 'real' }),
					egressFilter: blocked,
					baseFetch: fetchImpl,
				},
			);

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
			const { fetchImpl } = recordingFetch([redirectTo('https://gateway.example.com/v2/chat')]);
			const authFetch = createCustomModelEndpointAuthFetch(
				ctx,
				{},
				{
					endpoint: endpointWith({ type: 'none' }),
					egressFilter: recording,
					baseFetch: fetchImpl,
				},
			);

			await authFetch(BASE_URL);

			expect(seen).toEqual([BASE_URL, 'https://gateway.example.com/v2/chat']);
		});
	});

	it('sends the per-request headers the node supplies', async () => {
		const { calls, fetchImpl } = recordingFetch([]);
		const authFetch = createCustomModelEndpointAuthFetch(
			ctx,
			{},
			{
				endpoint: endpointWith({ type: 'bearer', token: 'real' }),
				egressFilter: allowAll,
				baseFetch: fetchImpl,
				requestHeaders: { 'X-Run-Id': '42' },
			},
		);

		await authFetch(BASE_URL);

		expect(calls[0].headers.get('x-run-id')).toBe('42');
	});
});
