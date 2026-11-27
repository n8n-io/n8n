import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type * as AiImport from 'ai';
import { z } from 'zod';

import type { BuiltTool, InterruptibleToolContext, TitleGenerationConfig } from '../../types';
import { AgentRuntime } from '../loop/agent-runtime';
import { InMemoryMemory } from '../memory/memory-store';
import { AgentEventBus } from '../state/event-bus';

vi.mock('@ai-sdk/anthropic', () => ({
	createAnthropic: () => (model: string) => ({
		provider: 'anthropic',
		modelId: model,
		specificationVersion: 'v3',
		supportedUrls: {},
	}),
}));

vi.mock(import('../../sdk/catalog.js'), async (importOriginal) => ({
	...(await importOriginal()),
	getModelCost: vi.fn().mockResolvedValue(undefined),
}));

type Call = Record<string, unknown>;

const { agentCall, titleCall } = vi.hoisted(() => ({
	agentCall: vi.fn<(call: Call) => Promise<Call>>(),
	titleCall: vi.fn<(call: Call) => Promise<Call>>(),
}));

vi.mock('ai', async () => {
	const actual = await vi.importActual<typeof AiImport>('ai');
	return {
		...actual,
		generateText: async (call: Call) => {
			const isTitle =
				typeof call.instructions === 'string' &&
				call.instructions.includes('Generate a short title');
			const result = await (isTitle ? titleCall : agentCall)(call);
			return { ...result, finalStep: { providerMetadata: undefined } };
		},
	};
});

const MODEL = 'anthropic/claude-sonnet-4-5';
const persistence = { threadId: 'thread-1', resourceId: 'user-1' };
const MESSAGE = 'Build a daily Berlin rain alert workflow';

const agentReply = {
	finishReason: 'stop',
	usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
	response: { messages: [{ role: 'assistant', content: [{ type: 'text', text: 'OK' }] }] },
	responseMessages: [{ role: 'assistant', content: [{ type: 'text', text: 'OK' }] }],
	toolCalls: [],
};

const titleReply = {
	text: '{"title":"Berlin rain alert","emoji":"🌧️"}',
	usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
};

const approvalTool: BuiltTool = {
	name: 'approve',
	description: 'Requires approval',
	inputSchema: z.object({ question: z.string() }),
	suspendSchema: z.object({ question: z.string() }),
	resumeSchema: z.object({ approved: z.boolean() }),
	handler: async (_input: unknown, ctx: unknown) => {
		const { suspend, resumeData } = ctx as InterruptibleToolContext;
		if (!resumeData) return await suspend({ question: 'approve?' });
		return { approved: true };
	},
};

const approvalMessages = [
	{
		role: 'assistant',
		content: [
			{
				type: 'tool-call',
				toolCallId: 'tc-1',
				toolName: 'approve',
				args: { question: 'continue?' },
				input: { question: 'continue?' },
			},
		],
	},
];

const approvalCall = {
	finishReason: 'tool-calls',
	usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
	response: { messages: approvalMessages },
	responseMessages: approvalMessages,
	toolCalls: [{ toolCallId: 'tc-1', toolName: 'approve', input: { question: 'continue?' } }],
};

function createRuntime(
	memory: InMemoryMemory,
	titleGeneration: TitleGenerationConfig,
	tools: BuiltTool[] = [],
) {
	return new AgentRuntime({
		name: 'title-timing',
		model: MODEL,
		instructions: 'test',
		eventBus: new AgentEventBus(),
		memory,
		titleGeneration,
		tools,
		checkpointStorage: 'memory',
	});
}

/** Resolves once the run has made its title call. */
function titleCallStarted() {
	const started = createDeferredPromise<true>();
	const reply = createDeferredPromise<Call>();
	titleCall.mockImplementationOnce(async () => {
		started.resolve(true);
		return await reply.promise;
	});
	return { started: started.promise, reply };
}

