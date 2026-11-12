import { ChatOpenAI, ChatOpenAICompletions } from '@langchain/openai';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { LmChatCustomEndpoint } from '../LmChatCustomEndpoint.node';

import { createCustomModelEndpointConfig } from '@utils/custom-model-endpoint/gateway-config';

vi.mock('@langchain/openai');
vi.mock('@utils/custom-model-endpoint/gateway-config', async (importOriginal) => ({
	...(await importOriginal<typeof import('@utils/custom-model-endpoint/gateway-config')>()),
	createCustomModelEndpointConfig: vi.fn(() => ({
		configuration: { baseURL: 'https://gateway.example.com/v1', fetch: vi.fn() },
		endpoint: { baseUrl: 'https://gateway.example.com/v1', login: { type: 'none' } },
	})),
}));

const MockedChatOpenAI = vi.mocked(ChatOpenAI);
const MockedChatOpenAICompletions = vi.mocked(ChatOpenAICompletions);

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

const RESPONSES: Params = { apiFormat: 'responses' };

/** Built rather than written, so the node-param lint rule does not read it as a display name. */
const BLANK = ' '.repeat(2);

const contextWith = (params: Params = {}) => {
	const ctx = createMockExecuteFunction<ISupplyDataFunctions>(
		{},
		nodeDef,
	) as Mocked<ISupplyDataFunctions>;

	ctx.getNode = vi.fn().mockReturnValue(nodeDef);
	ctx.getCredentials = vi.fn().mockResolvedValue({ url: 'https://gateway.example.com/v1' });
	ctx.getWorkflow = vi.fn().mockReturnValue({ id: 'wf-1', name: 'Nightly' });
	ctx.getExecutionId = vi.fn().mockReturnValue('exec-1');
	const given: Params = { model: 'gpt-4o', options: {}, sendContextHeaders: false, ...params };
	ctx.getNodeParameter = vi
		.fn()
		.mockImplementation((name: string, _i: number, fallback: unknown) =>
			name in given ? given[name] : fallback,
		);

	return ctx;
};

