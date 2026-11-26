import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type * as AiImport from 'ai';

import type { TitleGenerationConfig } from '../../types';
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

function createRuntime(memory: InMemoryMemory, titleGeneration: TitleGenerationConfig) {
	return new AgentRuntime({
		name: 'title-timing',
		model: MODEL,
		instructions: 'test',
		eventBus: new AgentEventBus(),
		memory,
		titleGeneration,
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

	it('makes no title call when the thread already has a title', async () => {
		const memory = new InMemoryMemory();
		await memory.saveThread({ id: 'thread-1', resourceId: 'user-1', title: 'Existing' });
		agentCall.mockResolvedValueOnce(agentReply);

		await createRuntime(memory, { sync: true }).generate(MESSAGE, { persistence });

		expect(titleCall).not.toHaveBeenCalled();
		expect((await memory.getThread(persistence.threadId))?.title).toBe('Existing');
	});
});
