import * as aiModule from 'ai';
import type { Mock } from 'vitest';

import { InMemoryMemory } from '../../runtime/memory/memory-store';
import type {
	MemoryTaskEvent,
	ScopedMemoryTaskEvent,
} from '../../runtime/memory/scoped-memory-task-runner';
import type { SideCallUsageReport } from '../../types/sdk/agent';
import { Agent } from '../agent';
import { Memory } from '../memory';

vi.mock(import('../catalog.js'), async (importOriginal) => ({
	...(await importOriginal()),
	getModelCost: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@ai-sdk/openai', async (importOriginal) => ({
	...(await importOriginal<typeof import('@ai-sdk/openai')>()),
	createOpenAI: () =>
		Object.assign(
			() => ({
				provider: 'openai',
				modelId: 'mock',
				specificationVersion: 'v3',
				supportedUrls: {},
			}),
			{
				chat: () => ({
					provider: 'openai',
					modelId: 'mock',
					specificationVersion: 'v3',
					supportedUrls: {},
				}),
				embeddingModel: () => ({ provider: 'openai', modelId: 'mock', specificationVersion: 'v2' }),
			},
		),
}));

type AiImport = typeof import('ai');

vi.mock('ai', async () => {
	const actual = await vi.importActual<AiImport>('ai');
	return { ...actual, embed: vi.fn(), embedMany: vi.fn(), generateText: vi.fn() };
});

const { generateText, embedMany } = aiModule as unknown as {
	generateText: Mock;
	embedMany: Mock;
};

const PERSISTENCE = { threadId: 'thread-1', resourceId: 'resource-1' };

function makeGenerateSuccess(text: string) {
	return {
		finishReason: 'stop',
		usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
		responseMessages: [{ role: 'assistant', content: [{ type: 'text', text }] }],
		finalStep: { providerMetadata: undefined },
		toolCalls: [],
	};
}

/** An episodic Agent with one pending candidate, whose embedding waits for `release`. */
async function setUpEpisodicAgent(
	onSideCallUsage?: (report: SideCallUsageReport) => Promise<void>,
) {
	const store = new InMemoryMemory();
	await store.episodic.enqueueCaptureCandidate({
		...PERSISTENCE,
		sourceMessageId: null,
		runId: 'run-earlier',
		toolCallId: 'tc-1',
		content: 'The user is allergic to peanuts.',
		evidenceText: 'allergic to peanuts',
		kind: 'fact',
	});
	let release!: () => void;
	const embeddingGate = new Promise<void>((resolve) => (release = resolve));
	embedMany.mockImplementation(async () => {
		await embeddingGate;
		return { embeddings: [[1, 0]], usage: { tokens: 1 } };
	});
	generateText.mockResolvedValue(makeGenerateSuccess('Hello there'));

	const events: MemoryTaskEvent[] = [];
	let markStarted!: () => void;
	const started = new Promise<void>((resolve) => (markStarted = resolve));
	const agent = new Agent('memory-agent')
		.model('openai/gpt-4o-mini')
		.instructions('You are a test assistant.')
		.memory(
			new Memory()
				.storage(store)
				.episodicMemory({ embeddingProviderOptions: { apiKey: 'embedding-key' } }),
		)
		.allMemoryTasksObserver((event) => {
			events.push(event);
			if (event.type === 'started' && event.task.taskKind === 'episodic') markStarted();
		});

	const run = agent.generate('Hi', { persistence: PERSISTENCE, onSideCallUsage });
	await started;
	return { agent, store, run, release, events };
}

async function pendingCandidates(store: InMemoryMemory) {
	return await store.episodic.getPendingCaptureCandidates(PERSISTENCE);
}

