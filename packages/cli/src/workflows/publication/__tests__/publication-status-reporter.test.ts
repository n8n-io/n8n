import type { Logger } from '@n8n/backend-common';
import type {
	EntityManager,
	WorkflowPublicationOutbox,
	WorkflowPublicationOutboxRepository,
	WorkflowPublicationTriggerStatusRepository,
} from '@n8n/db';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';
import type { ErrorReporter } from 'n8n-core';

import type { ActivationErrorsService } from '@/activation-errors.service';
import type { Push } from '@/push';
import { PublicationStatusReporter } from '@/workflows/publication/publication-status-reporter';

describe('PublicationStatusReporter', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const errorReporter = mock<ErrorReporter>();
	const outboxRepository = mock<WorkflowPublicationOutboxRepository>({
		manager: mock<EntityManager>(),
	});
	const activationErrorsService = mock<ActivationErrorsService>();
	const push = mock<Push>();
	const triggerStatusRepository = mock<WorkflowPublicationTriggerStatusRepository>();
	const entityManager = mock<EntityManager>();

	const reporter = new PublicationStatusReporter(
		logger,
		errorReporter,
		outboxRepository,
		activationErrorsService,
		push,
		triggerStatusRepository,
	);

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
		outboxRepository.markCompleted.mockResolvedValue(undefined);
		outboxRepository.markFailed.mockResolvedValue(undefined);
		outboxRepository.markPartialSuccess.mockResolvedValue(undefined);
		activationErrorsService.deregister.mockResolvedValue(undefined);
		activationErrorsService.register.mockResolvedValue(undefined);
		triggerStatusRepository.replaceForWorkflow.mockResolvedValue(undefined);
		(outboxRepository.manager.transaction as unknown as Mock).mockImplementation(
			async (runInTransaction: (trx: EntityManager) => Promise<unknown>) =>
				await runInTransaction(entityManager),
		);
	});

	test('completed writes trigger rows, marks the record completed, and clears activation errors', async () => {
		await reporter.report(makeRecord(), {
			type: 'completed',
			triggerStatuses: [
				{ nodeId: 'a', nodeName: 'Webhook', status: 'activated' },
				{ nodeId: 'b', nodeName: 'Schedule', status: 'activated' },
			],
		});

		expect(triggerStatusRepository.replaceForWorkflow).toHaveBeenCalledWith(
			'wf-1',
			[
				{
					nodeId: 'a',
					versionId: 'v-2',
					status: 'activated',
					errorMessage: null,
				},
				{
					nodeId: 'b',
					versionId: 'v-2',
					status: 'activated',
					errorMessage: null,
				},
			],
			entityManager,
		);
		expect(outboxRepository.markCompleted).toHaveBeenCalledWith(1, entityManager);
		expect(activationErrorsService.deregister).toHaveBeenCalledWith('wf-1');
		expect(outboxRepository.markFailed).not.toHaveBeenCalled();
		expect(push.broadcast).toHaveBeenCalledWith({
			type: 'workflowActivated',
			data: { workflowId: 'wf-1', activeVersionId: 'v-2' },
		});
	});

	test('unpublished clears trigger rows, marks the record completed, clears errors, and pushes deactivation', async () => {
		await reporter.report(makeRecord(), { type: 'unpublished' });

		expect(triggerStatusRepository.replaceForWorkflow).toHaveBeenCalledWith(
			'wf-1',
			[],
			entityManager,
		);
		expect(outboxRepository.markCompleted).toHaveBeenCalledWith(1, entityManager);
		expect(activationErrorsService.deregister).toHaveBeenCalledWith('wf-1');
		expect(outboxRepository.markFailed).not.toHaveBeenCalled();
		expect(push.broadcast).toHaveBeenCalledWith({
			type: 'workflowDeactivated',
			data: { workflowId: 'wf-1' },
		});
	});

	test.each([['workflow-not-found'], ['workflow-inactive']] as const)(
		'skipped (%s) marks the record completed and clears activation errors',
		async (reason) => {
			await reporter.report(makeRecord(), { type: 'skipped', reason });

			expect(outboxRepository.markCompleted).toHaveBeenCalledWith(1, entityManager);
			expect(activationErrorsService.deregister).toHaveBeenCalledWith('wf-1');
			expect(outboxRepository.markFailed).not.toHaveBeenCalled();
			expect(push.broadcast).not.toHaveBeenCalled();
		},
	);

	test('version-missing marks the record failed without reporting an error', async () => {
		await reporter.report(makeRecord(), { type: 'version-missing' });

		expect(outboxRepository.markFailed).toHaveBeenCalledWith(1, 'Published version not found');
		expect(errorReporter.error).not.toHaveBeenCalled();
		expect(activationErrorsService.deregister).not.toHaveBeenCalled();
		expect(push.broadcast).toHaveBeenCalledWith({
			type: 'workflowFailedToActivate',
			data: { workflowId: 'wf-1', errorMessage: 'Published version not found' },
		});
	});

	test('failed reports the error and marks the record failed with its message', async () => {
		const error = new Error('registration failed');

		await reporter.report(makeRecord(), { type: 'failed', error });

		expect(triggerStatusRepository.replaceForWorkflow).not.toHaveBeenCalled();
		expect(errorReporter.error).toHaveBeenCalledWith(error, { shouldBeLogged: true });
		expect(outboxRepository.markFailed).toHaveBeenCalledWith(
			1,
			'registration failed',
			entityManager,
		);
		expect(outboxRepository.markCompleted).not.toHaveBeenCalled();
		expect(push.broadcast).toHaveBeenCalledWith({
			type: 'workflowFailedToActivate',
			data: { workflowId: 'wf-1', errorMessage: 'registration failed' },
		});
	});

	test('failed with triggerStatuses writes rows before marking failed', async () => {
		const error = new Error('partial registration failed');

		await reporter.report(makeRecord(), {
			type: 'failed',
			error,
			triggerStatuses: [
				{ nodeId: 'a', nodeName: 'Webhook', status: 'activated' },
				{ nodeId: 'b', nodeName: 'Schedule', status: 'failed', errorMessage: 'cron unavailable' },
			],
		});

		expect(triggerStatusRepository.replaceForWorkflow).toHaveBeenCalledWith(
			'wf-1',
			[
				{
					nodeId: 'a',
					versionId: 'v-2',
					status: 'activated',
					errorMessage: null,
				},
				{
					nodeId: 'b',
					versionId: 'v-2',
					status: 'failed',
					errorMessage: 'cron unavailable',
				},
			],
			entityManager,
		);
		expect(outboxRepository.markFailed).toHaveBeenCalledWith(
			1,
			'partial registration failed',
			entityManager,
		);
	});

	test('partial marks partial_success, writes all trigger rows, and pushes the failures without registering activation errors', async () => {
		await reporter.report(makeRecord(), {
			type: 'partial',
			triggerStatuses: [
				{ nodeId: 'a', nodeName: 'Webhook', status: 'activated' },
				{ nodeId: 'b', nodeName: 'Schedule', status: 'failed', errorMessage: 'cron unavailable' },
				{ nodeId: 'c', nodeName: 'Kafka', status: 'failed', errorMessage: 'broker down' },
			],
		});

		const expectedMessage =
			'Some triggers failed to activate: "Schedule": cron unavailable; "Kafka": broker down';

		expect(outboxRepository.markPartialSuccess).toHaveBeenCalledWith(
			1,
			expectedMessage,
			entityManager,
		);
		expect(triggerStatusRepository.replaceForWorkflow).toHaveBeenCalledWith(
			'wf-1',
			[
				{
					nodeId: 'a',
					versionId: 'v-2',
					status: 'activated',
					errorMessage: null,
				},
				{
					nodeId: 'b',
					versionId: 'v-2',
					status: 'failed',
					errorMessage: 'cron unavailable',
				},
				{
					nodeId: 'c',
					versionId: 'v-2',
					status: 'failed',
					errorMessage: 'broker down',
				},
			],
			entityManager,
		);
		// CAT-3432: partial path must NOT register activation errors
		expect(activationErrorsService.register).not.toHaveBeenCalled();
		expect(push.broadcast).toHaveBeenCalledWith({
			type: 'workflowPartiallyActivated',
			data: {
				workflowId: 'wf-1',
				activeVersionId: 'v-2',
				errorMessage: expectedMessage,
				failedNodes: [
					{ nodeId: 'b', nodeName: 'Schedule', errorMessage: 'cron unavailable' },
					{ nodeId: 'c', nodeName: 'Kafka', errorMessage: 'broker down' },
				],
			},
		});
		expect(outboxRepository.markCompleted).not.toHaveBeenCalled();
		expect(outboxRepository.markFailed).not.toHaveBeenCalled();
	});
});
