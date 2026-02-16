import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage } from '@langchain/core/messages';

import type { ConversationEntry } from '../../code-builder/utils/code-builder-session';
import type { StreamOutput } from '../../types/streaming';
import type { ChatPayload } from '../../workflow-builder-agent';
import type { AssistantHandler } from '../assistant-handler';
import { TriageAgent } from '../triage-agent';
import type { TriageAgentOutcome } from '../triage-agent';

function createMockPayload(message = 'test message'): ChatPayload {
	return {
		id: 'msg-1',
		message,
	};
}

/**
 * Create a mock LLM that returns a sequence of responses (one per invoke call).
 * Supports the agent loop pattern where the LLM may be called multiple times.
 */
function createMockLlm(responses: AIMessage | AIMessage[]): BaseChatModel {
	const responseList = Array.isArray(responses) ? responses : [responses];
	let callIndex = 0;
	const boundModel = {
		invoke: jest.fn().mockImplementation(async () => {
			const response = responseList[callIndex] ?? responseList[responseList.length - 1];
			callIndex++;
			return response;
		}),
	};
	return {
		bindTools: jest.fn().mockReturnValue(boundModel),
	} as unknown as BaseChatModel;
}

function createMockAssistantHandler(
	result = {
		responseText: 'Assistant says hi',
		summary: 'Assistant says hi',
		sdkSessionId: 'sdk-sess-1',
		hasCodeDiff: false,
		suggestionIds: [],
	},
): AssistantHandler {
	return {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		execute: jest
			.fn()
			.mockImplementation(
				async (_ctx: unknown, _userId: unknown, writer: (chunk: unknown) => void) => {
					writer({
						role: 'assistant' as const,
						type: 'message' as const,
						text: result.responseText,
					});
					return result;
				},
			),
	} as unknown as AssistantHandler;
}

/**
 * Create a mock buildWorkflow function that yields a sequence of chunks.
 */
function createMockBuildWorkflow(
	chunks: StreamOutput[] = [],
): (
	payload: ChatPayload,
	userId: string,
	abortSignal?: AbortSignal,
) => AsyncIterable<StreamOutput> {
	return async function* () {
		for (const chunk of chunks) {
			yield chunk;
		}
	};
}

/**
 * Collect all yielded StreamOutput chunks and the final return value from the generator.
 */
async function collectGenerator(
	gen: AsyncGenerator<StreamOutput, TriageAgentOutcome>,
): Promise<{ chunks: StreamOutput[]; result: TriageAgentOutcome }> {
	const chunks: StreamOutput[] = [];
	let iterResult = await gen.next();
	while (!iterResult.done) {
		chunks.push(iterResult.value);
		iterResult = await gen.next();
	}
	return { chunks, result: iterResult.value };
}

