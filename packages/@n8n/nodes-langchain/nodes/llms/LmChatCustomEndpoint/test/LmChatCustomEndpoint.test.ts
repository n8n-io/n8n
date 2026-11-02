import { ChatOpenAI } from '@langchain/openai';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { LmChatCustomEndpoint } from '../LmChatCustomEndpoint.node';

vi.mock('@langchain/openai');
vi.mock('@utils/custom-model-endpoint/gateway-config', async (importOriginal) => ({
	...(await importOriginal<typeof import('@utils/custom-model-endpoint/gateway-config')>()),
	createCustomModelEndpointConfig: vi.fn(() => ({
		configuration: { baseURL: 'https://gateway.example.com/v1', fetch: vi.fn() },
		endpoint: { baseUrl: 'https://gateway.example.com/v1', login: { type: 'none' } },
	})),
}));

const MockedChatOpenAI = vi.mocked(ChatOpenAI);

const nodeDef: INode = {
	id: '1',
	name: 'Custom Endpoint Chat Model',
	typeVersion: 1,
	type: 'n8n-nodes-langchain.lmChatCustomEndpoint',
	position: [0, 0],
	parameters: {},
	credentials: { customModelEndpointApi: { id: '1', name: 'cred' } },
};

type Params = Record<string, unknown>;

const contextWith = (params: Params = {}) => {
	const ctx = createMockExecuteFunction<ISupplyDataFunctions>(
		{},
		nodeDef,
	) as Mocked<ISupplyDataFunctions>;

	ctx.getNode = vi.fn().mockReturnValue(nodeDef);
	ctx.getCredentials = vi.fn().mockResolvedValue({ url: 'https://gateway.example.com/v1' });
	ctx.getWorkflow = vi.fn().mockReturnValue({ id: 'wf-1', name: 'Nightly' });
	ctx.getExecutionId = vi.fn().mockReturnValue('exec-1');
	ctx.getNodeParameter = vi
		.fn()
		.mockImplementation((name: string, _i: number, fallback: unknown) => {
			const given = { model: 'gpt-4o', options: {}, sendContextHeaders: false, ...params };
			return name in given ? given[name] : fallback;
		});

	return ctx;
};

const constructorArgs = () => MockedChatOpenAI.mock.calls[0][0];

describe('LmChatCustomEndpoint', () => {
	let node: LmChatCustomEndpoint;

	beforeEach(() => {
		node = new LmChatCustomEndpoint();
		vi.clearAllMocks();
	});

	it('names the node so the AI Agent can find it', () => {
		expect(node.description).toMatchObject({
			name: 'lmChatCustomEndpoint',
			group: ['transform'],
			outputNames: ['Model'],
		});
	});

	it('passes the chosen model and the shared configuration to the client', async () => {
		await node.supplyData.call(contextWith({ model: 'llama-3.1-70b' }), 0);

		expect(constructorArgs()).toMatchObject({
			model: 'llama-3.1-70b',
			configuration: { baseURL: 'https://gateway.example.com/v1' },
		});
	});

	it.each([
		['maxTokens', 'maxTokens'],
		['maxCompletionTokens', 'maxCompletionTokens'],
	])('treats the -1 default of %s as unset rather than a real limit', async (option, field) => {
		await node.supplyData.call(contextWith({ options: { [option]: -1 } }), 0);

		expect(constructorArgs()[field as 'maxTokens' | 'maxCompletionTokens']).toBeUndefined();
	});

	it('hands maxCompletionTokens to the client, which knows where it belongs', async () => {
		await node.supplyData.call(contextWith({ options: { maxCompletionTokens: 256 } }), 0);

		expect(constructorArgs()).toMatchObject({ maxCompletionTokens: 256 });
		expect(constructorArgs().modelKwargs).toBeUndefined();
	});

	it.each([
		['an object, as a whole-value expression resolves to', { reasoning_effort: 'high' }],
		['a JSON string, as the field is typed', '{"reasoning_effort":"high"}'],
	])('merges Extra Body given as %s', async (_name, extraBody) => {
		await node.supplyData.call(contextWith({ extraBody }), 0);

		expect(constructorArgs().modelKwargs).toMatchObject({ reasoning_effort: 'high' });
	});

	it.each([
		['not valid JSON', '{nope', 'not valid JSON'],
		['a JSON array rather than an object', '[1,2]', 'must be a JSON object'],
		['a reserved key', '{"__proto__":{}}', 'cannot set'],
	])('refuses Extra Body that is %s', async (_name, extraBody, expected) => {
		await expect(node.supplyData.call(contextWith({ extraBody }), 0)).rejects.toThrow(expected);
	});

	it('carries the seed through as a model kwarg', async () => {
		await node.supplyData.call(contextWith({ options: { seed: 7 } }), 0);

		expect(constructorArgs().modelKwargs).toEqual({ seed: 7 });
	});

	it('drops a header row left without a name instead of failing the request', async () => {
		const blank = ' '.repeat(2);
		const headers = [
			{ name: blank, value: 'ignored' },
			{ name: 'X-Tenant', value: 'acme' },
		];

		await expect(
			node.supplyData.call(contextWith({ 'headers.header': headers }), 0),
		).resolves.toBeDefined();
	});
});
