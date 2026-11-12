import {
	NodeApiError,
	type ILoadOptionsFunctions,
	type INode,
	type NodeEgressFilter,
} from 'n8n-workflow';

import { createCustomModelEndpointAuthFetch } from './auth-fetch';
import type { CustomModelEndpointFetchContext } from './auth-fetch';
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
const BY_ID_HINT = 'Switch Model to "By ID" and type the model ID that your gateway expects.';

const node = {
	id: '1',
	name: 'Custom Model Endpoint',
	type: 'test',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
	credentials: { customModelEndpointApi: { id: '1', name: 'c' } },
} as unknown as INode;

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

const rejection = async (run: Promise<unknown>): Promise<NodeApiError | undefined> =>
	await run.then(
		() => undefined,
		(reason: NodeApiError) => reason,
	);

const openAiStyle = JSON.stringify({
	object: 'list',
	data: [{ id: 'gpt-4o', object: 'model' }, { id: 'claude-sonnet' }],
});

describe('listGatewayModels', () => {
	it('asks the gateway for /models below the base URL', async () => {
		const { calls, fetchImpl } = answering(openAiStyle);

		await listGatewayModels(node, endpointWith(), fetchImpl);

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

		expect(await listGatewayModels(node, endpointWith(), fetchImpl)).toEqual(expected);
	});

	describe('when the gateway cannot list models', () => {
		it.each<[string, number, string, string, string | null]>([
			[
				'it publishes no list',
				404,
				'Not Found',
				'This gateway does not publish a model list',
				'404',
			],
			[
				'it states a reason of its own',
				429,
				'{"error":{"message":"Quota exhausted"}}',
				'The gateway could not list its models: Quota exhausted',
				'429',
			],
			[
				'it states no reason',
				500,
				'',
				'The gateway could not list its models: it answered 500',
				'500',
			],
			[
				'the answer is not JSON',
				200,
				'<html>oops</html>',
				'The gateway answered the model list with something that is not JSON',
				null,
			],
		])(
			'gives the editor the code and the way out when %s',
			async (_name, status, body, message, httpCode) => {
				const { fetchImpl } = answering(body, status);

				const error = await rejection(listGatewayModels(node, endpointWith(), fetchImpl));

				expect(error).toBeInstanceOf(NodeApiError);
				expect(error?.message).toBe(message);
				expect(error?.httpCode).toBe(httpCode);
				expect(error?.description).toBe(BY_ID_HINT);
			},
		);
	});

	it('carries the login and the gateway headers, as every other request does', async () => {
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
		await listGatewayModels(node, endpoint, transport.fetch);

		expect(Object.fromEntries(calls[0].headers)).toMatchObject({
			'x-api-key': 'secret-9f2a71c4',
			'x-gateway-team': 'platform',
		});
	});
});

describe('searchModels', () => {
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

	it.each<[string, string, number, string | null]>([
		['the gateway publishes no list', '', 404, '404'],
		['the gateway refuses', '{"error":{"message":"nope"}}', 403, '403'],
		['the answer is not JSON', '<html></html>', 200, null],
	])('passes the failure to the editor when %s', async (_name, body, status, httpCode) => {
		const error = await rejection(searchModels.call(searching(body, status)));

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error?.httpCode).toBe(httpCode);
		expect(error?.description).toBe(BY_ID_HINT);
	});
});
