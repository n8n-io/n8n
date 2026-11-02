import type { ILoadOptionsFunctions, INode, NodeEgressFilter } from 'n8n-workflow';

import { createCustomModelEndpointAuthFetch } from './auth-fetch';
import type { CustomModelEndpointFetchContext } from './auth-fetch';
import { wrapCustomModelEndpointErrorFetch } from './error-handling';
import { listGatewayModels, searchModels } from './models';
import type { EndpointCredential, LoginMethod } from './types';

// searchModels builds the real dispatcher-backed transport, which a unit test
// does not stand up. Only that one hop is replaced.
const stubbed = vi.hoisted(() => ({ baseFetch: undefined as unknown as typeof fetch }));
vi.mock('./auth-fetch', async (importOriginal) => ({
	...(await importOriginal<typeof import('./auth-fetch')>()),
	createEndpointBaseFetch: () => stubbed.baseFetch,
}));

const BASE_URL = 'https://gateway.example.com/v1';

const endpointWith = (
	login: LoginMethod = { type: 'none' },
	gatewayHeaders: Record<string, string> = {},
): EndpointCredential => ({ baseUrl: BASE_URL, login, gatewayHeaders });

function answering(body: string, status = 200) {
	const calls: Array<{ url: string; method?: string; headers: Headers }> = [];
	const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
		calls.push({
			url: input instanceof Request ? input.url : input.toString(),
			method: init?.method,
			headers: new Headers(init?.headers ?? {}),
		});
		return new Response(body, { status });
	};
	return { calls, fetchImpl: fetchImpl as unknown as typeof fetch };
}

const openAiStyle = JSON.stringify({
	object: 'list',
	data: [{ id: 'gpt-4o', object: 'model' }, { id: 'claude-sonnet' }],
});

describe('listGatewayModels', () => {
	it('asks the gateway for /models below the base URL', async () => {
		const { calls, fetchImpl } = answering(openAiStyle);

		await listGatewayModels(endpointWith(), fetchImpl);

		expect(calls[0].url).toBe('https://gateway.example.com/v1/models');
		expect(calls[0].method).toBe('GET');
	});

	it.each([
		['an OpenAI-style answer', openAiStyle, ['gpt-4o', 'claude-sonnet']],
		['a bare array of objects', JSON.stringify([{ id: 'a' }, { id: 'b' }]), ['a', 'b']],
		['a bare array of ids', JSON.stringify(['a', 'b']), ['a', 'b']],
		[
			'entries that carry no id',
			JSON.stringify({ data: [{ id: 'a' }, { object: 'model' }] }),
			['a'],
		],
		['an empty list', JSON.stringify({ data: [] }), []],
	])('reads every model id out of %s', async (_name, body, expected) => {
		const { fetchImpl } = answering(body);

		expect(await listGatewayModels(endpointWith(), fetchImpl)).toEqual(expected);
	});

	describe('when the gateway cannot list models', () => {
		it('says so plainly on a 404, and points at By ID', async () => {
			const { fetchImpl } = answering('Not Found', 404);

			await expect(listGatewayModels(endpointWith(), fetchImpl)).rejects.toThrow(
				'does not publish a model list',
			);
		});

		it("passes on the gateway's own reason for any other failure", async () => {
			const { fetchImpl } = answering(
				JSON.stringify({ error: { message: 'Quota exhausted' } }),
				429,
			);

			await expect(listGatewayModels(endpointWith(), fetchImpl)).rejects.toThrow('Quota exhausted');
		});

		it('falls back to the status when the body carries no reason', async () => {
			const { fetchImpl } = answering('', 500);

			await expect(listGatewayModels(endpointWith(), fetchImpl)).rejects.toThrow('answered 500');
		});

		it('says so when the answer is not JSON', async () => {
			const { fetchImpl } = answering('<html>oops</html>');

			await expect(listGatewayModels(endpointWith(), fetchImpl)).rejects.toThrow('not JSON');
		});
	});

	it('carries the login and the gateway headers, as every other request does', async () => {
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
		const endpoint = endpointWith(
			{ type: 'header', name: 'X-Api-Key', prefix: '', key: 'secret-9f2a71c4' },
			{ 'X-Gateway-Team': 'platform' },
		);
		const { calls, fetchImpl } = answering(openAiStyle);

		const transport = createCustomModelEndpointAuthFetch(
			ctx,
			{},
			{
				endpoint,
				egressFilter: allowAll,
				baseFetch: fetchImpl,
			},
		);

		const fetchModels = wrapCustomModelEndpointErrorFetch(transport.fetch, {
			secrets: transport.secrets,
		});
		await listGatewayModels(endpoint, fetchModels);

		expect(Object.fromEntries(calls[0].headers)).toMatchObject({
			'x-api-key': 'secret-9f2a71c4',
			'x-gateway-team': 'platform',
		});
	});
});

describe('searchModels', () => {
	const node = {
		id: '1',
		name: 'n',
		type: 't',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		credentials: { customModelEndpointApi: { id: '1', name: 'c' } },
	} as unknown as INode;

	const searching = (body: string, status = 200) => {
		const { fetchImpl } = answering(body, status);
		stubbed.baseFetch = fetchImpl;
		return {
			getNode: () => node,
			getCredentials: async () => ({ url: BASE_URL, authentication: 'none' }),
			helpers: {
				getSecureEgressFilter: () => ({ validateUrl: async () => ({ ok: true }) }),
			},
		} as unknown as ILoadOptionsFunctions;
	};

	it('offers every model the gateway lists', async () => {
		const result = await searchModels.call(searching(openAiStyle));

		expect(result.results).toEqual([
			{ name: 'gpt-4o', value: 'gpt-4o' },
			{ name: 'claude-sonnet', value: 'claude-sonnet' },
		]);
	});

	it.each([
		['matches regardless of case', 'CLAUDE', ['claude-sonnet']],
		['matches on a fragment', 'sonnet', ['claude-sonnet']],
		['keeps everything when the filter is empty', '', ['gpt-4o', 'claude-sonnet']],
		['keeps nothing when nothing matches', 'mistral', []],
	])('filters the list and %s', async (_name, filter, expected) => {
		const result = await searchModels.call(searching(openAiStyle), filter);

		expect(result.results.map((entry) => entry.value)).toEqual(expected);
	});

	it.each([
		['the gateway publishes no list', '', 404, 'does not publish a model list'],
		['the gateway refuses', '{"error":{"message":"nope"}}', 403, 'could not list its models'],
		['the answer is not JSON', '<html></html>', 200, 'not JSON'],
	])('raises against the node when %s', async (_name, body, status, expected) => {
		await expect(searchModels.call(searching(body, status))).rejects.toThrow(expected);
	});
});
