import { APICallError } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';

import type { ExecutionOptions, RunOptions } from '../../types/sdk/agent';
import type { AgentRuntimeConfig } from '../loop/agent-runtime';
import { MemoryOrchestrator } from '../memory/memory-orchestrator';
import { InMemoryMemory } from '../memory/memory-store';
import {
	createObservationLogObserveFn,
	DEFAULT_OBSERVATION_LOG_OBSERVER_MAX_RETRIES,
} from '../memory/observation-log-defaults';
import type { ScopedMemoryTaskEvent } from '../memory/scoped-memory-task-runner';
import { AgentMessageList } from '../model/message-list';
import { BackgroundTaskTracker } from '../state/background-task-tracker';
import { AgentEventBus } from '../state/event-bus';
import { RuntimeTelemetry } from '../telemetry/runtime-telemetry';

type GenerateResult = Awaited<ReturnType<MockLanguageModelV3['doGenerate']>>;

const THREAD_ID = 'thread-1';
const RESOURCE_ID = 'user-1';
// Covers the SDK backoff for every retry (2s, 4s, 8s) with room to spare.
const BACKOFF_WINDOW_MS = 60_000;

function apiError(statusCode: number): APICallError {
	return new APICallError({
		message: `Provider returned ${statusCode}`,
		url: 'https://provider.test/v1/messages',
		requestBodyValues: {},
		statusCode,
	});
}

function textResult(text: string): GenerateResult {
	return {
		content: [{ type: 'text', text }],
		finishReason: { unified: 'stop', raw: 'stop' },
		usage: {
			inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
			outputTokens: { total: 5, text: 5, reasoning: 0 },
		},
		warnings: [],
	};
}

function runOptions(): RunOptions & ExecutionOptions {
	return { persistence: { threadId: THREAD_ID, resourceId: RESOURCE_ID } };
}

function setup(doGenerate: () => Promise<GenerateResult>) {
	const store = new InMemoryMemory();
	const model = new MockLanguageModelV3({ doGenerate });
	const events: ScopedMemoryTaskEvent[] = [];
	const config = {
		name: 'observer-retry-agent',
		memory: store,
		observationalMemory: {
			observerThresholdTokens: 10,
			observationLogTailLimit: 20,
			observe: createObservationLogObserveFn(model),
		},
		onMemoryTaskEvent: (event: ScopedMemoryTaskEvent) => events.push(event),
	} as unknown as AgentRuntimeConfig;
	const tracker = new BackgroundTaskTracker();
	const orchestrator = new MemoryOrchestrator(
		config,
		tracker,
		new AgentEventBus(),
		new RuntimeTelemetry(config),
		async (text) => await Promise.resolve(text.length),
	);
	return { store, model, events, orchestrator, tracker };
}

/** Run one mid-run boundary and let the SDK retry backoff elapse. */
async function observeMidRun(
	orchestrator: MemoryOrchestrator,
	list: AgentMessageList,
): Promise<void> {
	const boundary = orchestrator.maybeObserveMidRun(list, runOptions());
	await vi.advanceTimersByTimeAsync(BACKOFF_WINDOW_MS);
	await boundary;
}

function turn(text: string): AgentMessageList {
	const list = new AgentMessageList();
	list.addInput([{ role: 'user', content: [{ type: 'text', text }] }]);
	list.addResponse([{ role: 'assistant', content: [{ type: 'text', text: 'Noted.' }] }]);
	return list;
}