describe('Agent.waitForBackgroundTasks', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('resolves at once when no background task is in flight', async () => {
		const agent = new Agent('idle').model('openai/gpt-4o-mini').instructions('test');

		await expect(agent.waitForBackgroundTasks({ timeoutMs: 50 })).resolves.toBeUndefined();
	});

	it('resolves only after a scheduled episodic memory task finishes', async () => {
		const { agent, store, run, release } = await setUpEpisodicAgent();
		let settled = false;

		const waiting = agent.waitForBackgroundTasks({ timeoutMs: 5_000 }).then(() => {
			settled = true;
		});
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(settled).toBe(false);

		release();
		await waiting;
		expect(await pendingCandidates(store)).toEqual([]);
		await run;
	});

	it('rejects on timeout with the memory tasks still in flight', async () => {
		const { agent, run, release } = await setUpEpisodicAgent();

		await expect(agent.waitForBackgroundTasks({ timeoutMs: 20 })).rejects.toMatchObject({
			inFlightTasks: [
				expect.objectContaining({
					taskKind: 'episodic',
					status: 'running',
					observationScopeId: 'resource-1',
				}),
			],
		});

		release();
		await run;
	});

	it('does not dispose the agent: a second generate still works', async () => {
		const { agent, run, release } = await setUpEpisodicAgent();
		release();
		await agent.waitForBackgroundTasks({ timeoutMs: 5_000 });
		await run;

		generateText.mockResolvedValue(makeGenerateSuccess('Second reply'));
		const second = await agent.generate('Again', { persistence: PERSISTENCE });

		expect(second.finishReason).toBe('stop');
	});

	it('reports episodic memory tasks to allMemoryTasksObserver', async () => {
		const { agent, run, release, events } = await setUpEpisodicAgent();
		release();
		await agent.waitForBackgroundTasks({ timeoutMs: 5_000 });
		await run;

		const episodic = events.filter((event) => event.task.taskKind === 'episodic');
		expect(episodic.map((event) => event.type)).toEqual(['queued', 'started', 'completed']);
	});

	it('waits for the side-call usage reports of memory tasks', async () => {
		let releaseReport!: () => void;
		const reportGate = new Promise<void>((resolve) => (releaseReport = resolve));
		const reports: SideCallUsageReport[] = [];
		const { agent, run, release } = await setUpEpisodicAgent(async (report) => {
			await reportGate;
			reports.push(report);
		});
		let settled = false;

		const waiting = agent.waitForBackgroundTasks({ timeoutMs: 5_000 }).then(() => {
			settled = true;
		});
		release();
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(settled).toBe(false);

		releaseReport();
		await waiting;
		await run;
		expect(reports.map((report) => report.task)).toContain('episodic');
	});

	it('keeps episodic events from an observer that did not ask for them', async () => {
		const store = new InMemoryMemory();
		await store.episodic.enqueueCaptureCandidate({
			...PERSISTENCE,
			sourceMessageId: null,
			runId: 'run-earlier',
			toolCallId: 'tc-1',
			content: 'The user is allergic to peanuts.',
			evidenceText: 'allergic to peanuts',
			kind: 'fact',
		});
		embedMany.mockResolvedValue({ embeddings: [[1, 0]], usage: { tokens: 1 } });
		generateText.mockResolvedValue(makeGenerateSuccess('Hello there'));
		const observed: ScopedMemoryTaskEvent[] = [];
		const agent = new Agent('memory-agent')
			.model('openai/gpt-4o-mini')
			.instructions('You are a test assistant.')
			.memory(
				new Memory()
					.storage(store)
					.episodicMemory({ embeddingProviderOptions: { apiKey: 'embedding-key' } }),
			)
			.memoryTaskObserver((event: ScopedMemoryTaskEvent) => observed.push(event));

		await agent.generate('Hi', { persistence: PERSISTENCE });
		await agent.waitForBackgroundTasks({ timeoutMs: 5_000 });

		expect(await pendingCandidates(store)).toEqual([]);
		expect(observed.map((event) => event.task.taskKind)).not.toContain('episodic');
	});
});
