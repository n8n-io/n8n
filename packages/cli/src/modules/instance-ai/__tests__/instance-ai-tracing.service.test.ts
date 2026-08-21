import type { Mock } from 'vitest';
import type { InstanceAiEvent } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import type { InstanceAiTraceContext } from '@n8n/instance-ai';
import { mock } from 'vitest-mock-extended';

const continueInstanceAiTraceContext = vi.fn();
const releaseTraceClient = vi.fn();
const submitLangsmithUserFeedback = vi.fn();

vi.mock('@n8n/instance-ai', () => ({
	continueInstanceAiTraceContext: (...args: unknown[]) => continueInstanceAiTraceContext(...args),
	orchestratorAgentId: (runId: string) => `orchestrator:${runId}`,
	releaseTraceClient: (...args: unknown[]) => releaseTraceClient(...args),
	submitLangsmithUserFeedback: (...args: unknown[]) => submitLangsmithUserFeedback(...args),
}));

import {
	InstanceAiTracingService,
	type InstanceAiTracingAiService,
	type InstanceAiTracingEventReader,
	type InstanceAiTracingRunState,
	type InstanceAiTracingSnapshotStorage,
} from '../tracing';

type FakeTraceRun = {
	id: string;
	traceId: string;
	endTime?: number;
	metadata?: Record<string, unknown>;
};

type FakeTraceContext = {
	rootRun: FakeTraceRun;
	actorRun: FakeTraceRun;
	finishRun: Mock;
	traceWriter?: { getEvents: Mock };
};

function makeTraceContext(overrides: Partial<FakeTraceContext> = {}): InstanceAiTraceContext {
	const root: FakeTraceRun = { id: 'root-1', traceId: 'trace-1' };
	const ctx: FakeTraceContext = {
		rootRun: root,
		actorRun: root,
		finishRun: vi.fn(async () => {}),
		...overrides,
	};
	return ctx as unknown as InstanceAiTraceContext;
}

function createService(
	overrides: {
		logger?: Partial<Logger>;
		eventReader?: Partial<InstanceAiTracingEventReader>;
		runState?: Partial<InstanceAiTracingRunState>;
		dbSnapshotStorage?: Partial<InstanceAiTracingSnapshotStorage>;
		aiService?: Partial<InstanceAiTracingAiService>;
	} = {},
) {
	const logger = mock<Logger>(overrides.logger);
	const eventReader: InstanceAiTracingEventReader = {
		getEventsForRun: vi.fn(async () => []),
		...overrides.eventReader,
	};
	const runState: InstanceAiTracingRunState = {
		attachTracing: vi.fn(),
		...overrides.runState,
	};
	const dbSnapshotStorage: InstanceAiTracingSnapshotStorage = {
		findLangsmithAnchor: vi.fn(async () => undefined),
		...overrides.dbSnapshotStorage,
	};
	const aiService: InstanceAiTracingAiService = {
		isProxyEnabled: vi.fn(() => false),
		getClient: vi.fn(),
		...overrides.aiService,
	};

	const service = new InstanceAiTracingService({
		logger,
		eventReader,
		runState,
		dbSnapshotStorage,
		aiService,
	});

	return { service, logger, eventReader, runState, dbSnapshotStorage, aiService };
}

