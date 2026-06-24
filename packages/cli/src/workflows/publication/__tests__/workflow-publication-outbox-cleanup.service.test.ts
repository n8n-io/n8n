import type { Logger } from '@n8n/backend-common';
import type { WorkflowsConfig } from '@n8n/config';
import type { WorkflowPublicationOutboxRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings, Span, Tracing } from 'n8n-core';

import { WorkflowPublicationOutboxCleanupService } from '../workflow-publication-outbox-cleanup.service';

const logger = mock<Logger>({ scoped: jest.fn().mockReturnThis() });
const config = mock<WorkflowsConfig>({
	useWorkflowPublicationService: true,
	publicationOutboxCleanupIntervalSeconds: 30,
	publicationOutboxCompletedRetentionHours: 1,
	publicationOutboxFailedRetentionHours: 168,
	publicationOutboxCleanupBatchSize: 1000,
});
const outboxRepository = mock<WorkflowPublicationOutboxRepository>();
const instanceSettings = mock<InstanceSettings>({ isLeader: true });
const tracing = mock<Tracing>();

let service: WorkflowPublicationOutboxCleanupService;

beforeEach(() => {
	jest.useFakeTimers();
	jest.clearAllMocks();
	tracing.startSpan.mockImplementation(async (_opts, spanCb) => await spanCb(mock<Span>()));
	service = new WorkflowPublicationOutboxCleanupService(
		logger,
		config,
		outboxRepository,
		instanceSettings,
		tracing,
	);
});

afterEach(() => {
	service.shutdown();
	jest.useRealTimers();
});

describe('WorkflowPublicationOutboxCleanupService', () => {
	describe('init', () => {
		it('should start cleanup when instance is leader', () => {
			outboxRepository.deleteTerminalOlderThan.mockResolvedValue(0);
			Object.assign(instanceSettings, { isLeader: true });

			service.init();
			jest.advanceTimersByTime(30_000);

			expect(outboxRepository.deleteTerminalOlderThan).toHaveBeenCalled();
		});

		it('should run an initial cleanup immediately on startup', async () => {
			outboxRepository.deleteTerminalOlderThan.mockResolvedValue(0);
			Object.assign(instanceSettings, { isLeader: true });

			service.init();
			await jest.advanceTimersByTimeAsync(0);

			// Ran once at startup, before any interval elapsed.
			expect(outboxRepository.deleteTerminalOlderThan).toHaveBeenCalledTimes(1);
			expect(outboxRepository.deleteTerminalOlderThan).toHaveBeenCalledWith(3600, 604_800, 1000);
		});

		it('should not start cleanup when instance is not leader', () => {
			Object.assign(instanceSettings, { isLeader: false });

			service.init();
			jest.advanceTimersByTime(60_000);

			expect(outboxRepository.deleteTerminalOlderThan).not.toHaveBeenCalled();

			Object.assign(instanceSettings, { isLeader: true });
		});
	});

	describe('startCleanup', () => {
		it('should schedule cleanup at the configured interval with the configured retention windows', () => {
			outboxRepository.deleteTerminalOlderThan.mockResolvedValue(0);

			service.startCleanup();

			expect(outboxRepository.deleteTerminalOlderThan).not.toHaveBeenCalled();

			jest.advanceTimersByTime(30_000);

			// 1h completed, 168h failed → seconds; batch size passed through.
			expect(outboxRepository.deleteTerminalOlderThan).toHaveBeenCalledWith(3600, 604_800, 1000);
		});

		it('should not start when the publication service is disabled', () => {
			Object.assign(config, { useWorkflowPublicationService: false });

			service.startCleanup();
			jest.advanceTimersByTime(60_000);

			expect(outboxRepository.deleteTerminalOlderThan).not.toHaveBeenCalled();

			Object.assign(config, { useWorkflowPublicationService: true });
		});

		it('should not start if shutting down', () => {
			service.shutdown();
			service.startCleanup();

			jest.advanceTimersByTime(60_000);

			expect(outboxRepository.deleteTerminalOlderThan).not.toHaveBeenCalled();
		});
	});

	describe('cleanup', () => {
		it('should loop until fewer than batchSize rows are deleted', async () => {
			outboxRepository.deleteTerminalOlderThan
				.mockResolvedValueOnce(1000) // full batch
				.mockResolvedValueOnce(1000) // full batch
				.mockResolvedValueOnce(42); // partial → stop

			service.startCleanup();
			jest.advanceTimersByTime(30_000);
			await jest.advanceTimersByTimeAsync(0);

			expect(outboxRepository.deleteTerminalOlderThan).toHaveBeenCalledTimes(3);
		});

		it('should stop after one call when deleted count is below batchSize', async () => {
			outboxRepository.deleteTerminalOlderThan.mockResolvedValue(10);

			service.startCleanup();
			jest.advanceTimersByTime(30_000);
			await jest.advanceTimersByTimeAsync(0);

			expect(outboxRepository.deleteTerminalOlderThan).toHaveBeenCalledTimes(1);
		});

		it('should stop looping when a shutdown begins mid-cleanup', async () => {
			outboxRepository.deleteTerminalOlderThan.mockImplementation(async () => {
				service.shutdown();
				return 1000; // full batch would otherwise continue looping
			});

			service.startCleanup();
			jest.advanceTimersByTime(30_000);
			await jest.advanceTimersByTimeAsync(0);

			expect(outboxRepository.deleteTerminalOlderThan).toHaveBeenCalledTimes(1);
		});

		it('should catch and log errors without throwing', async () => {
			outboxRepository.deleteTerminalOlderThan.mockRejectedValue(new Error('DB error'));

			service.startCleanup();
			jest.advanceTimersByTime(30_000);
			await jest.advanceTimersByTimeAsync(0);

			expect(logger.error).toHaveBeenCalled();
		});
	});

	describe('stopCleanup', () => {
		it('should stop the cleanup interval on leader stepdown', () => {
			outboxRepository.deleteTerminalOlderThan.mockResolvedValue(0);

			service.startCleanup();
			service.stopCleanup();

			jest.advanceTimersByTime(60_000);

			expect(outboxRepository.deleteTerminalOlderThan).not.toHaveBeenCalled();
		});
	});

	describe('shutdown', () => {
		it('should stop the cleanup interval', () => {
			outboxRepository.deleteTerminalOlderThan.mockResolvedValue(0);

			service.startCleanup();
			service.shutdown();

			jest.advanceTimersByTime(60_000);

			expect(outboxRepository.deleteTerminalOlderThan).not.toHaveBeenCalled();
		});
	});
});
