import { DynamicTool } from '@langchain/classic/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI } from '@langchain/openai';
import {
	NodeConnectionTypes,
	NodeHelpers,
	type IExecuteFunctions,
	type INode,
	type INodeParameters,
	type ISupplyDataFunctions,
	type IWorkflowMetadata,
} from 'n8n-workflow';
import nock from 'nock';
import { mock } from 'vitest-mock-extended';

import * as helpers from '../../../../../utils/helpers';
import { LmChatOpenAi } from '../../../../llms/LMChatOpenAi/LmChatOpenAi.node';
import { toolsAgentExecute } from '../../agents/ToolsAgent/V2/execute';

vi.mock('@n8n/ai-utilities', async (importOriginal) => {
	const { BaseCallbackHandler } = await import('@langchain/core/callbacks/base');
	return {
		...(await importOriginal<typeof import('@n8n/ai-utilities')>()),
		getProxyAgent: vi.fn(),
		N8nLlmTracing: class extends BaseCallbackHandler {
			name = 'N8nLlmTracing';
		},
	};
});

const credentials = { apiKey: 'test-api-key', url: 'http://gateway.example:20128/v1' };

function completionResponse(model: string) {
	return {
		id: 'chatcmpl-test',
		object: 'chat.completion',
		created: 1700000000,
		model,
		choices: [
			{
				index: 0,
				message: { role: 'assistant', content: 'Gateway response' },
				finish_reason: 'stop',
			},
		],
		usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
	};
}

function gatewayRequest(
	model: string,
	credential = credentials,
	expectedBody: Record<string, unknown> = {},
) {
	return nock(credential.url, {
		reqheaders: { authorization: `Bearer ${credential.apiKey}` },
	}).post('/chat/completions', (body: unknown) => {
		expect(body).toMatchObject({ model, ...expectedBody });
		return true;
	});
}

const expectedOutput = [[{ json: { output: 'Gateway response' }, pairedItem: { item: 0 } }]];

