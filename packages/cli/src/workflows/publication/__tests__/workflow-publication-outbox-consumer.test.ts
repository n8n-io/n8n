import type { Logger } from '@n8n/backend-common';
import type { WorkflowsConfig } from '@n8n/config';
import type { WorkflowPublicationOutbox, WorkflowPublicationOutboxRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { ErrorReporter, InstanceSettings } from 'n8n-core';

import type { PublicationResult } from '@/workflows/publication/publication-result';
import type { PublicationStatusReporter } from '@/workflows/publication/publication-status-reporter';
import type { WorkflowPublicationApplier } from '@/workflows/publication/workflow-publication-applier';
import { WorkflowPublicationOutboxConsumer } from '@/workflows/publication/workflow-publication-outbox-consumer';

describe('WorkflowPublicationOutboxConsumer', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const errorReporter = mock<ErrorReporter>();
	const outboxRepository = mock<WorkflowPublicationOutboxRepository>();
	const applier = mock<WorkflowPublicationApplier>();
	const reporter = mock<PublicationStatusReporter>();
	const instanceSettings = mock<InstanceSettings>();

	let consumer: WorkflowPublicationOutboxConsumer;

	const POLL_INTERVAL_MS = 15_000;

	function createConsumer(useWorkflowPublicationService = true) {
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
			instanceSettings,
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
		jest.clearAllMocks();
		jest.useFakeTimers();
		outboxRepository.claimNextPendingRecord.mockResolvedValue(null);
		applier.apply.mockResolvedValue({ type: 'completed' });
		reporter.report.mockResolvedValue(undefined);
		consumer = createConsumer();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe('lifecycle', () => {
		test('startPolling starts interval when feature flag is on', () => {
			consumer.startPolling();

			expect(jest.getTimerCount()).toBe(1);
		});

		test('polling schedules the next cycle after a timer fires', async () => {
			consumer.startPolling();

			await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

			expect(outboxRepository.claimNextPendingRecord).toHaveBeenCalledTimes(1);
			expect(jest.getTimerCount()).toBe(1);
		});

		test('polling stops scheduling when leadership is lost during a cycle', async () => {
			outboxRepository.claimNextPendingRecord.mockImplementationOnce(async () => {
				consumer.stopPolling();
				return null;
			});
			consumer.startPolling();

			await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

			expect(outboxRepository.claimNextPendingRecord).toHaveBeenCalledTimes(1);
			expect(jest.getTimerCount()).toBe(0);
		});

		test('polling reports claim errors and schedules the next cycle', async () => {
			const error = new Error('claim failed');
			outboxRepository.claimNextPendingRecord.mockRejectedValueOnce(error);
			consumer.startPolling();

			await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

			expect(errorReporter.error).toHaveBeenCalledWith(error, { shouldBeLogged: true });
			expect(jest.getTimerCount()).toBe(1);

			await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
			expect(outboxRepository.claimNextPendingRecord).toHaveBeenCalledTimes(2);
		});

		test('startPolling does nothing when feature flag is off', () => {
			consumer = createConsumer(false);
			consumer.startPolling();

			expect(jest.getTimerCount()).toBe(0);
		});

		test('stopPolling clears the interval', () => {
			consumer.startPolling();
			expect(jest.getTimerCount()).toBe(1);

			consumer.stopPolling();
			expect(jest.getTimerCount()).toBe(0);
		});

		test('shutdown stops polling', () => {
			consumer.startPolling();
			consumer.shutdown();

			expect(jest.getTimerCount()).toBe(0);
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

			await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

			expect(applier.apply).toHaveBeenCalledTimes(2);
			expect(reporter.report).toHaveBeenCalledTimes(2);
		});
	});
});