describe('TriageAgent', () => {
	it('should execute ask_assistant, push ToolMessage, then derive outcome from state', async () => {
		const firstResponse = new AIMessage({
			content: '',
			tool_calls: [
				{
					id: 'tc-1',
					name: 'ask_assistant',
					args: { query: 'How do I use the HTTP node?' },
				},
			],
		});
		const secondResponse = new AIMessage({
			content: 'Based on the assistant response, here is more info.',
		});

		const llm = createMockLlm([firstResponse, secondResponse]);
		const handler = createMockAssistantHandler();

		const agent = new TriageAgent({
			llm,
			assistantHandler: handler,
			buildWorkflow: createMockBuildWorkflow(),
		});
		const { chunks, result } = await collectGenerator(
			agent.run({ payload: createMockPayload(), userId: 'user-1' }),
		);

		expect(result.assistantSummary).toBe('Assistant says hi');
		expect(result.sdkSessionId).toBe('sdk-sess-1');
		expect(result.buildExecuted).toBeFalsy();
		expect(handler.execute).toHaveBeenCalledTimes(1);

		const toolRunning = chunks.find(
			(c) =>
				c.messages[0].type === 'tool' &&
				'status' in c.messages[0] &&
				c.messages[0].status === 'running',
		);
		const toolCompleted = chunks.find(
			(c) =>
				c.messages[0].type === 'tool' &&
				'status' in c.messages[0] &&
				c.messages[0].status === 'completed',
		);
		const textChunk = chunks.find(
			(c) =>
				c.messages[0].type === 'message' &&
				'text' in c.messages[0] &&
				c.messages[0].text === 'Based on the assistant response, here is more info.',
		);

		expect(toolRunning).toBeDefined();
		expect(toolCompleted).toBeDefined();
		expect(textChunk).toBeDefined();

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
		const boundModel = (llm.bindTools as jest.Mock).mock.results[0].value;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(boundModel.invoke).toHaveBeenCalledTimes(2);
	});

	it('should execute build_workflow, yield builder chunks, and set buildExecuted', async () => {
		const builderChunk: StreamOutput = {
			messages: [{ role: 'assistant', type: 'message', text: 'Built workflow' }],
		};

		const response = new AIMessage({
			content: '',
			tool_calls: [
				{
					id: 'tc-2',
					name: 'build_workflow',
					args: { instructions: 'Create a Slack notification workflow' },
				},
			],
		});
		const llm = createMockLlm(response);
		const handler = createMockAssistantHandler();

		const agent = new TriageAgent({
			llm,
			assistantHandler: handler,
			buildWorkflow: createMockBuildWorkflow([builderChunk]),
		});
		const { chunks, result } = await collectGenerator(
			agent.run({ payload: createMockPayload(), userId: 'user-1' }),
		);

		expect(result.buildExecuted).toBe(true);
		expect(result.assistantSummary).toBeUndefined();
		expect(chunks).toHaveLength(1);
		expect(chunks[0]).toEqual(builderChunk);
		expect(handler.execute).not.toHaveBeenCalled();
	});

	it('should yield text as AgentMessageChunk and return outcome with no fields set', async () => {
		const response = new AIMessage({
			content: 'Here is a plan: first we add a trigger, then a Slack node.',
		});
		const llm = createMockLlm(response);
		const handler = createMockAssistantHandler();

		const agent = new TriageAgent({
			llm,
			assistantHandler: handler,
			buildWorkflow: createMockBuildWorkflow(),
		});
		const { chunks, result } = await collectGenerator(
			agent.run({ payload: createMockPayload(), userId: 'user-1' }),
		);

		expect(result.buildExecuted).toBeFalsy();
		expect(result.assistantSummary).toBeUndefined();
		expect(chunks).toHaveLength(1);
		expect(chunks[0].messages[0]).toEqual(
			expect.objectContaining({
				role: 'assistant',
				type: 'message',
				text: 'Here is a plan: first we add a trigger, then a Slack node.',
			}),
		);
		expect(handler.execute).not.toHaveBeenCalled();
	});

	it('should handle empty response gracefully and return empty outcome', async () => {
		const response = new AIMessage({ content: '' });
		const llm = createMockLlm(response);
		const handler = createMockAssistantHandler();

		const agent = new TriageAgent({
			llm,
			assistantHandler: handler,
			buildWorkflow: createMockBuildWorkflow(),
		});
		const { chunks, result } = await collectGenerator(
			agent.run({ payload: createMockPayload(), userId: 'user-1' }),
		);

		expect(result.buildExecuted).toBeFalsy();
		expect(result.assistantSummary).toBeUndefined();
		expect(chunks).toHaveLength(0);
		expect(handler.execute).not.toHaveBeenCalled();
	});

	it('should pass sdkSessionId to assistant handler and return it', async () => {
		const firstResponse = new AIMessage({
			content: '',
			tool_calls: [
				{
					id: 'tc-3',
					name: 'ask_assistant',
					args: { query: 'Follow up question' },
				},
			],
		});
		const secondResponse = new AIMessage({
			content: 'Got it.',
		});

		const llm = createMockLlm([firstResponse, secondResponse]);
		const handler = createMockAssistantHandler({
			responseText: 'Follow up answer',
			summary: 'Follow up answer',
			sdkSessionId: 'sdk-sess-existing',
			hasCodeDiff: false,
			suggestionIds: [],
		});

		const agent = new TriageAgent({
			llm,
			assistantHandler: handler,
			buildWorkflow: createMockBuildWorkflow(),
		});
		await collectGenerator(
			agent.run({
				payload: createMockPayload('Follow up question'),
				userId: 'user-1',
				sdkSessionId: 'sdk-sess-prev',
			}),
		);

		const executeCall = (handler.execute as jest.Mock).mock.calls[0];
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(executeCall[0].sdkSessionId).toBe('sdk-sess-prev');
	});

	it('should push error ToolMessage for unknown tools and let LLM retry', async () => {
		const firstResponse = new AIMessage({
			content: '',
			tool_calls: [
				{
					id: 'tc-4',
					name: 'unknown_tool',
					args: { foo: 'bar' },
				},
			],
		});
		const secondResponse = new AIMessage({
			content: '',
			tool_calls: [
				{
					id: 'tc-5',
					name: 'build_workflow',
					args: { instructions: 'Build it' },
				},
			],
		});

		const llm = createMockLlm([firstResponse, secondResponse]);
		const handler = createMockAssistantHandler();
		const mockLogger = { warn: jest.fn(), debug: jest.fn() };

		const agent = new TriageAgent({
			llm,
			assistantHandler: handler,
			buildWorkflow: createMockBuildWorkflow(),
			logger: mockLogger as unknown as TriageAgent extends { logger?: infer L } ? L : never,
		});
		const { result } = await collectGenerator(
			agent.run({ payload: createMockPayload(), userId: 'user-1' }),
		);

		expect(result.buildExecuted).toBe(true);
		expect(handler.execute).not.toHaveBeenCalled();
		expect(mockLogger.warn).toHaveBeenCalledWith(
			expect.stringContaining('Unknown tool call'),
			expect.objectContaining({ toolName: 'unknown_tool' }),
		);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
		const boundModel = (llm.bindTools as jest.Mock).mock.results[0].value;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(boundModel.invoke).toHaveBeenCalledTimes(2);
	});

	it('should include conversation history in LLM system message when provided', async () => {
		const response = new AIMessage({ content: 'Noted context.' });
		const llm = createMockLlm(response);
		const handler = createMockAssistantHandler();

		const history: ConversationEntry[] = [
			{ type: 'build-request', message: 'Build a Slack workflow' },
			{ type: 'assistant-exchange', userQuery: 'How?', assistantSummary: 'Use Slack node' },
		];

		const agent = new TriageAgent({
			llm,
			assistantHandler: handler,
			buildWorkflow: createMockBuildWorkflow(),
		});
		await collectGenerator(
			agent.run({
				payload: createMockPayload('Next step?'),
				userId: 'user-1',
				conversationHistory: history,
			}),
		);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
		const boundModel = (llm.bindTools as jest.Mock).mock.results[0].value;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
		const invokeArgs = (boundModel.invoke as jest.Mock).mock.calls[0][0];
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const systemMessage = invokeArgs[0];

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(systemMessage.content).toContain('Conversation history:');
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(systemMessage.content).toContain('Build a Slack workflow');
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(systemMessage.content).toContain('[Help] Q: How?');
	});

	it('should not include conversation history section when empty', async () => {
		const response = new AIMessage({ content: 'Reply.' });
		const llm = createMockLlm(response);
		const handler = createMockAssistantHandler();

		const agent = new TriageAgent({
			llm,
			assistantHandler: handler,
			buildWorkflow: createMockBuildWorkflow(),
		});
		await collectGenerator(
			agent.run({
				payload: createMockPayload(),
				userId: 'user-1',
				conversationHistory: [],
			}),
		);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
		const boundModel = (llm.bindTools as jest.Mock).mock.results[0].value;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
		const invokeArgs = (boundModel.invoke as jest.Mock).mock.calls[0][0];
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const systemMessage = invokeArgs[0];

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(systemMessage.content).not.toContain('Conversation history:');
	});

	it('should support multi-step: ask_assistant -> see result -> build_workflow', async () => {
		const builderChunk: StreamOutput = {
			messages: [{ role: 'assistant', type: 'message', text: 'Built the fix' }],
		};

		const firstResponse = new AIMessage({
			content: '',
			tool_calls: [
				{
					id: 'tc-1',
					name: 'ask_assistant',
					args: { query: 'How do I fix the Google Sheets error?' },
				},
			],
		});
		const secondResponse = new AIMessage({
			content: '',
			tool_calls: [
				{
					id: 'tc-2',
					name: 'build_workflow',
					args: { instructions: 'Fix the Google Sheets node based on the error' },
				},
			],
		});

		const llm = createMockLlm([firstResponse, secondResponse]);
		const handler = createMockAssistantHandler({
			responseText: 'The error is caused by missing credentials',
			summary: 'Missing credentials error',
			sdkSessionId: 'sdk-sess-1',
			hasCodeDiff: false,
			suggestionIds: [],
		});

		const agent = new TriageAgent({
			llm,
			assistantHandler: handler,
			buildWorkflow: createMockBuildWorkflow([builderChunk]),
		});
		const { chunks, result } = await collectGenerator(
			agent.run({ payload: createMockPayload(), userId: 'user-1' }),
		);

		expect(result.buildExecuted).toBe(true);
		expect(handler.execute).toHaveBeenCalledTimes(1);

		expect(chunks.some((c) => c === builderChunk)).toBe(true);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
		const boundModel = (llm.bindTools as jest.Mock).mock.results[0].value;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(boundModel.invoke).toHaveBeenCalledTimes(2);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
		const secondCallMessages = (boundModel.invoke as jest.Mock).mock.calls[1][0];
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
		const toolMessage = secondCallMessages.find(
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			(m: { constructor: { name: string }; content: string }) =>
				m.constructor.name === 'ToolMessage',
		);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(toolMessage?.content).toBe('Missing credentials error');
	});

	it('should return outcome with assistantSummary when max iterations reached', async () => {
		const askResponse = new AIMessage({
			content: '',
			tool_calls: [
				{
					id: 'tc-loop',
					name: 'ask_assistant',
					args: { query: 'More help' },
				},
			],
		});

		const llm = createMockLlm([askResponse]);
		const handler = createMockAssistantHandler();

		const agent = new TriageAgent({
			llm,
			assistantHandler: handler,
			buildWorkflow: createMockBuildWorkflow(),
		});
		const { result } = await collectGenerator(
			agent.run({ payload: createMockPayload(), userId: 'user-1' }),
		);

		expect(result.assistantSummary).toBe('Assistant says hi');
		expect(result.sdkSessionId).toBe('sdk-sess-1');
		expect(result.buildExecuted).toBeFalsy();
		expect(handler.execute).toHaveBeenCalledTimes(10);
	});

	it('should return empty outcome when max iterations reached without state', async () => {
		const unknownResponse = new AIMessage({
			content: '',
			tool_calls: [
				{
					id: 'tc-unknown',
					name: 'unknown_tool',
					args: {},
				},
			],
		});

		const llm = createMockLlm([unknownResponse]);
		const handler = createMockAssistantHandler();
		const mockLogger = { warn: jest.fn(), debug: jest.fn() };

		const agent = new TriageAgent({
			llm,
			assistantHandler: handler,
			buildWorkflow: createMockBuildWorkflow(),
			logger: mockLogger as unknown as TriageAgent extends { logger?: infer L } ? L : never,
		});
		const { result } = await collectGenerator(
			agent.run({ payload: createMockPayload(), userId: 'user-1' }),
		);

		expect(result.buildExecuted).toBeFalsy();
		expect(result.assistantSummary).toBeUndefined();
		expect(handler.execute).not.toHaveBeenCalled();
		expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Max iterations reached'));
	});

	it('should yield running and completed tool progress chunks for ask_assistant', async () => {
		const firstResponse = new AIMessage({
			content: '',
			tool_calls: [
				{
					id: 'tc-1',
					name: 'ask_assistant',
					args: { query: 'Help me' },
				},
			],
		});
		const secondResponse = new AIMessage({ content: 'Done.' });

		const llm = createMockLlm([firstResponse, secondResponse]);
		const handler = createMockAssistantHandler();

		const agent = new TriageAgent({
			llm,
			assistantHandler: handler,
			buildWorkflow: createMockBuildWorkflow(),
		});
		const { chunks } = await collectGenerator(
			agent.run({ payload: createMockPayload(), userId: 'user-1' }),
		);

		const toolChunks = chunks.filter((c) => c.messages[0].type === 'tool');
		expect(toolChunks.length).toBeGreaterThanOrEqual(2);

		const statuses = toolChunks.map((c) => {
			const msg = c.messages[0];
			return 'status' in msg ? msg.status : undefined;
		});
		expect(statuses).toContain('running');
		expect(statuses).toContain('completed');
	});

	it('should bind schema-only tools to the LLM', async () => {
		const response = new AIMessage({ content: 'Hi' });
		const llm = createMockLlm(response);
		const handler = createMockAssistantHandler();

		const agent = new TriageAgent({
			llm,
			assistantHandler: handler,
			buildWorkflow: createMockBuildWorkflow(),
		});
		await collectGenerator(agent.run({ payload: createMockPayload(), userId: 'user-1' }));

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
		const bindToolsCall = (llm.bindTools as jest.Mock).mock.calls[0][0];
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(bindToolsCall[0].name).toBe('ask_assistant');
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(bindToolsCall[1].name).toBe('build_workflow');

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(bindToolsCall[0].schema).toBeDefined();
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(bindToolsCall[0].invoke).toBeUndefined();
	});

	it('should propagate errors from buildWorkflow to the consumer', async () => {
		const response = new AIMessage({
			content: '',
			tool_calls: [
				{
					id: 'tc-err-1',
					name: 'build_workflow',
					args: { instructions: 'Build it' },
				},
			],
		});

		const llm = createMockLlm(response);
		const handler = createMockAssistantHandler();
		const buildError = new Error('Build failed: internal error');

		const failingBuildWorkflow = (
			_payload: ChatPayload,
			_userId: string,
			_abortSignal?: AbortSignal,
		): AsyncIterable<StreamOutput> => ({
			[Symbol.asyncIterator]: () => ({
				async next(): Promise<IteratorResult<StreamOutput>> {
					throw buildError;
				},
			}),
		});

		const agent = new TriageAgent({
			llm,
			assistantHandler: handler,
			buildWorkflow: failingBuildWorkflow,
		});

		await expect(
			collectGenerator(agent.run({ payload: createMockPayload(), userId: 'user-1' })),
		).rejects.toThrow('Build failed: internal error');
	});

	it('should propagate errors from assistantHandler.execute() to the consumer', async () => {
		const response = new AIMessage({
			content: '',
			tool_calls: [
				{
					id: 'tc-err-2',
					name: 'ask_assistant',
					args: { query: 'Help me' },
				},
			],
		});

		const llm = createMockLlm(response);
		const handlerError = new Error('Assistant service unavailable');
		const handler = {
			execute: jest.fn().mockRejectedValue(handlerError),
		} as unknown as AssistantHandler;

		const agent = new TriageAgent({
			llm,
			assistantHandler: handler,
			buildWorkflow: createMockBuildWorkflow(),
		});

		await expect(
			collectGenerator(agent.run({ payload: createMockPayload(), userId: 'user-1' })),
		).rejects.toThrow('Assistant service unavailable');
	});

	it('should prioritize build_workflow over ask_assistant in outcome', async () => {
		const builderChunk: StreamOutput = {
			messages: [{ role: 'assistant', type: 'message', text: 'Built it' }],
		};

		const firstResponse = new AIMessage({
			content: '',
			tool_calls: [
				{
					id: 'tc-1',
					name: 'ask_assistant',
					args: { query: 'What is this workflow doing?' },
				},
			],
		});
		const secondResponse = new AIMessage({
			content: '',
			tool_calls: [
				{
					id: 'tc-2',
					name: 'build_workflow',
					args: { instructions: 'Now build it' },
				},
			],
		});

		const llm = createMockLlm([firstResponse, secondResponse]);
		const handler = createMockAssistantHandler();

		const agent = new TriageAgent({
			llm,
			assistantHandler: handler,
			buildWorkflow: createMockBuildWorkflow([builderChunk]),
		});
		const { result } = await collectGenerator(
			agent.run({ payload: createMockPayload(), userId: 'user-1' }),
		);

		expect(result.buildExecuted).toBe(true);
		expect(handler.execute).toHaveBeenCalledTimes(1);
	});
});