describe('Tools Agent V2 with a custom OpenAI-compatible endpoint', () => {
	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.enableNetConnect();
	});

	afterEach(() => {
		nock.cleanAll();
		vi.restoreAllMocks();
	});

	async function setup(
		modelId: string,
		parameterOverrides: INodeParameters = {},
		credential: { apiKey: string; url?: string } = credentials,
		version = 1.3,
	) {
		const chatModel = new LmChatOpenAi();
		const modelNode: INode = {
			id: 'chat-model',
			name: 'OpenAI Chat Model',
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			typeVersion: version,
			position: [0, 0],
			parameters: {
				model: version >= 1.2 ? { __rl: true, mode: 'id', value: modelId } : modelId,
				options: {},
				...parameterOverrides,
			},
		};
		// Load the defaults to match a new OpenAI Chat Model sub-node.
		const parameters = NodeHelpers.getNodeParameters(
			chatModel.description.properties,
			modelNode.parameters,
			true,
			false,
			modelNode,
			chatModel.description,
		);
		const supplyContext = mock<ISupplyDataFunctions>({
			helpers: mock<ISupplyDataFunctions['helpers']>(),
		});
		supplyContext.getNode.mockReturnValue(modelNode);
		supplyContext.getCredentials.mockResolvedValue(credential);
		supplyContext.getNodeParameter.mockImplementation((name, _index, fallback) => {
			if (name === 'model.value') return modelId;
			return parameters?.[name] ?? fallback;
		});

		const { response } = await chatModel.supplyData.call(supplyContext, 0);
		expect(response).toBeInstanceOf(BaseChatModel);
		expect(response).toMatchObject({ model: modelId });

		const context = mock<IExecuteFunctions>({
			logger: mock<IExecuteFunctions['logger']>(),
		});
		context.getNode.mockReturnValue(mock<INode>({ name: 'AI Agent', typeVersion: 2 }));
		context.getInputData.mockReturnValue([{ json: { text: 'Hello' } }]);
		context.getInputConnectionData.mockImplementation(async (type) =>
			type === NodeConnectionTypes.AiLanguageModel ? response : undefined,
		);
		context.getNodeParameter.mockImplementation((name, _index, fallback) => {
			if (name === 'text') return 'Hello';
			return fallback;
		});
		context.getWorkflow.mockReturnValue(mock<IWorkflowMetadata>({ name: 'Test Workflow' }));
		context.getExecutionId.mockReturnValue('test-execution');
		vi.spyOn(helpers, 'getConnectedTools').mockResolvedValue([]);

		return { context, model: response as BaseChatModel };
	}

	it.each([
		'auto/balanced',
		'auto/cheapest',
		'combo/my-combo',
		'provider/team/model',
		'custom-alias',
		'combo/codex-fallback',
	])('accepts the custom model ID %s with the default chat-model settings', async (modelId) => {
		const { context } = await setup(modelId);
		const gateway = gatewayRequest(modelId).reply(200, completionResponse(modelId));

		await expect(toolsAgentExecute.call(context)).resolves.toEqual(expectedOutput);
		expect(gateway.isDone()).toBe(true);
	});

	it.each([true, false])(
		'uses Chat Completions for a custom endpoint when responsesApiEnabled is %s',
		async (responsesApiEnabled) => {
			const modelId = 'auto/balanced';
			const { context } = await setup(modelId, { responsesApiEnabled });
			const gateway = gatewayRequest(modelId).reply(200, completionResponse(modelId));

			await expect(toolsAgentExecute.call(context)).resolves.toEqual(expectedOutput);
			expect(gateway.isDone()).toBe(true);
		},
	);

	it.each<[number, INodeParameters]>([
		[1.2, {}],
		[1.3, { responsesApiEnabled: false }],
	])(
		'keeps automatic Responses API routing with the option off on model node v%s',
		async (version, parameters) => {
			// AGENT-1569: Preserve LangChain's automatic API selection when the option is off.
			const modelId = 'gpt-5-codex';
			const { context, model } = await setup(
				modelId,
				{ ...parameters, options: { maxRetries: 0 } },
				credentials,
				version,
			);
			expect(model).toMatchObject({ useResponsesApi: false });
			const gateway = nock(credentials.url, {
				reqheaders: { authorization: `Bearer ${credentials.apiKey}` },
			})
				.post('/responses', (body: unknown) => {
					expect(body).toMatchObject({ model: modelId });
					return true;
				})
				.twice()
				.reply(200, {
					id: 'resp-test',
					object: 'response',
					created_at: 1700000000,
					model: modelId,
					status: 'completed',
					output: [
						{
							id: 'msg-test',
							type: 'message',
							role: 'assistant',
							status: 'completed',
							content: [{ type: 'output_text', text: 'Gateway response', annotations: [] }],
						},
					],
					usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
				});

			const response = await model.invoke('Hello');

			expect(response.text).toBe('Gateway response');
			await expect(toolsAgentExecute.call(context)).resolves.toEqual(expectedOutput);
			expect(gateway.isDone()).toBe(true);
		},
	);

	it('uses the legacy Base URL override before the credential URL', async () => {
		const modelId = 'auto/balanced';
		const { context } = await setup(
			modelId,
			{ options: { baseURL: credentials.url } },
			{ apiKey: credentials.apiKey, url: 'https://api.openai.com/v1' },
			1,
		);
		const gateway = gatewayRequest(modelId).reply(200, completionResponse(modelId));

		await expect(toolsAgentExecute.call(context)).resolves.toEqual(expectedOutput);
		expect(gateway.isDone()).toBe(true);
	});

	it.each([undefined, 'https://api.openai.com/v1', 'https://api.openai.com/v1/'])(
		'keeps the Responses API guard for the default OpenAI endpoint %s',
		async (url) => {
			const { context, model } = await setup(
				'gpt-4o-mini',
				{},
				{ apiKey: credentials.apiKey, url },
			);

			expect(model).toBeInstanceOf(ChatOpenAI);
			expect(model).toMatchObject({ useResponsesApi: true });
			await expect(toolsAgentExecute.call(context)).rejects.toThrow(
				'This model is not supported in 2 version of the Agent node',
			);
		},
	);

	it('keeps Chat Completions available on the default OpenAI endpoint', async () => {
		const modelId = 'gpt-4o-mini';
		const openAiCredentials = { ...credentials, url: 'https://api.openai.com/v1' };
		const { context } = await setup(modelId, { responsesApiEnabled: false }, openAiCredentials);
		const gateway = gatewayRequest(modelId, openAiCredentials).reply(
			200,
			completionResponse(modelId),
		);

		await expect(toolsAgentExecute.call(context)).resolves.toEqual(expectedOutput);
		expect(gateway.isDone()).toBe(true);
	});

	it('keeps the selected Responses API available to other model consumers', async () => {
		const modelId = 'auto/balanced';
		const { model } = await setup(modelId);
		const gateway = nock(credentials.url, {
			reqheaders: { authorization: `Bearer ${credentials.apiKey}` },
		})
			.post('/responses', (body: unknown) => {
				expect(body).toMatchObject({ model: modelId });
				return true;
			})
			.reply(200, {
				id: 'resp-test',
				object: 'response',
				created_at: 1700000000,
				model: modelId,
				status: 'completed',
				output: [
					{
						id: 'msg-test',
						type: 'message',
						role: 'assistant',
						status: 'completed',
						content: [{ type: 'output_text', text: 'Gateway response', annotations: [] }],
					},
				],
				usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
			});

		const response = await model.invoke('Hello');

		expect(response.text).toBe('Gateway response');
		expect(gateway.isDone()).toBe(true);
	});

	const responsesOnlySettings: Array<[string, INodeParameters]> = [
		['built-in tools', { builtInTools: { codeInterpreter: true } }],
		['conversation', { options: { conversationId: 'test-conversation' } }],
		['text format', { options: { textFormat: { textOptions: { type: 'json_object' } } } }],
		['prompt', { options: { promptConfig: { promptOptions: { promptId: 'test-prompt' } } } }],
		['reasoning', { options: { modelSupportsReasoning: true, reasoningEffort: 'high' } }],
	];
	it.each(responsesOnlySettings)(
		'keeps the Responses API guard for explicit %s settings on a custom endpoint',
		async (_feature, parameters) => {
			const { context } = await setup('auto/balanced', parameters);

			await expect(toolsAgentExecute.call(context)).rejects.toThrow(
				'This model is not supported in 2 version of the Agent node',
			);
		},
	);

	it('forwards the selected response format and reasoning effort', async () => {
		const modelId = 'custom-alias';
		const { context } = await setup(modelId, {
			responsesApiEnabled: false,
			options: {
				responseFormat: 'json_object',
				modelSupportsReasoning: true,
				reasoningEffort: 'high',
			},
		});
		const gateway = gatewayRequest(modelId, credentials, {
			response_format: { type: 'json_object' },
			reasoning_effort: 'high',
		}).reply(200, completionResponse(modelId));

		await expect(toolsAgentExecute.call(context)).resolves.toEqual(expectedOutput);
		expect(gateway.isDone()).toBe(true);
	});

	it('streams a custom model response through Agent v2.1', async () => {
		const modelId = 'auto/balanced';
		const { context } = await setup(modelId);
		context.getNode.mockReturnValue(mock<INode>({ name: 'AI Agent', typeVersion: 2.1 }));
		context.isStreaming.mockReturnValue(true);
		const chunk = {
			id: 'chatcmpl-test',
			object: 'chat.completion.chunk',
			created: 1700000000,
			model: modelId,
			choices: [
				{
					index: 0,
					delta: { role: 'assistant', content: 'Gateway response' },
					finish_reason: 'stop',
				},
			],
		};
		const gateway = gatewayRequest(modelId, credentials, { stream: true }).reply(
			200,
			`data: ${JSON.stringify(chunk)}\n\ndata: [DONE]\n\n`,
			{ 'Content-Type': 'text/event-stream' },
		);

		await expect(toolsAgentExecute.call(context)).resolves.toEqual(expectedOutput);
		expect(context.sendChunk).toHaveBeenCalledWith('item', 0, 'Gateway response');
		expect(gateway.isDone()).toBe(true);
	});

	it('executes tool calls with a custom model ID', async () => {
		const modelId = 'combo/my-combo';
		const { context } = await setup(modelId);
		const executeTool = vi.fn(async () => 'Tool result');
		const tool = new DynamicTool({
			name: 'lookup',
			description: 'Look up a value',
			func: executeTool,
		});
		vi.spyOn(helpers, 'getConnectedTools').mockResolvedValue([tool]);
		const toolCall = {
			id: 'call-1',
			type: 'function',
			function: { name: 'lookup', arguments: '{"input":"test"}' },
		};
		const gateway = gatewayRequest(modelId, credentials, {
			tools: [{ type: 'function', function: { name: 'lookup' } }],
		})
			.reply(200, {
				...completionResponse(modelId),
				choices: [
					{
						index: 0,
						message: { role: 'assistant', content: null, tool_calls: [toolCall] },
						finish_reason: 'tool_calls',
					},
				],
			})
			.post('/chat/completions', (body: unknown) => {
				expect(body).toMatchObject({
					model: modelId,
					messages: expect.arrayContaining([
						{ role: 'tool', tool_call_id: 'call-1', content: 'Tool result' },
					]),
				});
				return true;
			})
			.reply(200, completionResponse(modelId));

		await expect(toolsAgentExecute.call(context)).resolves.toEqual(expectedOutput);
		expect(executeTool).toHaveBeenCalledExactlyOnceWith(
			'test',
			expect.anything(),
			expect.anything(),
		);
		expect(gateway.isDone()).toBe(true);
	});

	it.each([401, 403, 404, 429])('returns a provider error for HTTP %s', async (status) => {
		const modelId = 'auto/balanced';
		const { context } = await setup(modelId, { options: { maxRetries: 0 } });
		const gateway = gatewayRequest(modelId).reply(status, {
			error: { message: 'Gateway rejected the request', type: 'provider_error' },
		});

		await expect(toolsAgentExecute.call(context)).rejects.toThrow();
		expect(gateway.isDone()).toBe(true);
	});

	it('uses a custom fallback model after a provider error', async () => {
		const modelId = 'auto/balanced';
		const fallbackId = 'combo/my-combo';
		const { context, model } = await setup(modelId, { options: { maxRetries: 0 } });
		const { model: fallback } = await setup(fallbackId);
		context.getInputConnectionData.mockImplementation(async (type) =>
			type === NodeConnectionTypes.AiLanguageModel ? [fallback, model] : undefined,
		);
		context.getNodeParameter.mockImplementation((name, _index, fallbackValue) => {
			if (name === 'needsFallback') return true;
			if (name === 'text') return 'Hello';
			return fallbackValue;
		});
		const primaryGateway = gatewayRequest(modelId).reply(404, {
			error: { message: 'Model unavailable' },
		});
		const fallbackGateway = gatewayRequest(fallbackId).reply(200, completionResponse(fallbackId));

		await expect(toolsAgentExecute.call(context)).resolves.toEqual(expectedOutput);
		expect(primaryGateway.isDone()).toBe(true);
		expect(fallbackGateway.isDone()).toBe(true);
	});

	it('keeps endpoints and credentials separate during concurrent requests', async () => {
		const modelId = 'auto/balanced';
		const otherCredentials = {
			apiKey: 'other-test-key',
			url: 'http://other-gateway.example/v1',
		};
		const { context } = await setup(modelId);
		const { context: otherContext } = await setup(modelId, {}, otherCredentials);
		const gateway = gatewayRequest(modelId).reply(200, completionResponse(modelId));
		const otherGateway = gatewayRequest(modelId, otherCredentials).reply(
			200,
			completionResponse(modelId),
		);

		await expect(
			Promise.all([toolsAgentExecute.call(context), toolsAgentExecute.call(otherContext)]),
		).resolves.toEqual([expectedOutput, expectedOutput]);
		expect(gateway.isDone()).toBe(true);
		expect(otherGateway.isDone()).toBe(true);
	});
});
