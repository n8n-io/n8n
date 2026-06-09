import type { Logger } from '@n8n/backend-common';
import type { WorkflowsConfig } from '@n8n/config';
import { WorkflowPublishedVersion } from '@n8n/db';
import type {
	WorkflowEntity,
	WorkflowHistory,
	WorkflowPublicationOutbox,
	WorkflowPublicationOutboxRepository,
	WorkflowPublishedVersionRepository,
	WorkflowHistoryRepository,
	WorkflowRepository,
} from '@n8n/db';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import type { ErrorReporter } from 'n8n-core';
import type { INode } from 'n8n-workflow';

import type { ActivationErrorsService } from '@/activation-errors.service';
import type { ActiveWorkflowManager } from '@/active-workflow-manager';
import { WorkflowPublicationOutboxConsumer } from '@/workflows/workflow-publication-outbox-consumer';

describe('WorkflowPublicationOutboxConsumer', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const errorReporter = mock<ErrorReporter>();
	const outboxRepository = mock<WorkflowPublicationOutboxRepository>();
	const workflowRepository = mock<WorkflowRepository>();
	const workflowHistoryRepository = mock<WorkflowHistoryRepository>();
	const workflowPublishedVersionRepository = mock<WorkflowPublishedVersionRepository>();
	const activeWorkflowManager = mock<ActiveWorkflowManager>();
	const activationErrorsService = mock<ActivationErrorsService>();

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
			workflowHistoryRepository,
			workflowPublishedVersionRepository,
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
			activeVersionId: 'v-2',
			...overrides,
		} as WorkflowEntity;
	}

	function makeVersion(versionId: string): WorkflowHistory {
		return {
			versionId,
			workflowId: 'wf-1',
			nodes: [],
			connections: {},
		} as unknown as WorkflowHistory;
	}

	function triggerNode(id: string, overrides: Partial<INode> = {}): INode {
		return {
			id,
			name: id,
			type: 'n8n-nodes-base.scheduleTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			...overrides,
		};
	}

	const newVersion = makeVersion('v-2');
	const oldVersion = makeVersion('v-1');

	/** Drives the trigger diff: first call returns old triggers, second returns new. */
	function setTriggerSets(oldTriggers: INode[], newTriggers: INode[]) {
		activeWorkflowManager.getEnabledTriggerNodes
			.mockReturnValueOnce(oldTriggers)
			.mockReturnValueOnce(newTriggers);
	}

	/** Pin all tracked mock functions so jest-mock-extended Proxy returns stable instances. */
	function setupDefaultMocks() {
		workflowRepository.findById.mockResolvedValue(makeWorkflow());
		workflowRepository.update.mockResolvedValue({} as never);
		workflowHistoryRepository.findOneBy.mockResolvedValue(newVersion);
		workflowPublishedVersionRepository.getPublishedVersionWithRelations.mockResolvedValue({
			workflowId: 'wf-1',
			publishedVersionId: 'v-1',
			publishedVersion: oldVersion,
		} as never);
		activeWorkflowManager.getEnabledTriggerNodes.mockReturnValue([]);
		activeWorkflowManager.addTriggerNodes.mockResolvedValue(undefined);
		activeWorkflowManager.removeTriggerNodes.mockResolvedValue(undefined);
		outboxRepository.claimNextPendingRecord.mockResolvedValue(null);
		outboxRepository.markCompleted.mockResolvedValue(undefined);
		outboxRepository.markFailed.mockResolvedValue(undefined);
		Object.defineProperty(outboxRepository, 'manager', {
			value: mock<EntityManager>({ upsert: jest.fn() }),
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
		test('marks completed when workflow not found', async () => {
			workflowRepository.findById.mockResolvedValue(null);

			await consumer.processRecord(makeRecord());

			expect(outboxRepository.markCompleted).toHaveBeenCalledWith(1);
			expect(activeWorkflowManager.getEnabledTriggerNodes).not.toHaveBeenCalled();
			expect(activeWorkflowManager.addTriggerNodes).not.toHaveBeenCalled();
			expect(activeWorkflowManager.removeTriggerNodes).not.toHaveBeenCalled();
		});

		test('marks completed when workflow is not active', async () => {
			workflowRepository.findById.mockResolvedValue(
				makeWorkflow({ active: false, activeVersionId: null }),
			);

			await consumer.processRecord(makeRecord());

			expect(outboxRepository.markCompleted).toHaveBeenCalledWith(1);
			expect(activeWorkflowManager.getEnabledTriggerNodes).not.toHaveBeenCalled();
		});

		test('marks completed when the published version is not found', async () => {
			workflowHistoryRepository.findOneBy.mockResolvedValue(null);

			await consumer.processRecord(makeRecord());

			expect(outboxRepository.markCompleted).toHaveBeenCalledWith(1);
			expect(activeWorkflowManager.getEnabledTriggerNodes).not.toHaveBeenCalled();
			expect(activeWorkflowManager.addTriggerNodes).not.toHaveBeenCalled();
		});

		test('advances the published version and finalizes when no triggers changed', async () => {
			const trigger = triggerNode('a');
			setTriggerSets([trigger], [{ ...trigger }]);

			await consumer.processRecord(makeRecord());

			expect(outboxRepository.manager.upsert).toHaveBeenCalledWith(
				WorkflowPublishedVersion,
				{ workflowId: 'wf-1', publishedVersionId: 'v-2' },
				['workflowId'],
			);
			expect(activeWorkflowManager.removeTriggerNodes).not.toHaveBeenCalled();
			expect(activeWorkflowManager.addTriggerNodes).not.toHaveBeenCalled();
			expect(outboxRepository.markCompleted).toHaveBeenCalledWith(1);
			expect(activationErrorsService.deregister).toHaveBeenCalledWith('wf-1');
		});

		test('registers only added triggers', async () => {
			setTriggerSets([triggerNode('a')], [triggerNode('a'), triggerNode('b')]);

			await consumer.processRecord(makeRecord());

			expect(activeWorkflowManager.removeTriggerNodes).not.toHaveBeenCalled();
			expect(activeWorkflowManager.addTriggerNodes).toHaveBeenCalledWith('wf-1', newVersion, ['b']);
			expect(outboxRepository.manager.upsert).toHaveBeenCalled();
			expect(outboxRepository.markCompleted).toHaveBeenCalledWith(1);
		});

		test('deregisters only removed triggers', async () => {
			setTriggerSets([triggerNode('a'), triggerNode('b')], [triggerNode('a')]);

			await consumer.processRecord(makeRecord());

			expect(activeWorkflowManager.removeTriggerNodes).toHaveBeenCalledWith('wf-1', oldVersion, [
				'b',
			]);
			expect(activeWorkflowManager.addTriggerNodes).not.toHaveBeenCalled();
			expect(outboxRepository.markCompleted).toHaveBeenCalledWith(1);
		});

		test('reapplies modified triggers as remove-then-add, advancing in between', async () => {
			setTriggerSets(
				[triggerNode('a', { parameters: { interval: 1 } })],
				[triggerNode('a', { parameters: { interval: 5 } })],
			);

			const callOrder: string[] = [];
			activeWorkflowManager.removeTriggerNodes.mockImplementation(async () => {
				callOrder.push('remove');
			});
			(outboxRepository.manager.upsert as jest.Mock).mockImplementation(async () => {
				callOrder.push('advance');
				return await Promise.resolve({} as never);
			});
			activeWorkflowManager.addTriggerNodes.mockImplementation(async () => {
				callOrder.push('add');
			});

			await consumer.processRecord(makeRecord());

			expect(activeWorkflowManager.removeTriggerNodes).toHaveBeenCalledWith('wf-1', oldVersion, [
				'a',
			]);
			expect(activeWorkflowManager.addTriggerNodes).toHaveBeenCalledWith('wf-1', newVersion, ['a']);
			expect(callOrder).toEqual(['remove', 'advance', 'add']);
			expect(outboxRepository.markCompleted).toHaveBeenCalledWith(1);
		});

		test('marks failed without advancing when removing triggers throws', async () => {
			setTriggerSets([triggerNode('a'), triggerNode('b')], [triggerNode('a')]);
			activeWorkflowManager.removeTriggerNodes.mockRejectedValue(new Error('teardown failed'));

			await consumer.processRecord(makeRecord());

			expect(outboxRepository.markFailed).toHaveBeenCalledWith(1, 'teardown failed');
			expect(outboxRepository.manager.upsert).not.toHaveBeenCalled();
			expect(activeWorkflowManager.addTriggerNodes).not.toHaveBeenCalled();
		});

		test('rolls back and marks failed when adding triggers throws', async () => {
			setTriggerSets([triggerNode('a')], [triggerNode('a'), triggerNode('b')]);
			activeWorkflowManager.addTriggerNodes.mockRejectedValue(new Error('registration failed'));

			await consumer.processRecord(makeRecord());

			expect(outboxRepository.manager.upsert).toHaveBeenCalled();
			expect(workflowRepository.update).toHaveBeenCalledWith('wf-1', {
				active: false,
				activeVersionId: null,
			});
			expect(activationErrorsService.register).toHaveBeenCalledWith('wf-1', 'registration failed');
			expect(outboxRepository.markFailed).toHaveBeenCalledWith(1, 'registration failed');
		});

		test('treats a first publication (no current published version) as all-added', async () => {
			workflowPublishedVersionRepository.getPublishedVersionWithRelations.mockResolvedValue(null);
			setTriggerSets([], [triggerNode('a')]);

			await consumer.processRecord(makeRecord());

			expect(activeWorkflowManager.removeTriggerNodes).not.toHaveBeenCalled();
			expect(activeWorkflowManager.addTriggerNodes).toHaveBeenCalledWith('wf-1', newVersion, ['a']);
			expect(outboxRepository.markCompleted).toHaveBeenCalledWith(1);
		});
	});
});