describe('AgentRuntime title generation timing', () => {
	beforeEach(() => {
		agentCall.mockReset();
		titleCall.mockReset();
	});

	it('stores the title while the agent loop still runs', async () => {
		const memory = new InMemoryMemory();
		const agentReplied = createDeferredPromise<Call>();
		agentCall.mockImplementationOnce(async () => await agentReplied.promise);
		titleCall.mockResolvedValueOnce(titleReply);

		const run = createRuntime(memory, {}).generate(MESSAGE, { persistence });

		await vi.waitFor(async () => {
			expect((await memory.getThread(persistence.threadId))?.title).toBe('Berlin rain alert');
		});
		expect(agentCall).toHaveBeenCalledTimes(1);

		agentReplied.resolve(agentReply);
		await expect(run).resolves.toMatchObject({ finishReason: 'stop' });
		expect(titleCall).toHaveBeenCalledTimes(1);
	});

	it('reports the title to the host while the agent loop still runs', async () => {
		const memory = new InMemoryMemory();
		const agentReplied = createDeferredPromise<Call>();
		agentCall.mockImplementationOnce(async () => await agentReplied.promise);
		titleCall.mockResolvedValueOnce(titleReply);
		const onThreadTitle = vi.fn();

		const run = createRuntime(memory, {}).generate(MESSAGE, { persistence, onThreadTitle });

		await vi.waitFor(() =>
			expect(onThreadTitle).toHaveBeenCalledWith({
				threadId: 'thread-1',
				title: 'Berlin rain alert',
				emoji: '🌧️',
			}),
		);
		agentReplied.resolve(agentReply);
		await run;
	});

	it('titles the text that the host gives, not the run input', async () => {
		const memory = new InMemoryMemory();
		agentCall.mockResolvedValueOnce(agentReply);
		titleCall.mockResolvedValueOnce(titleReply);

		await createRuntime(memory, { sync: true }).generate(
			`<thread-context>Today is Monday.</thread-context>\n\n${MESSAGE}`,
			{ persistence, titleText: MESSAGE },
		);

		const [titleArgs] = titleCall.mock.calls[0] as [{ messages: Array<{ content: string }> }];
		expect(titleArgs.messages[0].content).toContain(MESSAGE);
		expect(titleArgs.messages[0].content).not.toContain('thread-context');
	});

	it('does not wait for the title call when the title is not sync', async () => {
		const memory = new InMemoryMemory();
		agentCall.mockResolvedValueOnce(agentReply);
		const title = titleCallStarted();

		const result = await createRuntime(memory, {}).generate(MESSAGE, { persistence });

		expect(result.finishReason).toBe('stop');
		await title.started;
		expect((await memory.getThread(persistence.threadId))?.title).toBeFalsy();

		title.reply.resolve(titleReply);
		await vi.waitFor(async () => {
			expect((await memory.getThread(persistence.threadId))?.title).toBe('Berlin rain alert');
		});
	});

	it('completes a sync run only after the title is stored', async () => {
		const memory = new InMemoryMemory();
		agentCall.mockResolvedValueOnce(agentReply);
		const title = titleCallStarted();
		let finished = false;

		const run = createRuntime(memory, { sync: true })
			.generate(MESSAGE, { persistence })
			.finally(() => {
				finished = true;
			});

		await title.started;
		await vi.waitFor(() => expect(agentCall).toHaveBeenCalledTimes(1));
		expect(finished).toBe(false);

		title.reply.resolve(titleReply);
		await run;
		expect((await memory.getThread(persistence.threadId))?.title).toBe('Berlin rain alert');
	});

	it('stores a sync title before a suspended first turn returns', async () => {
		const memory = new InMemoryMemory();
		titleCall.mockResolvedValueOnce(titleReply);

		const result = await createRuntime(memory, { sync: true }).generate(MESSAGE, {
			persistence,
			shouldPause: async () => true,
		});

		expect(result.finishReason).toBe('paused');
		expect(agentCall).not.toHaveBeenCalled();
		expect((await memory.getThread(persistence.threadId))?.title).toBe('Berlin rain alert');
	});

	it('stores a sync title before a failed run returns', async () => {
		const memory = new InMemoryMemory();
		agentCall.mockRejectedValueOnce(new Error('model unavailable'));
		const title = titleCallStarted();
		let finished = false;

		const run = createRuntime(memory, { sync: true })
			.generate(MESSAGE, { persistence })
			.finally(() => {
				finished = true;
			});

		await title.started;
		await vi.waitFor(() => expect(agentCall).toHaveBeenCalledTimes(1));
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(finished).toBe(false);

		title.reply.resolve(titleReply);
		await expect(run).resolves.toMatchObject({ finishReason: 'error' });
		expect((await memory.getThread(persistence.threadId))?.title).toBe('Berlin rain alert');
	});

	it('tries the title again when a resumed run finds no title', async () => {
		const memory = new InMemoryMemory();
		const runtime = createRuntime(memory, { sync: true }, [approvalTool]);
		agentCall.mockResolvedValueOnce(approvalCall);
		titleCall.mockRejectedValueOnce(new Error('title model unavailable'));

		const first = await runtime.generate(MESSAGE, { persistence });
		expect((await memory.getThread(persistence.threadId))?.title).toBeFalsy();

		const { runId, toolCallId } = first.pendingSuspend![0];
		agentCall.mockResolvedValueOnce(agentReply);
		titleCall.mockResolvedValueOnce(titleReply);
		await runtime.resume('generate', { approved: true }, { runId, toolCallId });

		expect(titleCall).toHaveBeenCalledTimes(2);
		expect((await memory.getThread(persistence.threadId))?.title).toBe('Berlin rain alert');
	});

	it('titles the host text again when a resumed run retries the title', async () => {
		const memory = new InMemoryMemory();
		const runtime = createRuntime(memory, { sync: true }, [approvalTool]);
		agentCall.mockResolvedValueOnce(approvalCall);
		titleCall.mockRejectedValueOnce(new Error('title model unavailable'));

		const first = await runtime.generate(
			`<thread-context>Today is Monday.</thread-context>\n\n${MESSAGE}`,
			{ persistence, titleText: MESSAGE },
		);

		// The resume passes no `titleText`: the checkpoint keeps the one of the first run.
		const { runId, toolCallId } = first.pendingSuspend![0];
		agentCall.mockResolvedValueOnce(agentReply);
		titleCall.mockResolvedValueOnce(titleReply);
		await runtime.resume('generate', { approved: true }, { runId, toolCallId });

		const [retryArgs] = titleCall.mock.calls[1] as [{ messages: Array<{ content: string }> }];
		expect(retryArgs.messages[0].content).toContain(MESSAGE);
		expect(retryArgs.messages[0].content).not.toContain('thread-context');
	});

	it('makes no title call when the thread already has a title', async () => {
		const memory = new InMemoryMemory();
		await memory.saveThread({ id: 'thread-1', resourceId: 'user-1', title: 'Existing' });
		agentCall.mockResolvedValueOnce(agentReply);

		await createRuntime(memory, { sync: true }).generate(MESSAGE, { persistence });

		expect(titleCall).not.toHaveBeenCalled();
		expect((await memory.getThread(persistence.threadId))?.title).toBe('Existing');
	});
});
