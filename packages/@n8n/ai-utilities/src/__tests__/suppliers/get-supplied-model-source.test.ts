import { awaitAllCallbacks } from '@langchain/core/callbacks/promises';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { passthroughEgressFilter } from '@n8n/backend-network/egress';
import type { INode, INodeExecutionData, ISupplyDataFunctions } from 'n8n-workflow';
import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { inspect } from 'node:util';
import { mock } from 'vitest-mock-extended';

import { LangchainChatModelAdapter } from 'src/adapters/langchain-chat-model';
import { getSuppliedModelSource, supplyModel, type OpenAiModel } from 'src/suppliers/supplyModel';
import type { ChatModel } from 'src/types/chat-model';

const API_KEY = 'sk-test-6f1c2d9e-must-not-leak';
const SOURCE_KEY = Symbol.for('@n8n/ai-utilities.suppliedModelSource');

function createChatModel(): ChatModel {
	const chatModel: ChatModel = {
		provider: 'acme',
		modelId: 'acme-chat',
		defaultConfig: {},
		generate: vi.fn().mockResolvedValue({
			id: 'gen-1',
			finishReason: 'stop',
			message: { role: 'assistant', content: [{ type: 'text', text: 'pong' }] },
		}),
		stream: vi.fn(),
		withTools: vi.fn(() => chatModel),
	};
	return chatModel;
}

