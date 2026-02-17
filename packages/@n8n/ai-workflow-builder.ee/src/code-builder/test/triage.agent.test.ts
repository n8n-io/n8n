import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage } from '@langchain/core/messages';

import type { AssistantHandler } from '@/assistant/assistant-handler';
import type { ConversationEntry } from '@/code-builder/utils/code-builder-session';
import type { StreamOutput } from '@/types/streaming';
import type { ChatPayload } from '@/workflow-builder-agent';

import { TriageAgent } from '../triage.agent';
import type { TriageAgentOutcome } from '../triage.agent';

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
	it('should execute ask_assistant, emit chunks, and derive outcome from state', async () => {
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
		const secondResponse = new AIMessage({ content: '' });

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

		// ask_assistant emits a "running" chunk then a bundled "completed + text" chunk.
		const runningChunk = chunks.find(
			(c) =>
				c.messages.length === 1 &&
				c.messages[0].type === 'tool' &&
				'status' in c.messages[0] &&
				c.messages[0].status === 'running',
		);
		expect(runningChunk).toBeDefined();

		const bundledChunk = chunks.find(
			(c) =>
				c.messages.length === 2 &&
				c.messages[0].type === 'tool' &&
				'status' in c.messages[0] &&
				c.messages[0].status === 'completed' &&
				c.messages[1].type === 'message' &&
				'text' in c.messages[1] &&
				c.messages[1].text === 'Assistant says hi',
		);
		expect(bundledChunk).toBeDefined();

		// Same toolCallId on running and completed
		const runningMsg = runningChunk!.messages[0] as Record<string, unknown>;
		const completedMsg = bundledChunk!.messages[0] as Record<string, unknown>;
		expect(runningMsg.toolCallId).toBeDefined();
		expect(runningMsg.toolCallId).toBe(completedMsg.toolCallId);

		// LLM called twice: once for ask_assistant, once for the follow-up (empty text = exit)
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
		expect(systemMessage.content).toContain('<conversation_history>');
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
		expect(systemMessage.content).not.toContain('<conversation_history>');
	});

	it('should suppress redundant LLM text when ask_assistant already handled the response', async () => {
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
			content: 'Based on the diagnosis, you need to re-authenticate.',
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
			buildWorkflow: createMockBuildWorkflow(),
		});
		const { chunks, result } = await collectGenerator(
			agent.run({ payload: createMockPayload(), userId: 'user-1' }),
		);

		// ask_assistant sets handledResponse — the LLM's follow-up text is suppressed
		expect(result.assistantSummary).toBe('Missing credentials error');
		expect(result.buildExecuted).toBeFalsy();
		expect(handler.execute).toHaveBeenCalledTimes(1);

		// Tool progress chunks (running + bundled completed+text) are still present
		const runningChunk = chunks.find(
			(c) =>
				c.messages.length === 1 &&
				c.messages[0].type === 'tool' &&
				'status' in c.messages[0] &&
				c.messages[0].status === 'running',
		);
		expect(runningChunk).toBeDefined();

		const bundledChunk = chunks.find(
			(c) =>
				c.messages.length === 2 &&
				c.messages[0].type === 'tool' &&
				'status' in c.messages[0] &&
				c.messages[0].status === 'completed',
		);
		expect(bundledChunk).toBeDefined();

		// The LLM's redundant follow-up text is NOT yielded
		const redundantTextChunk = chunks.find(
			(c) =>
				c.messages.length === 1 &&
				c.messages[0].type === 'message' &&
				'text' in c.messages[0] &&
				c.messages[0].text === 'Based on the diagnosis, you need to re-authenticate.',
		);
		expect(redundantTextChunk).toBeUndefined();

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
		const boundModel = (llm.bindTools as jest.Mock).mock.results[0].value;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(boundModel.invoke).toHaveBeenCalledTimes(2);
	});

	it('should emit transition text when LLM includes text alongside a tool call', async () => {
		const firstResponse = new AIMessage({
			content: 'Let me check that for you.',
			tool_calls: [
				{
					id: 'tc-1',
					name: 'ask_assistant',
					args: { query: 'How does the HTTP node work?' },
				},
			],
		});
		const secondResponse = new AIMessage({ content: '' });

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

		// Transition text IS yielded as an AgentMessageChunk
		const transitionChunk = chunks.find(
			(c) =>
				c.messages.length === 1 &&
				c.messages[0].type === 'message' &&
				'text' in c.messages[0] &&
				c.messages[0].text === 'Let me check that for you.',
		);
		expect(transitionChunk).toBeDefined();

		// ask_assistant tool chunks are also yielded
		const runningChunk = chunks.find(
			(c) =>
				c.messages.length === 1 &&
				c.messages[0].type === 'tool' &&
				'status' in c.messages[0] &&
				c.messages[0].status === 'running',
		);
		expect(runningChunk).toBeDefined();
	});

	it('should yield LLM text after unknown tool (handledResponse not set)', async () => {
		const firstResponse = new AIMessage({
			content: '',
			tool_calls: [
				{
					id: 'tc-1',
					name: 'unknown_tool',
					args: {},
				},
			],
		});
		const secondResponse = new AIMessage({
			content: 'Sorry, let me help directly.',
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
		const { chunks } = await collectGenerator(
			agent.run({ payload: createMockPayload(), userId: 'user-1' }),
		);

		// unknown_tool doesn't set handledResponse, so the LLM's text IS yielded
		const textChunk = chunks.find(
			(c) =>
				c.messages.length === 1 &&
				c.messages[0].type === 'message' &&
				'text' in c.messages[0] &&
				c.messages[0].text === 'Sorry, let me help directly.',
		);
		expect(textChunk).toBeDefined();
	});

	it('should return outcome with assistantSummary after ask_assistant followed by text', async () => {
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
		const textResponse = new AIMessage({ content: '' });

		const llm = createMockLlm([askResponse, textResponse]);
		const handler = createMockAssistantHandler();

		const agent = new TriageAgent({
			llm,
			assistantHandler: handler,
			buildWorkflow: createMockBuildWorkflow(),
		});
		const { result } = await collectGenerator(
			agent.run({ payload: createMockPayload(), userId: 'user-1' }),
		);

		// ask_assistant sets assistantSummary, then the LLM is called again
		expect(result.assistantSummary).toBe('Assistant says hi');
		expect(result.sdkSessionId).toBe('sdk-sess-1');
		expect(result.buildExecuted).toBeFalsy();
		expect(handler.execute).toHaveBeenCalledTimes(1);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
		const boundModel = (llm.bindTools as jest.Mock).mock.results[0].value;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(boundModel.invoke).toHaveBeenCalledTimes(2);
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

	it('should yield running tool chunk and bundled completed+text with matching toolCallId', async () => {
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

		// "running" tool chunk emitted immediately
		const runningChunks = chunks.filter(
			(c) =>
				c.messages.length === 1 &&
				c.messages[0].type === 'tool' &&
				'status' in c.messages[0] &&
				c.messages[0].status === 'running',
		);
		expect(runningChunks).toHaveLength(1);

		// "completed" bundled with text in a single StreamOutput
		const bundledChunk = chunks.find(
			(c) =>
				c.messages.length === 2 &&
				c.messages[0].type === 'tool' &&
				'status' in c.messages[0] &&
				c.messages[0].status === 'completed',
		);
		expect(bundledChunk).toBeDefined();
		expect(bundledChunk!.messages[1].type).toBe('message');
		expect('text' in bundledChunk!.messages[1] && bundledChunk!.messages[1].text).toBe(
			'Assistant says hi',
		);

		// Same toolCallId so frontend updates the running entry instead of creating a new one
		const runningMsg = runningChunks[0].messages[0] as Record<string, unknown>;
		const completedMsg = bundledChunk!.messages[0] as Record<string, unknown>;
		expect(runningMsg.toolCallId).toBeDefined();
		expect(runningMsg.toolCallId).toBe(completedMsg.toolCallId);
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

	it('should include selected nodes in system message when workflowContext has selectedNodes', async () => {
		const response = new AIMessage({ content: 'Noted.' });
		const llm = createMockLlm(response);
		const handler = createMockAssistantHandler();

		const agent = new TriageAgent({
			llm,
			assistantHandler: handler,
			buildWorkflow: createMockBuildWorkflow(),
		});
		await collectGenerator(
			agent.run({
				payload: {
					id: 'msg-1',
					message: 'fix this',
					workflowContext: {
						selectedNodes: [
							{
								name: 'HTTP Request',
								issues: {},
								incomingConnections: [],
								outgoingConnections: ['Slack'],
							},
						],
						currentWorkflow: {
							nodes: [
								{
									id: '1',
									name: 'HTTP Request',
									type: 'n8n-nodes-base.httpRequest',
									typeVersion: 1,
									position: [0, 0],
									parameters: {},
								},
								{
									id: '2',
									name: 'Slack',
									type: 'n8n-nodes-base.slack',
									typeVersion: 1,
									position: [200, 0],
									parameters: {},
								},
							],
							connections: {},
						},
					},
				},
				userId: 'user-1',
			}),
		);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
		const boundModel = (llm.bindTools as jest.Mock).mock.results[0].value;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
		const invokeArgs = (boundModel.invoke as jest.Mock).mock.calls[0][0];
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const systemMessage = invokeArgs[0];

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(systemMessage.content).toContain('<selected_nodes>');
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(systemMessage.content).toContain('HTTP Request');
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(systemMessage.content).toContain('<workflow_summary>');
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(systemMessage.content).toContain('Slack');
	});

	it('should include workflow summary without selected nodes when only workflow is present', async () => {
		const response = new AIMessage({ content: 'Noted.' });
		const llm = createMockLlm(response);
		const handler = createMockAssistantHandler();

		const agent = new TriageAgent({
			llm,
			assistantHandler: handler,
			buildWorkflow: createMockBuildWorkflow(),
		});
		await collectGenerator(
			agent.run({
				payload: {
					id: 'msg-1',
					message: 'add a node',
					workflowContext: {
						currentWorkflow: {
							nodes: [
								{
									id: '1',
									name: 'Webhook',
									type: 'n8n-nodes-base.webhook',
									typeVersion: 1,
									position: [0, 0],
									parameters: {},
								},
							],
							connections: {},
						},
					},
				},
				userId: 'user-1',
			}),
		);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
		const boundModel = (llm.bindTools as jest.Mock).mock.results[0].value;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
		const invokeArgs = (boundModel.invoke as jest.Mock).mock.calls[0][0];
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const systemMessage = invokeArgs[0];

		// No selected nodes data should appear (only the tag name reference in rules)
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(systemMessage.content).not.toContain('node(s) selected:');
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(systemMessage.content).toContain('existing nodes:');
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(systemMessage.content).toContain('Webhook');
	});

	it('should not include workflow context sections when no workflowContext is provided', async () => {
		const response = new AIMessage({ content: 'Reply.' });
		const llm = createMockLlm(response);
		const handler = createMockAssistantHandler();

		const agent = new TriageAgent({
			llm,
			assistantHandler: handler,
			buildWorkflow: createMockBuildWorkflow(),
		});
		await collectGenerator(agent.run({ payload: createMockPayload(), userId: 'user-1' }));

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
		const boundModel = (llm.bindTools as jest.Mock).mock.results[0].value;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
		const invokeArgs = (boundModel.invoke as jest.Mock).mock.calls[0][0];
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const systemMessage = invokeArgs[0];

		// No node names or workflow summary content should appear
		// (the rules section references <selected_nodes> as a tag name, but no actual node data)
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(systemMessage.content).not.toContain('existing nodes:');
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(systemMessage.content).not.toContain('node(s) selected:');
	});

	it('should run two-step diagnosis-then-fix: ask_assistant followed by build_workflow', async () => {
		const builderChunk: StreamOutput = {
			messages: [{ role: 'assistant', type: 'message', text: 'Built it' }],
		};

		// Two-step flow: ask_assistant diagnoses, then build_workflow applies the fix.
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

		const mockBuildWorkflow = jest.fn(createMockBuildWorkflow([builderChunk]));
		const llm = createMockLlm([firstResponse, secondResponse]);
		const handler = createMockAssistantHandler();

		const agent = new TriageAgent({
			llm,
			assistantHandler: handler,
			buildWorkflow: mockBuildWorkflow,
		});
		const { result } = await collectGenerator(
			agent.run({ payload: createMockPayload(), userId: 'user-1' }),
		);

		// Both assistant and build outcomes are set
		expect(result.assistantSummary).toBe('Assistant says hi');
		expect(result.buildExecuted).toBe(true);
		expect(handler.execute).toHaveBeenCalledTimes(1);

		// Builder receives enriched payload with diagnosis prepended
		expect(mockBuildWorkflow).toHaveBeenCalledTimes(1);
		const [enrichedPayload] = mockBuildWorkflow.mock.calls[0] as unknown as [ChatPayload];
		expect(enrichedPayload.message).toContain('[Diagnosis]: Assistant says hi');
		expect(enrichedPayload.message).toContain('test message');
	});
});
