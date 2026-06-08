import type { Logger } from '@n8n/backend-common';
import type { WorkflowsConfig } from '@n8n/config';
import { WorkflowPublishedVersion } from '@n8n/db';
import type {
	WorkflowEntity,
	WorkflowPublicationOutbox,
	WorkflowPublicationOutboxRepository,
	WorkflowRepository,
} from '@n8n/db';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import type { ErrorReporter } from 'n8n-core';

import type { ActivationErrorsService } from '@/activation-errors.service';
import type { ActiveWorkflowManager } from '@/active-workflow-manager';
import { WorkflowPublicationOutboxConsumer } from '@/workflows/workflow-publication-outbox-consumer';

describe('WorkflowPublicationOutboxConsumer', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const errorReporter = mock<ErrorReporter>();
	const outboxRepository = mock<WorkflowPublicationOutboxRepository>();
	const workflowRepository = mock<WorkflowRepository>();
	const activeWorkflowManager = mock<ActiveWorkflowManager>();
	const activationErrorsService = mock<ActivationErrorsService>();
	const entityManager = mock<EntityManager>();

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
			workflowRepository,
			activeWorkflowManager,
			activationErrorsService,
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

	function makeWorkflow(overrides: Partial<WorkflowEntity> = {}): WorkflowEntity {
		return {
			id: 'wf-1',
			active: true,
			activeVersionId: 'v-1',
			...overrides,
		} as WorkflowEntity;
	}

	/** Pin all tracked mock functions so jest-mock-extended Proxy returns stable instances. */
	function setupDefaultMocks() {
		workflowRepository.findById.mockResolvedValue(null);
		workflowRepository.update.mockResolvedValue({} as never);
		activeWorkflowManager.remove.mockResolvedValue(undefined);
		activeWorkflowManager.clearWebhooks.mockResolvedValue(undefined);
		activeWorkflowManager.removeActivationError.mockResolvedValue(undefined);
		activeWorkflowManager.removeNonWebhookTriggers.mockResolvedValue(undefined);
		activeWorkflowManager.add.mockResolvedValue({ webhooks: true, triggersAndPollers: true });
		outboxRepository.claimNextPendingRecord.mockResolvedValue(null);
		outboxRepository.markCompleted.mockResolvedValue(undefined);
		outboxRepository.markFailed.mockResolvedValue(undefined);
		entityManager.upsert.mockResolvedValue({} as never);
		Object.defineProperty(outboxRepository, 'manager', {
			value: entityManager,
			writable: true,
		});
		activationErrorsService.register.mockResolvedValue(undefined);
		activationErrorsService.deregister.mockResolvedValue(undefined);
	}

	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
		setupDefaultMocks();
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
		test('removes old triggers, updates version, adds new triggers, finalizes', async () => {
			const record = makeRecord();
			workflowRepository.findById.mockResolvedValue(makeWorkflow());

			const callOrder: string[] = [];
			activeWorkflowManager.clearWebhooks.mockImplementation(async () => {
				callOrder.push('clearWebhooks');
				return await Promise.resolve();
			});
			activeWorkflowManager.removeNonWebhookTriggers.mockImplementation(async () => {
				callOrder.push('removeNonWebhookTriggers');
				return await Promise.resolve();
			});
			entityManager.upsert.mockImplementation(async () => {
				callOrder.push('advanceVersion');
				return await Promise.resolve({} as never);
			});
			activeWorkflowManager.add.mockImplementation(async () => {
				callOrder.push('add');
				return await Promise.resolve({ webhooks: true, triggersAndPollers: true });
			});

			await consumer.processRecord(record);

			expect(activeWorkflowManager.clearWebhooks).toHaveBeenCalledWith('wf-1');
			expect(activeWorkflowManager.removeActivationError).toHaveBeenCalledWith('wf-1');
			expect(activeWorkflowManager.removeNonWebhookTriggers).toHaveBeenCalledWith('wf-1');
			expect(workflowRepository.update).not.toHaveBeenCalledWith('wf-1', {
				activeVersionId: 'v-2',
			});
			expect(entityManager.upsert).toHaveBeenCalledWith(
				WorkflowPublishedVersion,
				{ workflowId: 'wf-1', publishedVersionId: 'v-2' },
				['workflowId'],
			);
			expect(activeWorkflowManager.add).toHaveBeenCalledWith('wf-1', 'update', undefined, {
				shouldPublish: false,
			});
			expect(outboxRepository.markCompleted).toHaveBeenCalledWith(1);
			expect(activationErrorsService.deregister).toHaveBeenCalledWith('wf-1');
			expect(callOrder).toEqual([
				'clearWebhooks',
				'removeNonWebhookTriggers',
				'advanceVersion',
				'add',
			]);
		});

		test('marks completed when workflow not found', async () => {
			const record = makeRecord();
			workflowRepository.findById.mockResolvedValue(null);

			await consumer.processRecord(record);

			expect(outboxRepository.markCompleted).toHaveBeenCalledWith(1);
			expect(activeWorkflowManager.clearWebhooks).not.toHaveBeenCalled();
			expect(activeWorkflowManager.removeNonWebhookTriggers).not.toHaveBeenCalled();
			expect(activeWorkflowManager.add).not.toHaveBeenCalled();
		});

		test('marks completed when workflow is not active', async () => {
			const record = makeRecord();
			workflowRepository.findById.mockResolvedValue(
				makeWorkflow({ active: false, activeVersionId: null }),
			);

			await consumer.processRecord(record);

			expect(outboxRepository.markCompleted).toHaveBeenCalledWith(1);
			expect(activeWorkflowManager.clearWebhooks).not.toHaveBeenCalled();
			expect(activeWorkflowManager.removeNonWebhookTriggers).not.toHaveBeenCalled();
		});

		test('finalizes without trigger reapply when version already matches', async () => {
			const record = makeRecord({ publishedVersionId: 'v-1' });
			workflowRepository.findById.mockResolvedValue(makeWorkflow({ activeVersionId: 'v-1' }));

			await consumer.processRecord(record);

			expect(outboxRepository.markCompleted).toHaveBeenCalledWith(1);
			expect(entityManager.upsert).toHaveBeenCalledWith(
				WorkflowPublishedVersion,
				{ workflowId: 'wf-1', publishedVersionId: 'v-1' },
				['workflowId'],
			);
			expect(activeWorkflowManager.clearWebhooks).not.toHaveBeenCalled();
			expect(activeWorkflowManager.removeNonWebhookTriggers).not.toHaveBeenCalled();
			expect(activeWorkflowManager.add).not.toHaveBeenCalled();
		});

		test('marks failed when non-webhook trigger teardown throws', async () => {
			const record = makeRecord();
			workflowRepository.findById.mockResolvedValue(makeWorkflow());
			activeWorkflowManager.removeNonWebhookTriggers.mockRejectedValue(
				new Error('trigger cleanup failed'),
			);

			await consumer.processRecord(record);

			expect(outboxRepository.markFailed).toHaveBeenCalledWith(1, 'trigger cleanup failed');
			expect(entityManager.upsert).not.toHaveBeenCalled();
			expect(activeWorkflowManager.add).not.toHaveBeenCalled();
		});

		test('rolls back and marks failed when registerNewTriggers throws', async () => {
			const record = makeRecord();
			workflowRepository.findById.mockResolvedValue(makeWorkflow());
			activeWorkflowManager.add.mockRejectedValue(new Error('trigger registration failed'));

			await consumer.processRecord(record);

			expect(activeWorkflowManager.clearWebhooks).toHaveBeenCalledWith('wf-1');
			expect(activeWorkflowManager.removeNonWebhookTriggers).toHaveBeenCalledWith('wf-1');
			expect(activeWorkflowManager.add).toHaveBeenCalled();

			// Rollback: deactivate workflow
			expect(workflowRepository.update).toHaveBeenCalledWith('wf-1', {
				active: false,
				activeVersionId: null,
			});
			expect(activationErrorsService.register).toHaveBeenCalledWith(
				'wf-1',
				'trigger registration failed',
			);
			expect(outboxRepository.markFailed).toHaveBeenCalledWith(1, 'trigger registration failed');
		});
	});
});
