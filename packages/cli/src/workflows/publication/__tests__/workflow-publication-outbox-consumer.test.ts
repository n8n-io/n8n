import type { Logger } from '@n8n/backend-common';
import type { WorkflowsConfig } from '@n8n/config';
import type { WorkflowPublicationOutbox, WorkflowPublicationOutboxRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';
import type { ErrorReporter, InstanceSettings, Span, Tracing } from 'n8n-core';

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

	let consumer: WorkflowPublicationOutboxConsumer;

	const POLL_INTERVAL_MS = 15_000;

	function createConsumer(useWorkflowPublicationService = true, isLeader = true) {
		const workflowsConfig = mock<WorkflowsConfig>({
			useWorkflowPublicationService,
			publicationOutboxPollIntervalMs: POLL_INTERVAL_MS,
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
		applier.apply.mockResolvedValue({ type: 'completed' });
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
				return { type: 'completed' };
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
			const result: PublicationResult = { type: 'completed' };
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
