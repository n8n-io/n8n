import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage } from '@langchain/core/messages';

import type { AssistantHandler } from '@/assistant/assistant-handler';
import type { ConversationEntry } from '@/code-builder/utils/code-builder-session';
import type { StreamOutput } from '@/types/streaming';
import type { ChatPayload } from '@/workflow-builder-agent';

import { TriageAgent } from '../triage.agent';
import type { TriageAgentOutcome } from '../triage.agent';

function createMockPayload(
	message = 'test message',
	featureFlags?: ChatPayload['featureFlags'],
): ChatPayload {
	return {
		id: 'msg-1',
		message,
		featureFlags: featureFlags ?? { mergeAskBuild: true },
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
		const response = new AIMessage({
			content: '',
			tool_calls: [
				{
					id: 'tc-1',
					name: 'ask_assistant',
					args: { query: 'How do I use the HTTP node?' },
				},
			],
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

		expect(result.assistantSummary).toBe('Assistant says hi');
		expect(result.sdkSessionId).toBe('sdk-sess-1');
		expect(result.buildExecuted).toBeFalsy();
		expect(handler.execute).toHaveBeenCalledTimes(1);

		// ask_assistant emits a "running" chunk then a bundled "completed + text" chunk.
		// endLoop: true exits immediately — the LLM is NOT called again.
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

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
		const boundModel = (llm.bindTools as jest.Mock).mock.results[0].value;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(boundModel.invoke).toHaveBeenCalledTimes(1);
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

	it('should exit loop after ask_assistant without calling LLM again', async () => {
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
			content: 'This should never be reached',
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
		const { result } = await collectGenerator(
			agent.run({ payload: createMockPayload(), userId: 'user-1' }),
		);

		// ask_assistant has endLoop: true — the loop exits and the LLM is
		// NOT called a second time, avoiding a duplicate answer.
		expect(result.assistantSummary).toBe('Missing credentials error');
		expect(result.buildExecuted).toBeFalsy();
		expect(handler.execute).toHaveBeenCalledTimes(1);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
		const boundModel = (llm.bindTools as jest.Mock).mock.results[0].value;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(boundModel.invoke).toHaveBeenCalledTimes(1);
	});

	it('should return outcome with assistantSummary after single ask_assistant call', async () => {
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

		// ask_assistant exits the loop immediately (endLoop: true)
		expect(result.assistantSummary).toBe('Assistant says hi');
		expect(result.sdkSessionId).toBe('sdk-sess-1');
		expect(result.buildExecuted).toBeFalsy();
		expect(handler.execute).toHaveBeenCalledTimes(1);
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

	it('should set assistantSummary but not buildExecuted when ask_assistant is called', async () => {
		const builderChunk: StreamOutput = {
			messages: [{ role: 'assistant', type: 'message', text: 'Built it' }],
		};

		// Even though a second response with build_workflow exists, the loop
		// exits after ask_assistant (endLoop: true), so it is never reached.
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

		expect(result.assistantSummary).toBe('Assistant says hi');
		expect(result.buildExecuted).toBeFalsy();
		expect(handler.execute).toHaveBeenCalledTimes(1);
	});

	it('should only bind build_workflow when mergeAskBuild flag is off', async () => {
		const response = new AIMessage({ content: 'Hi' });
		const llm = createMockLlm(response);
		const handler = createMockAssistantHandler();

		const agent = new TriageAgent({
			llm,
			assistantHandler: handler,
			buildWorkflow: createMockBuildWorkflow(),
		});
		await collectGenerator(
			agent.run({
				payload: createMockPayload('test', { mergeAskBuild: false }),
				userId: 'user-1',
			}),
		);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
		const bindToolsCall = (llm.bindTools as jest.Mock).mock.calls[0][0];
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(bindToolsCall).toHaveLength(1);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		expect(bindToolsCall[0].name).toBe('build_workflow');
	});
});