describe('Observer retry for transient model failures', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('records observations once after a transient 503', async () => {
		const doGenerate = vi
			.fn<() => Promise<GenerateResult>>()
			.mockRejectedValueOnce(apiError(503))
			.mockResolvedValue(textResult('* CRITICAL (14:30) User chose the violet theme.'));
		const { store, orchestrator } = setup(doGenerate);
		const list = turn('Use the violet theme for the launch page.');

		await observeMidRun(orchestrator, list);

		expect(doGenerate).toHaveBeenCalledTimes(2);
		expect(await store.getActiveObservationLog({ observationScopeId: THREAD_ID })).toMatchObject([
			{ marker: 'critical', text: 'User chose the violet theme.' },
		]);
		const cursor = await store.getCursor(THREAD_ID);
		expect(cursor?.lastObservedMessageId).toBe(list.messages().at(-1)?.id);
	});

	it('stops at the retry limit, keeps memory unchanged, and observes again on a new run', async () => {
		const doGenerate = vi.fn<() => Promise<GenerateResult>>().mockRejectedValue(apiError(503));
		const { store, events, orchestrator, tracker } = setup(doGenerate);
		const list = turn('Use the violet theme for the launch page.');

		await expect(observeMidRun(orchestrator, list)).resolves.toBeUndefined();
		// A later boundary in the same run does not start another attempt.
		await observeMidRun(orchestrator, list);
		await orchestrator.saveToMemory(list, runOptions());
		await tracker.flush();

		expect(doGenerate).toHaveBeenCalledTimes(DEFAULT_OBSERVATION_LOG_OBSERVER_MAX_RETRIES + 1);
		expect(events).toContainEqual(expect.objectContaining({ type: 'failed' }));
		expect(await store.getActiveObservationLog({ observationScopeId: THREAD_ID })).toEqual([]);
		expect(await store.getCursor(THREAD_ID)).toBeNull();
		expect(list.llmVisibleMessages()).toEqual(list.messages());

		doGenerate.mockReset();
		doGenerate.mockResolvedValue(textResult('* CRITICAL (14:30) User chose the violet theme.'));
		const next = new AgentMessageList();
		await orchestrator.loadInto(next, runOptions());
		next.addInput([{ role: 'user', content: [{ type: 'text', text: 'Continue the work.' }] }]);
		await observeMidRun(orchestrator, next);

		expect(doGenerate).toHaveBeenCalledTimes(1);
		expect(await store.getActiveObservationLog({ observationScopeId: THREAD_ID })).toMatchObject([
			{ text: 'User chose the violet theme.' },
		]);
		expect(await store.getCursor(THREAD_ID)).not.toBeNull();
	});

	it.each([400, 401])('does not retry a permanent %i error', async (statusCode) => {
		const doGenerate = vi
			.fn<() => Promise<GenerateResult>>()
			.mockRejectedValue(apiError(statusCode));
		const { store, events, orchestrator } = setup(doGenerate);
		const list = turn('Use the violet theme for the launch page.');

		await observeMidRun(orchestrator, list);

		expect(doGenerate).toHaveBeenCalledTimes(1);
		expect(events).toContainEqual(expect.objectContaining({ type: 'failed' }));
		expect(await store.getCursor(THREAD_ID)).toBeNull();
	});

	it('keeps the validation of invalid responses after a transient 503', async () => {
		const doGenerate = vi
			.fn<() => Promise<GenerateResult>>()
			.mockRejectedValueOnce(apiError(503))
			.mockResolvedValue(textResult('Here are my notes about the conversation.'));
		const { store, orchestrator } = setup(doGenerate);
		const list = turn('Use the violet theme for the launch page.');

		await observeMidRun(orchestrator, list);

		expect(doGenerate).toHaveBeenCalledTimes(2);
		expect(await store.getActiveObservationLog({ observationScopeId: THREAD_ID })).toEqual([]);
		expect(await store.getCursor(THREAD_ID)).toBeNull();
		expect(list.llmVisibleMessages()).toEqual(list.messages());
	});

	it('records the post-turn observation after a transient 503', async () => {
		const doGenerate = vi
			.fn<() => Promise<GenerateResult>>()
			.mockRejectedValueOnce(apiError(503))
			.mockResolvedValue(textResult('* IMPORTANT (14:30) Launch page work is open.'));
		const { store, orchestrator, tracker } = setup(doGenerate);
		const list = turn('Use the violet theme for the launch page.');

		await orchestrator.saveToMemory(list, runOptions());
		const flushed = tracker.flush();
		await vi.advanceTimersByTimeAsync(BACKOFF_WINDOW_MS);
		await flushed;

		expect(doGenerate).toHaveBeenCalledTimes(2);
		expect(await store.getActiveObservationLog({ observationScopeId: THREAD_ID })).toMatchObject([
			{ text: 'Launch page work is open.' },
		]);
		expect((await store.getCursor(THREAD_ID))?.lastObservedMessageId).toBe(
			list.messages().at(-1)?.id,
		);
	});
});