describe('getSuppliedModelSource', () => {
	let server: Server;
	let baseUrl: string;
	let requestHeaders: IncomingHttpHeaders[];
	let recordedData: INodeExecutionData[][][];
	let ctx: ISupplyDataFunctions;

	beforeAll(async () => {
		server = createServer((req, res) => {
			requestHeaders.push(req.headers);
			req.resume();
			req.on('end', () => {
				res.setHeader('content-type', 'application/json');
				res.end(
					JSON.stringify({
						id: 'chatcmpl-1',
						object: 'chat.completion',
						created: 0,
						model: 'acme-1',
						choices: [
							{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: 'pong' } },
						],
						usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
					}),
				);
			});
		});
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		const { port } = server.address() as AddressInfo;
		baseUrl = `http://127.0.0.1:${port}/v1`;
	});

	afterAll(async () => {
		await new Promise((resolve) => server.close(resolve));
	});

	beforeEach(() => {
		requestHeaders = [];
		recordedData = [];
		ctx = mock<ISupplyDataFunctions>({
			getNode: () => mock<INode>({ name: 'Acme Chat Model', type: 'n8n-nodes-acme.lmChatAcme' }),
			getNextRunIndex: () => 0,
			helpers: { getSecureEgressFilter: () => passthroughEgressFilter },
		});
		vi.mocked(ctx.addInputData).mockImplementation((_type, data) => {
			if (Array.isArray(data)) recordedData.push(data);
			return { index: 0 };
		});
		vi.mocked(ctx.addOutputData).mockImplementation((_type, _index, data) => {
			if (Array.isArray(data)) recordedData.push(data);
		});
	});

	function integratorConfig(): OpenAiModel {
		return {
			type: 'openai',
			baseUrl,
			apiKey: API_KEY,
			model: 'acme-1',
			defaultHeaders: { 'X-Client': 'acme' },
			frequencyPenalty: 0.1,
			maxTokens: 256,
			maxRetries: 2,
			presencePenalty: 0.2,
			temperature: 0.3,
			timeout: 30_000,
			topP: 0.9,
			additionalParams: {
				response_format: { type: 'json_object' },
				provider: { data_residency: 'eu' },
			},
		};
	}

	it('returns the OpenAI config for an OpenAI-compatible model', () => {
		const config = integratorConfig();

		const { response } = supplyModel(ctx, config);

		expect(response).toBeInstanceOf(ChatOpenAI);
		expect(getSuppliedModelSource(response)).toBe(config);
	});

	it('returns the ChatModel for an n8n chat model', () => {
		const chatModel = createChatModel();

		const { response } = supplyModel(ctx, chatModel);

		expect(response).toBeInstanceOf(LangchainChatModelAdapter);
		expect(getSuppliedModelSource(response)).toBe(chatModel);
	});

	it.each([
		['undefined', undefined],
		['null', null],
		['a string', 'model'],
		['a plain OpenAI config', { type: 'openai', baseUrl: 'x', model: 'y', apiKey: 'z' }],
		[
			'a LangChain model that supplyModel did not create',
			new ChatOpenAI({ apiKey: 'k', model: 'm' }),
		],
		['an object with an unrelated value under the key', { [SOURCE_KEY]: 42 }],
	])('returns undefined for %s', (_label, value) => {
		expect(getSuppliedModelSource(value)).toBeUndefined();
	});

	it('does not carry the source over to the model that bindTools returns', () => {
		const { response } = supplyModel(ctx, createChatModel());
		if (!(response instanceof LangchainChatModelAdapter)) throw new Error('Expected adapter');

		expect(getSuppliedModelSource(response.bindTools([]))).toBeUndefined();
	});

	it('returns undefined for an object that inherits from a supplied model', () => {
		const { response } = supplyModel(ctx, integratorConfig());
		if (!(response instanceof ChatOpenAI)) throw new Error('Expected ChatOpenAI');

		expect(getSuppliedModelSource(Object.create(response))).toBeUndefined();
	});

	it('keeps the source when a consumer replaces callbacks or patches methods', () => {
		const config = integratorConfig();
		const { response } = supplyModel(ctx, config);
		if (!(response instanceof ChatOpenAI)) throw new Error('Expected ChatOpenAI');

		response.callbacks = [];
		const invoke = response.invoke.bind(response);
		response.invoke = async (...args) => await invoke(...args);

		expect(getSuppliedModelSource(response)).toBe(config);
	});

	it('keeps the source on a Proxy around the response', () => {
		const chatModel = createChatModel();
		const { response } = supplyModel(ctx, chatModel);
		if (!(response instanceof LangchainChatModelAdapter)) throw new Error('Expected adapter');

		expect(getSuppliedModelSource(new Proxy(response, {}))).toBe(chatModel);
	});

	describe.each([
		['an OpenAI-compatible model', integratorConfig],
		['an n8n chat model', () => Object.assign(createChatModel(), { apiKey: API_KEY })],
	])('for %s, the recorded source', (_label, createSource) => {
		it('stays out of JSON, LangChain serialization, object spread and inspection', () => {
			const { response } = supplyModel(ctx, createSource());
			if (!(response instanceof BaseChatModel)) throw new Error('Expected a chat model');

			for (const output of [
				JSON.stringify(response),
				JSON.stringify(response.toJSON()),
				JSON.stringify(response.lc_kwargs),
				inspect(response, { depth: Infinity }),
			]) {
				expect(output).not.toContain('suppliedModelSource');
			}
			expect(Object.getOwnPropertySymbols({ ...response })).not.toContain(SOURCE_KEY);
			expect(Object.getOwnPropertyDescriptor(response, SOURCE_KEY)?.enumerable).toBe(false);
		});

		it('stays out of the execution data recorded for a model run', async () => {
			const { response } = supplyModel(ctx, createSource());
			if (!(response instanceof BaseChatModel)) throw new Error('Expected a chat model');

			await response.invoke([new HumanMessage('ping')]);
			await awaitAllCallbacks();

			expect(recordedData).toHaveLength(2);
			expect(JSON.stringify(recordedData)).not.toContain(API_KEY);
		});
	});

	it('keeps the API key out of the execution data recorded for an OpenAI-compatible run', async () => {
		const { response } = supplyModel(ctx, integratorConfig());
		if (!(response instanceof ChatOpenAI)) throw new Error('Expected ChatOpenAI');

		await response.invoke([new HumanMessage('ping')]);
		await awaitAllCallbacks();

		expect(requestHeaders[0].authorization).toBe(`Bearer ${API_KEY}`);
		expect(recordedData).toHaveLength(2);
		expect(JSON.stringify(recordedData)).not.toContain(API_KEY);
	});
});
