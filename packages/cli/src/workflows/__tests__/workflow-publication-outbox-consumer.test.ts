import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type {
	WorkflowPublicationOutbox,
	WorkflowPublicationOutboxRepository,
	WorkflowRepository,
	WorkflowEntity,
} from '@n8n/db';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';

import type { ActivationErrorsService } from '@/activation-errors.service';
import type { ActiveWorkflowManager } from '@/active-workflow-manager';
import { WorkflowPublicationOutboxConsumer } from '@/workflows/workflow-publication-outbox-consumer';

describe('WorkflowPublicationOutboxConsumer', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const outboxRepository = mock<WorkflowPublicationOutboxRepository>();
	const workflowRepository = mock<WorkflowRepository>();
	const activeWorkflowManager = mock<ActiveWorkflowManager>();
	const activationErrorsService = mock<ActivationErrorsService>();

	let consumer: WorkflowPublicationOutboxConsumer;

	function createConsumer(useWorkflowPublicationService = true) {
		const globalConfig = mock<GlobalConfig>({
			workflows: { useWorkflowPublicationService },
		});
		return new WorkflowPublicationOutboxConsumer(
			logger,
			globalConfig,
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
		activeWorkflowManager.add.mockResolvedValue({ webhooks: true, triggersAndPollers: true });
		outboxRepository.markCompleted.mockResolvedValue(undefined);
		outboxRepository.markFailed.mockResolvedValue(undefined);
		Object.defineProperty(outboxRepository, 'manager', {
			value: {
				transaction: jest.fn(
					async (fn: (trx: EntityManager) => Promise<void>) => await fn(mock<EntityManager>()),
				),
			},
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
			activeWorkflowManager.remove.mockImplementation(async () => {
				callOrder.push('remove');
			});
			workflowRepository.update.mockImplementation(async () => {
				callOrder.push('update');
				return {} as never;
			});
			activeWorkflowManager.add.mockImplementation(async () => {
				callOrder.push('add');
				return { webhooks: true, triggersAndPollers: true };
			});

			await consumer.processRecord(record);

			expect(activeWorkflowManager.remove).toHaveBeenCalledWith('wf-1');
			expect(workflowRepository.update).toHaveBeenCalledWith('wf-1', {
				activeVersionId: 'v-2',
			});
			expect(activeWorkflowManager.add).toHaveBeenCalledWith('wf-1', 'update', undefined, {
				shouldPublish: false,
			});
			expect(activationErrorsService.deregister).toHaveBeenCalledWith('wf-1');
			expect(callOrder).toEqual(['remove', 'update', 'add']);
		});

		test('marks completed when workflow not found', async () => {
			const record = makeRecord();
			workflowRepository.findById.mockResolvedValue(null);

			await consumer.processRecord(record);

			expect(outboxRepository.markCompleted).toHaveBeenCalledWith(1);
			expect(activeWorkflowManager.remove).not.toHaveBeenCalled();
			expect(activeWorkflowManager.add).not.toHaveBeenCalled();
		});

		test('marks completed when workflow is not active', async () => {
			const record = makeRecord();
			workflowRepository.findById.mockResolvedValue(
				makeWorkflow({ active: false, activeVersionId: null }),
			);

			await consumer.processRecord(record);

			expect(outboxRepository.markCompleted).toHaveBeenCalledWith(1);
			expect(activeWorkflowManager.remove).not.toHaveBeenCalled();
		});

		test('finalizes without trigger reapply when version already matches', async () => {
			const record = makeRecord({ publishedVersionId: 'v-1' });
			workflowRepository.findById.mockResolvedValue(makeWorkflow({ activeVersionId: 'v-1' }));

			await consumer.processRecord(record);

			expect(outboxRepository.manager.transaction).toHaveBeenCalled();
			expect(activeWorkflowManager.remove).not.toHaveBeenCalled();
			expect(activeWorkflowManager.add).not.toHaveBeenCalled();
		});

		test('marks failed when tearDownOldTriggers throws', async () => {
			const record = makeRecord();
			workflowRepository.findById.mockResolvedValue(makeWorkflow());
			activeWorkflowManager.remove.mockRejectedValue(new Error('webhook cleanup failed'));

			await consumer.processRecord(record);

			expect(outboxRepository.markFailed).toHaveBeenCalledWith(1, 'webhook cleanup failed');
			expect(workflowRepository.update).not.toHaveBeenCalled();
			expect(activeWorkflowManager.add).not.toHaveBeenCalled();
		});

		test('rolls back and marks failed when registerNewTriggers throws', async () => {
			const record = makeRecord();
			workflowRepository.findById.mockResolvedValue(makeWorkflow());
			activeWorkflowManager.add.mockRejectedValue(new Error('trigger registration failed'));

			await consumer.processRecord(record);

			expect(activeWorkflowManager.remove).toHaveBeenCalledWith('wf-1');
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