const constructorArgs = () => {
	const args = (MockedChatOpenAICompletions.mock.calls[0] ?? MockedChatOpenAI.mock.calls[0])?.[0];
	if (!args) throw new Error('the chat client was never constructed');
	return args;
};
const configOptions = () => vi.mocked(createCustomModelEndpointConfig).mock.calls[0][2];

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

	it('wraps the model, so an empty tool-call content reaches the gateway as a string', async () => {
		const { response } = await node.supplyData.call(contextWith(), 0);

		// The wrapper patches in place and leaves this marker behind
		const marked = Object.getOwnPropertySymbols(response).some(
			(symbol) => symbol.description === 'wrappedChatModelMessageInput',
		);

		expect(marked).toBe(true);
	});

	it('passes the chosen model and the shared configuration to the client', async () => {
		await node.supplyData.call(contextWith({ model: 'llama-3.1-70b' }), 0);

		expect(constructorArgs()).toMatchObject({
			model: 'llama-3.1-70b',
			configuration: { baseURL: 'https://gateway.example.com/v1' },
		});
	});

	it('treats the -1 default of the token limit as unset rather than a real limit', async () => {
		await node.supplyData.call(contextWith({ options: { maxTokens: -1 } }), 0);

		expect(constructorArgs().maxTokens).toBeUndefined();
	});

	it('passes a real token limit through to the client', async () => {
		await node.supplyData.call(contextWith({ options: { maxTokens: 256 } }), 0);

		expect(constructorArgs()).toMatchObject({ maxTokens: 256 });
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

	describe('the headers it asks the transport to send', () => {
		it.each<[string, Params, Record<string, string>]>([
			[
				'drops a row left without a name',
				{
					'headers.header': [
						{ name: BLANK, value: 'ignored' },
						{ name: 'X-Tenant', value: 'acme' },
					],
				},
				{ 'X-Tenant': 'acme' },
			],
			[
				'drops a row whose value is neither text nor a number',
				{ 'headers.header': [{ name: 'X-Tenant', value: { nested: true } }] },
				{},
			],
			[
				'names the workflow and the execution when the context headers are on',
				{ sendContextHeaders: true },
				{
					'x-n8n-workflow-id': 'wf-1',
					'x-n8n-workflow-name': 'Nightly',
					'x-n8n-execution-id': 'exec-1',
				},
			],
			['sends no context header when they are off', { sendContextHeaders: false }, {}],
			[
				'lets a header of the node override a context header',
				{
					sendContextHeaders: true,
					'headers.header': [{ name: 'x-n8n-workflow-name', value: 'Renamed' }],
				},
				{
					'x-n8n-workflow-id': 'wf-1',
					'x-n8n-workflow-name': 'Renamed',
					'x-n8n-execution-id': 'exec-1',
				},
			],
		])('%s', async (_name, params, expected) => {
			await node.supplyData.call(contextWith(params), 0);

			expect(configOptions().requestHeaders).toEqual(expected);
		});
	});

	it('gives the transport the timeout, so one request cannot hang the execution', async () => {
		await node.supplyData.call(contextWith({ options: { timeout: 5_000 } }), 0);

		expect(configOptions()).toMatchObject({ timeout: 5_000 });
		expect(constructorArgs()).toMatchObject({ timeout: 5_000 });
	});

	describe('the API format it calls', () => {
		it('offers both formats and leaves a saved node on Chat Completions', () => {
			const field = node.description.properties.find(({ name }) => name === 'apiFormat');

			expect(field).toMatchObject({
				type: 'options',
				default: 'chatCompletions',
				options: [
					{ name: 'Chat Completions', value: 'chatCompletions' },
					{ name: 'Responses', value: 'responses' },
				],
			});
		});

		it('keeps a model named after a Responses-preferring one on Chat Completions', async () => {
			await node.supplyData.call(contextWith({ model: 'codex-mini' }), 0);

			expect(MockedChatOpenAICompletions).toHaveBeenCalledTimes(1);
			expect(MockedChatOpenAI).not.toHaveBeenCalled();
		});

		it('asks the client for Responses, so the Agent can tell the two protocols apart', async () => {
			await node.supplyData.call(contextWith(RESPONSES), 0);

			expect(MockedChatOpenAICompletions).not.toHaveBeenCalled();
			expect(constructorArgs()).toMatchObject({ useResponsesApi: true });
		});

		it.each([['chatCompletions'], ['responses']])(
			'reads the same credential and model on %s',
			async (apiFormat) => {
				await node.supplyData.call(contextWith({ apiFormat, model: 'llama-3.1-70b' }), 0);

				expect(constructorArgs()).toMatchObject({
					model: 'llama-3.1-70b',
					configuration: { baseURL: 'https://gateway.example.com/v1' },
				});
			},
		);

		it('leaves a Responses model unwrapped, as the message wrapper reshapes Chat Completions', async () => {
			const { response } = await node.supplyData.call(contextWith(RESPONSES), 0);

			const marked = Object.getOwnPropertySymbols(response).some(
				(symbol) => symbol.description === 'wrappedChatModelMessageInput',
			);

			expect(marked).toBe(false);
		});
	});

	describe('the Responses options it sends', () => {
		it.each<[string, Params, Record<string, unknown>]>([
			[
				'the reasoning summary, nested as the API takes it',
				{ reasoningSummary: 'concise' },
				{ reasoning: { summary: 'concise' } },
			],
			[
				'the store flag, including when it is turned off',
				{ storeResponse: false },
				{ store: false },
			],
			['the truncation strategy', { truncation: 'disabled' }, { truncation: 'disabled' }],
		])('sends %s', async (_name, options, expected) => {
			await node.supplyData.call(contextWith({ ...RESPONSES, options }), 0);

			expect(constructorArgs().modelKwargs).toEqual(expected);
		});

		it('sends the Max Output Tokens field rather than the Chat Completions one', async () => {
			await node.supplyData.call(
				contextWith({ ...RESPONSES, options: { maxOutputTokens: 512, maxTokens: 256 } }),
				0,
			);

			expect(constructorArgs()).toMatchObject({ maxTokens: 512 });
		});

		it.each<[string, Params]>([
			['the seed', { seed: 7 }],
			['the frequency penalty', { frequencyPenalty: 1 }],
			['the presence penalty', { presencePenalty: 1 }],
			['the stop sequences', { stop: 'END' }],
		])('leaves out %s, which the hidden Chat Completions field holds', async (_name, options) => {
			await node.supplyData.call(contextWith({ ...RESPONSES, options }), 0);

			expect(constructorArgs().modelKwargs).toBeUndefined();
			expect(constructorArgs()).not.toHaveProperty('frequencyPenalty');
			expect(constructorArgs()).not.toHaveProperty('presencePenalty');
			expect(constructorArgs()).not.toHaveProperty('stop');
		});
	});
});