describe('InstanceAiTracingService', () => {
	beforeEach(() => {
		continueInstanceAiTraceContext.mockReset();
		releaseTraceClient.mockReset();
		submitLangsmithUserFeedback.mockReset();
	});

	describe('buildMessageTraceMetadata', () => {
		it('annotates the trace from the run events', async () => {
			const { service } = createService({
				eventReader: {
					getEventsForRun: vi.fn(async () => [
						{
							type: 'text-block',
							runId: 'run-1',
							agentId: 'agent-1',
							payload: { text: 'On it.' },
						} as InstanceAiEvent,
					]),
				},
			});

			await expect(
				service.buildMessageTraceMetadata('thread-1', 'run-1', { status: 'completed' }),
			).resolves.toEqual({
				completion_source: 'orchestrator',
				first_visible_state: 'assistant_text',
			});
		});

		it('degrades instead of throwing when the events read fails', async () => {
			// Most callers run inside a run's terminal catch block: a throw here
			// would skip run-finish and hang the client until the liveness sweep.
			const { service, logger } = createService({
				eventReader: {
					getEventsForRun: vi.fn(async () => {
						throw new Error('SQLITE_BUSY: database is locked');
					}),
				},
			});

			await expect(
				service.buildMessageTraceMetadata('thread-1', 'run-1', {
					status: 'cancelled',
					cancellationReason: 'timeout',
				}),
			).resolves.toEqual({
				completion_source: 'orchestrator',
				// Options-derived fields survive; the events-derived one is flagged so
				// it can't be read as a genuinely empty run.
				first_visible_state: 'empty',
				first_visible_state_unavailable: true,
				cancellation_type: 'idle_timeout',
			});
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to read run events for Instance AI trace metadata',
				expect.objectContaining({ runId: 'run-1', threadId: 'thread-1' }),
			);
		});
	});

	describe('storeTraceContext / getTraceContext', () => {
		it('stores a trace context and reads it back by run ID', () => {
			const { service } = createService();
			const tracing = makeTraceContext();

			service.storeTraceContext('run-1', 'thread-a', tracing, 'group-1');

			expect(service.getTraceContext('run-1')).toBe(tracing);
			expect(service.getTraceContext('run-unknown')).toBeUndefined();
		});

		it('exposes the message group ID for a stored run', () => {
			const { service } = createService();
			service.storeTraceContext('run-1', 'thread-a', makeTraceContext(), 'group-1');

			expect(service.getMessageGroupId('run-1')).toBe('group-1');
			expect(service.getMessageGroupId('run-unknown')).toBeUndefined();
		});
	});

	describe('resume trace registration', () => {
		it('keeps a resume trace detached until the checkpoint claim succeeds', async () => {
			const { service, runState } = createService();
			const baseTracing = makeTraceContext({
				rootRun: { id: 'root-base', traceId: 'trace-base' },
			});
			const resumeTracing = makeTraceContext({
				rootRun: { id: 'root-resume', traceId: 'trace-resume' },
			});
			continueInstanceAiTraceContext.mockResolvedValue(resumeTracing);
			vi.spyOn(service, 'configureTraceReplayMode').mockResolvedValue();

			const result = await service.createOrchestratorResumeTraceContext({
				baseTracing,
				threadId: 'thread-a',
				messageId: 'message-1',
				messageGroupId: 'group-1',
				runId: 'run-1',
				userId: 'user-1',
				input: { approved: true },
				resumeReason: 'approval',
				register: false,
			});

			expect(result).toBe(resumeTracing);
			expect(service.getTraceContext('run-1')).toBeUndefined();
			expect(runState.attachTracing).not.toHaveBeenCalled();

			service.registerTraceContext('run-1', 'thread-a', resumeTracing, 'group-1');

			expect(service.getTraceContext('run-1')).toBe(resumeTracing);
			expect(service.getMessageGroupId('run-1')).toBe('group-1');
			expect(runState.attachTracing).toHaveBeenCalledWith('thread-a', resumeTracing);
		});
	});

	describe('getTraceContextForContinuation', () => {
		it('prefers the most recent same-group context, then falls back to the thread', () => {
			const { service } = createService();
			const olderSameThread = makeTraceContext({ rootRun: { id: 'r-old', traceId: 't-old' } });
			const sameGroup = makeTraceContext({ rootRun: { id: 'r-grp', traceId: 't-grp' } });

			service.storeTraceContext('run-old', 'thread-a', olderSameThread, 'group-other');
			service.storeTraceContext('run-grp', 'thread-a', sameGroup, 'group-1');

			// Same-group preference wins when a group ID is provided.
			expect(service.getTraceContextForContinuation('thread-a', 'group-1')).toBe(sameGroup);
			// No group ID -> most recent context for the thread.
			expect(service.getTraceContextForContinuation('thread-a')).toBe(sameGroup);
			// Unknown thread -> nothing.
			expect(service.getTraceContextForContinuation('thread-b', 'group-1')).toBeUndefined();
		});

		it('falls back to any thread context when the group does not match', () => {
			const { service } = createService();
			const threadCtx = makeTraceContext();
			service.storeTraceContext('run-1', 'thread-a', threadCtx, 'group-1');

			expect(service.getTraceContextForContinuation('thread-a', 'group-missing')).toBe(threadCtx);
		});
	});

	describe('deleteTraceContextsForThread', () => {
		it('releases clients, preserves writer events, and removes the entries', () => {
			const writerEvents = [{ a: 1 }];
			const tracing = makeTraceContext({
				rootRun: { id: 'root-1', traceId: 'trace-1' },
				traceWriter: { getEvents: vi.fn(() => writerEvents) },
			});
			const { service } = createService();

			service.activateTraceSlug('slug-1');
			service.storeTraceContext('run-1', 'thread-a', tracing, 'group-1');
			service.storeTraceContext('run-2', 'thread-b', makeTraceContext(), 'group-2');

			service.deleteTraceContextsForThread('thread-a');

			expect(releaseTraceClient).toHaveBeenCalledWith('trace-1');
			expect(service.getTraceContext('run-1')).toBeUndefined();
			// Other threads are untouched.
			expect(service.getTraceContext('run-2')).toBeDefined();
			// Preserved writer events remain retrievable via the slug-scoped store.
			expect(service.getTraceEvents('slug-1')).toEqual(writerEvents);
		});
	});

	describe('finalizeRunTracing', () => {
		it('finishes the actor run with status and error', async () => {
			const tracing = makeTraceContext();
			const { service } = createService();

			await service.finalizeRunTracing('run-1', tracing, {
				status: 'error',
				reason: 'boom',
			});

			const finishRun = (tracing as unknown as FakeTraceContext).finishRun;
			expect(finishRun).toHaveBeenCalledTimes(1);
			const [run, options] = finishRun.mock.calls[0];
			expect(run).toBe((tracing as unknown as FakeTraceContext).actorRun);
			expect(options).toMatchObject({
				outputs: { status: 'error', runId: 'run-1', reason: 'boom' },
				metadata: { final_status: 'error' },
				error: 'boom',
			});
		});

		it('skips finalization when the actor run already ended', async () => {
			const tracing = makeTraceContext({
				actorRun: { id: 'root-1', traceId: 'trace-1', endTime: 123 },
			});
			const { service } = createService();

			await service.finalizeRunTracing('run-1', tracing, { status: 'completed' });

			expect((tracing as unknown as FakeTraceContext).finishRun).not.toHaveBeenCalled();
		});

		it('is a no-op when no tracing context is provided', async () => {
			const { service } = createService();
			await expect(
				service.finalizeRunTracing('run-1', undefined, { status: 'completed' }),
			).resolves.toBeUndefined();
		});
	});

	describe('getTrackedThreadIds / clear', () => {
		it('lists tracked thread IDs and clears all entries', () => {
			const { service } = createService();
			service.storeTraceContext('run-1', 'thread-a', makeTraceContext());
			service.storeTraceContext('run-2', 'thread-b', makeTraceContext());

			expect(service.getTrackedThreadIds().sort()).toEqual(['thread-a', 'thread-b']);

			service.clear();

			expect(service.getTrackedThreadIds()).toEqual([]);
			expect(service.getTraceContext('run-1')).toBeUndefined();
		});
	});

	describe('submitLangsmithFeedback', () => {
		it('skips submission when no LangSmith anchor exists', async () => {
			const findLangsmithAnchor = vi.fn(async () => undefined);
			const { service } = createService({ dbSnapshotStorage: { findLangsmithAnchor } });

			await service.submitLangsmithFeedback(
				{ id: 'user-1' } as unknown as User,
				'thread-a',
				'response-1',
				{ rating: 'up' },
			);

			expect(findLangsmithAnchor).toHaveBeenCalledWith('thread-a', 'response-1');
			expect(submitLangsmithUserFeedback).not.toHaveBeenCalled();
		});

		it('submits feedback when an anchor exists and the proxy is disabled', async () => {
			const findLangsmithAnchor = vi.fn(async () => ({
				langsmithRunId: 'ls-run',
				langsmithTraceId: 'ls-trace',
			}));
			const { service } = createService({
				dbSnapshotStorage: { findLangsmithAnchor },
				aiService: { isProxyEnabled: vi.fn(() => false) },
			});

			await service.submitLangsmithFeedback(
				{ id: 'user-1' } as unknown as User,
				'thread-a',
				'response-1',
				{ rating: 'down', comment: 'nope' },
			);

			expect(submitLangsmithUserFeedback).toHaveBeenCalledTimes(1);
			expect(submitLangsmithUserFeedback).toHaveBeenCalledWith(
				expect.objectContaining({
					langsmithRunId: 'ls-run',
					langsmithTraceId: 'ls-trace',
					score: 0,
					value: 'down',
					comment: 'nope',
				}),
			);
		});
	});
});
