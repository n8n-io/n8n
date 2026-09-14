import type { Logger } from '@n8n/backend-common';
import type { WorkflowsConfig } from '@n8n/config';
import type { WorkflowPublicationOutboxRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';
import type { Span, Tracing } from 'n8n-core';

import type { EventService } from '@/events/event.service';

import { WorkflowPublicationOutboxCleanupService } from '../workflow-publication-outbox-cleanup.service';

const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });
const config = mock<WorkflowsConfig>({
	publicationOutboxCompletedRetentionHours: 1,
	publicationOutboxFailedRetentionHours: 168,
	publicationOutboxCleanupBatchSize: 1000,
});
const outboxRepository = mock<WorkflowPublicationOutboxRepository>();
const tracing = mock<Tracing>();
const eventService = mock<EventService>();

let service: WorkflowPublicationOutboxCleanupService;

beforeEach(() => {
	vi.clearAllMocks();
	tracing.startSpan.mockImplementation(async (_opts, spanCb) => await spanCb(mock<Span>()));
	service = new WorkflowPublicationOutboxCleanupService(
		logger,
		config,
		outboxRepository,
		tracing,
		eventService,
	);
});

describe('WorkflowPublicationOutboxCleanupService', () => {
	describe('cleanup', () => {
		it('should pass the retention windows in seconds and the batch size', async () => {
			outboxRepository.deleteTerminalOlderThan.mockResolvedValue(0);

			await service.cleanup(new AbortController().signal);

			expect(outboxRepository.deleteTerminalOlderThan).toHaveBeenCalledWith(3600, 604_800, 1000);
		});

		it('should loop until fewer than batchSize rows are deleted', async () => {
			outboxRepository.deleteTerminalOlderThan
				.mockResolvedValueOnce(1000) // full batch
				.mockResolvedValueOnce(1000) // full batch
				.mockResolvedValueOnce(42); // partial → stop

			await service.cleanup(new AbortController().signal);

			expect(outboxRepository.deleteTerminalOlderThan).toHaveBeenCalledTimes(3);
		});

		it('should stop after one call when deleted count is below batchSize', async () => {
			outboxRepository.deleteTerminalOlderThan.mockResolvedValue(10);

			await service.cleanup(new AbortController().signal);

			expect(outboxRepository.deleteTerminalOlderThan).toHaveBeenCalledTimes(1);
		});

		it('should stop looping after the current batch once the signal aborts', async () => {
			const abort = new AbortController();
			outboxRepository.deleteTerminalOlderThan.mockImplementation(async () => {
				abort.abort();
				return 1000; // full batch would otherwise continue looping
			});

			await service.cleanup(abort.signal);

			expect(outboxRepository.deleteTerminalOlderThan).toHaveBeenCalledTimes(1);
		});

		it('should catch and log errors without throwing', async () => {
			outboxRepository.deleteTerminalOlderThan.mockRejectedValue(new Error('DB error'));

			await service.cleanup(new AbortController().signal);

			expect(logger.error).toHaveBeenCalled();
		});

		it('should emit a success metrics event with the total deleted count', async () => {
			outboxRepository.deleteTerminalOlderThan.mockResolvedValue(7);

			await service.cleanup(new AbortController().signal);

			expect(eventService.emit).toHaveBeenCalledWith(
				'workflow-publication-outbox-cleanup',
				expect.objectContaining({ result: 'success', deletedCount: 7 }),
			);
		});

		it('should emit a failure metrics event when cleanup throws', async () => {
			outboxRepository.deleteTerminalOlderThan.mockRejectedValue(new Error('DB error'));

			await service.cleanup(new AbortController().signal);

			expect(eventService.emit).toHaveBeenCalledWith(
				'workflow-publication-outbox-cleanup',
				expect.objectContaining({ result: 'failure', deletedCount: 0 }),
			);
		});
	});
});
