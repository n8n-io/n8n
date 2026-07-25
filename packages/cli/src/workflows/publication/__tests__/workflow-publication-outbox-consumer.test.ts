import type { Logger } from '@n8n/backend-common';
import type { WorkflowsConfig } from '@n8n/config';
import type { WorkflowPublicationOutbox, WorkflowPublicationOutboxRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';
import type { ErrorReporter, InstanceSettings, Span, Tracing } from 'n8n-core';

import type { EventService } from '@/events/event.service';
import type { PublicationResult } from '@/workflows/publication/publication-result';
import type { PublicationStatusReporter } from '@/workflows/publication/publication-status-reporter';
import { WorkflowPublicationLifecycleLock } from '@/workflows/publication/workflow-publication-lifecycle-lock';
import type { WorkflowPublicationApplier } from '@/workflows/publication/workflow-publication-applier';
import { WorkflowPublicationOutboxConsumer } from '@/workflows/publication/workflow-publication-outbox-consumer';

describe('WorkflowPublicationOutboxConsumer', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const errorReporter = mock<ErrorReporter>();
	const outboxRepository = mock<WorkflowPublicationOutboxRepository>();
	const applier = mock<WorkflowPublicationApplier>();
	const reporter = mock<PublicationStatusReporter>();
	const tracing = mock<Tracing>();
	const eventService = mock<EventService>();

	let consumer: WorkflowPublicationOutboxConsumer;

	const POLL_INTERVAL_MS = 15_000;

	function createConsumer(useWorkflowPublicationService = true, isLeader = true, concurrency = 1) {
		const workflowsConfig = mock<WorkflowsConfig>({
			useWorkflowPublicationService,
			publicationOutboxPollIntervalMs: POLL_INTERVAL_MS,
			workflowPublicationConcurrency: concurrency,
		});
		return new WorkflowPublicationOutboxConsumer(
			logger,
			workflowsConfig,
			errorReporter,
			outboxRepository,
			applier,
			reporter,
			mock<InstanceSettings>({ isLeader }),
			new WorkflowPublicationLifecycleLock(),
			tracing,
			eventService,
		);
	}

	function makeRecord(
		overrides: Partial<WorkflowPublicationOutbox> = {},
	): WorkflowPublicationOutbox {
		return {
			id: 1,
			workflowId: 'wf-1',
			publishedVersionId: 'v-2',
			status: 'in_progress',
			errorMessage: null,
			createdAt: new Date(),
			updatedAt: new Date(),
			...overrides,
		} as WorkflowPublicationOutbox;
	}

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		tracing.startSpan.mockImplementation(async (_opts, spanCb) => await spanCb(mock<Span>()));
		outboxRepository.claimNextPendingRecord.mockResolvedValue(null);
		applier.apply.mockResolvedValue({ type: 'completed', triggerStatuses: [] });
		reporter.report.mockResolvedValue(undefined);
		consumer = createConsumer();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('init', () => {
		test('on the leader, drains pending records immediately and starts polling', async () => {
			const record = makeRecord({ id: 1 });
			outboxRepository.claimNextPendingRecord.mockResolvedValueOnce(record).mockResolvedValue(null);
			consumer = createConsumer(true, true);

			await consumer.init();

			expect(applier.apply).toHaveBeenCalledTimes(1);
			expect(reporter.report).toHaveBeenCalledTimes(1);
			expect(vi.getTimerCount()).toBe(1);
		});

		test('on a follower, does nothing', async () => {
			consumer = createConsumer(true, false);

			await consumer.init();

			expect(outboxRepository.claimNextPendingRecord).not.toHaveBeenCalled();
			expect(vi.getTimerCount()).toBe(0);
		});
	});

	describe('lifecycle', () => {
		test('startPolling starts interval when feature flag is on', () => {
			consumer.startPolling();

			expect(vi.getTimerCount()).toBe(1);
		});

		test('polling schedules the next cycle after a timer fires', async () => {
			consumer.startPolling();

			await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

			expect(outboxRepository.claimNextPendingRecord).toHaveBeenCalledTimes(1);
			expect(vi.getTimerCount()).toBe(1);
		});

		test('polling stops scheduling when leadership is lost during a cycle', async () => {
			outboxRepository.claimNextPendingRecord.mockImplementationOnce(async () => {
				consumer.stopPolling();
				return null;
			});
			consumer.startPolling();

			await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

			expect(outboxRepository.claimNextPendingRecord).toHaveBeenCalledTimes(1);
			expect(vi.getTimerCount()).toBe(0);
		});

		test('polling reports claim errors and schedules the next cycle', async () => {
			const error = new Error('claim failed');
			outboxRepository.claimNextPendingRecord.mockRejectedValueOnce(error);
			consumer.startPolling();

			await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

			expect(errorReporter.error).toHaveBeenCalledWith(error, { shouldBeLogged: true });
			expect(vi.getTimerCount()).toBe(1);

			await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
			expect(outboxRepository.claimNextPendingRecord).toHaveBeenCalledTimes(2);
		});

		test('startPolling does nothing when feature flag is off', () => {
			consumer = createConsumer(false);
			consumer.startPolling();

			expect(vi.getTimerCount()).toBe(0);
		});

		test('stopPolling clears the interval', () => {
			consumer.startPolling();
			expect(vi.getTimerCount()).toBe(1);

			consumer.stopPolling();
			expect(vi.getTimerCount()).toBe(0);
		});

		test('shutdown stops polling', async () => {
			consumer.startPolling();
			await consumer.shutdown();

			expect(vi.getTimerCount()).toBe(0);
		});
	});

	describe('concurrent drains', () => {
		test('coalesces overlapping drainPending calls onto a single pass', async () => {
			const record = makeRecord({ id: 1 });
			let releaseClaim!: () => void;
			const claimGate = new Promise<void>((resolve) => {
				releaseClaim = resolve;
			});
			outboxRepository.claimNextPendingRecord
				.mockImplementationOnce(async () => {
					await claimGate;
					return record;
				})
				.mockResolvedValue(null);
			consumer.startPolling();

			const first = consumer.drainPending();
			const second = consumer.drainPending();

			releaseClaim();
			const [firstProcessed, secondProcessed] = await Promise.all([first, second]);

			// Both callers share the one in-flight pass, so the record is claimed and
			// applied exactly once even though drainPending was invoked twice.
			expect(applier.apply).toHaveBeenCalledTimes(1);
			expect(reporter.report).toHaveBeenCalledTimes(1);
			expect(firstProcessed).toBe(1);
			expect(secondProcessed).toBe(1);
		});
	});

	describe('parallel drains', () => {
		test('processes up to the configured concurrency in parallel and returns the total', async () => {
			consumer = createConsumer(true, true, 2);

			// Distinct workflowIds so the per-workflow lifecycle lock never serializes them.
			const r1 = makeRecord({ id: 1, workflowId: 'wf-1' });
			const r2 = makeRecord({ id: 2, workflowId: 'wf-2' });
			const r3 = makeRecord({ id: 3, workflowId: 'wf-3' });
			outboxRepository.claimNextPendingRecord
				.mockResolvedValueOnce(r1)
				.mockResolvedValueOnce(r2)
				.mockResolvedValueOnce(r3)
				.mockResolvedValue(null);

			const started: number[] = [];
			const releases = new Map<number, () => void>();
			const startedSignals = new Map<number, () => void>();
			const startedPromises = new Map<number, Promise<void>>();
			for (const id of [1, 2, 3]) {
				startedPromises.set(id, new Promise<void>((resolve) => startedSignals.set(id, resolve)));
			}
			applier.apply.mockImplementation(async (record) => {
				started.push(record.id);
				startedSignals.get(record.id)!();
				await new Promise<void>((resolve) => releases.set(record.id, resolve));
				return { type: 'completed', triggerStatuses: [] };
			});

			consumer.startPolling();
			const drain = consumer.drainPending();

			// Two workers enter apply() in parallel before either completes; the third waits.
			await Promise.all([startedPromises.get(1), startedPromises.get(2)]);
			expect(started.length).toBe(2);
			expect(started).toEqual(expect.arrayContaining([1, 2]));
			expect(started).not.toContain(3);

			// Freeing one worker lets it claim and start the third record.
			releases.get(1)!();
			await startedPromises.get(3);
			expect(started).toContain(3);

			releases.get(2)!();
			releases.get(3)!();
			const processed = await drain;
			expect(processed).toBe(3);
		});
	});

	describe('shutdown', () => {
		test('waits for an in-flight record to finish before resolving', async () => {
			const record = makeRecord({ id: 1 });
			outboxRepository.claimNextPendingRecord.mockResolvedValueOnce(record).mockResolvedValue(null);

			let releaseApply!: () => void;
			let signalApplyStarted!: () => void;
			const applyStarted = new Promise<void>((resolve) => {
				signalApplyStarted = resolve;
			});
			applier.apply.mockImplementationOnce(async () => {
				signalApplyStarted();
				await new Promise<void>((resolve) => {
					releaseApply = resolve;
				});
				return { type: 'completed', triggerStatuses: [] };
			});

			consumer.startPolling();
			const drain = consumer.drainPending();
			// Wait until the record is actually being applied, regardless of how many
			// internal async hops (e.g. lifecycle-lock acquisition) precede the call.
			await applyStarted;

			let shutdownResolved = false;
			const shutdown = consumer.shutdown().then(() => {
				shutdownResolved = true;
			});

			// Shutdown must not resolve while the record is still being applied.
			await Promise.resolve();
			expect(shutdownResolved).toBe(false);

			releaseApply();
			await shutdown;
			await drain;

			expect(shutdownResolved).toBe(true);
			expect(reporter.report).toHaveBeenCalledTimes(1);
		});
	});

	describe('processRecord', () => {
		test('applies the record then reports the result', async () => {
			const record = makeRecord();
			const result: PublicationResult = { type: 'completed', triggerStatuses: [] };
			applier.apply.mockResolvedValue(result);

			await consumer.processRecord(record);

			expect(applier.apply).toHaveBeenCalledWith(record);
			expect(reporter.report).toHaveBeenCalledWith(record, result);
		});

		test('reports a failed result when the applier throws unexpectedly', async () => {
			applier.apply.mockRejectedValue(new Error('teardown failed'));

			await consumer.processRecord(makeRecord());

			expect(reporter.report).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					type: 'failed',
					error: expect.objectContaining({ message: 'Unexpected: teardown failed' }),
				}),
			);
		});

		test('logs but swallows a reporter failure, leaving the record for retry', async () => {
			const reportError = new Error('db write failed');
			reporter.report.mockRejectedValue(reportError);

			await expect(consumer.processRecord(makeRecord())).resolves.toBeUndefined();

			expect(errorReporter.error).toHaveBeenCalledWith(reportError, { shouldBeLogged: true });
		});

		test('returns the record to the queue without applying it when no longer leader', async () => {
			consumer = createConsumer(true, false);
			const record = makeRecord({ id: 7, workflowId: 'wf-7' });

			await consumer.processRecord(record);

			expect(outboxRepository.returnToPending).toHaveBeenCalledWith(7);
			expect(applier.apply).not.toHaveBeenCalled();
			expect(reporter.report).not.toHaveBeenCalled();
		});
	});

	describe('metrics events', () => {
		function lastOutcome() {
			const calls = eventService.emit.mock.calls.filter(
				(call) => call[0] === 'workflow-publication-outbox-record-processed',
			);
			return calls.at(-1)?.[1] as
				| { result: string; reason: string; durationMs: number }
				| undefined;
		}

		test.each([
			[{ type: 'completed', triggerStatuses: [] }, 'published', 'none'],
			[{ type: 'unpublished' }, 'unpublished', 'none'],
			[{ type: 'skipped', reason: 'workflow-not-found' }, 'skipped', 'workflow_not_found'],
			[{ type: 'version-missing' }, 'failed', 'version_missing'],
			[{ type: 'partial', triggerStatuses: [] }, 'partial_success', 'none'],
			[{ type: 'failed', error: new Error('boom') }, 'failed', 'none'],
		] as Array<[PublicationResult, string, string]>)(
			'emits result=%o as result=%s reason=%s',
			async (result, expectedResult, expectedReason) => {
				applier.apply.mockResolvedValue(result);

				await consumer.processRecord(makeRecord());

				expect(lastOutcome()).toEqual(
					expect.objectContaining({ result: expectedResult, reason: expectedReason }),
				);
			},
		);

		test('emits a failed outcome when the reporter throws', async () => {
			applier.apply.mockResolvedValue({ type: 'completed', triggerStatuses: [] });
			reporter.report.mockRejectedValue(new Error('db write failed'));

			await consumer.processRecord(makeRecord());

			expect(lastOutcome()).toEqual(expect.objectContaining({ result: 'failed', reason: 'none' }));
		});

		test('does not emit when the record is returned to the queue (no longer leader)', async () => {
			consumer = createConsumer(true, false);

			await consumer.processRecord(makeRecord());

			expect(eventService.emit).not.toHaveBeenCalledWith(
				'workflow-publication-outbox-record-processed',
				expect.anything(),
			);
		});
	});

	describe('wakeUp', () => {
		test('starts polling and drains all pending records', async () => {
			const first = makeRecord({ id: 1 });
			const second = makeRecord({ id: 2 });
			outboxRepository.claimNextPendingRecord
				.mockResolvedValueOnce(first)
				.mockResolvedValueOnce(second)
				.mockResolvedValue(null);

			await consumer.wakeUp();

			expect(applier.apply).toHaveBeenCalledTimes(2);
			expect(reporter.report).toHaveBeenCalledTimes(2);
			expect(vi.getTimerCount()).toBe(1);
		});

		test('does nothing when the feature flag is off', async () => {
			consumer = createConsumer(false);

			await consumer.wakeUp();

			expect(outboxRepository.claimNextPendingRecord).not.toHaveBeenCalled();
			expect(vi.getTimerCount()).toBe(0);
		});
	});

	describe('poll cycle', () => {
		test('drains all pending records through apply + report', async () => {
			const first = makeRecord({ id: 1 });
			const second = makeRecord({ id: 2 });
			outboxRepository.claimNextPendingRecord
				.mockResolvedValueOnce(first)
				.mockResolvedValueOnce(second)
				.mockResolvedValue(null);
			consumer.startPolling();

			await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

			expect(applier.apply).toHaveBeenCalledTimes(2);
			expect(reporter.report).toHaveBeenCalledTimes(2);
		});
	});
});
