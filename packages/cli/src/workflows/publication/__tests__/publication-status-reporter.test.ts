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
import type { Publisher } from '@/scaling/pubsub/publisher.service';
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
	const publisher = mock<Publisher>();
	const triggerStatusRepository = mock<WorkflowPublicationTriggerStatusRepository>();
	const entityManager = mock<EntityManager>();

	const reporter = new PublicationStatusReporter(
		logger,
		errorReporter,
		outboxRepository,
		activationErrorsService,
		push,
		publisher,
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
		publisher.publishCommand.mockResolvedValue(undefined);
		(outboxRepository.manager.transaction as unknown as Mock).mockImplementation(
			async (runInTransaction: (trx: EntityManager) => Promise<unknown>) =>
				await runInTransaction(entityManager),
		);
	});

	test('completed writes trigger rows, marks the record completed, and clears activation errors', async () => {
		await reporter.report(makeRecord(), {
			type: 'completed',
			triggerStatuses: [
				{ nodeId: 'a', nodeName: 'Webhook', status: 'activated', triggerKind: 'persisted' },
				{ nodeId: 'b', nodeName: 'Schedule', status: 'activated', triggerKind: 'in-memory' },
			],
		});

		expect(triggerStatusRepository.replaceForWorkflow).toHaveBeenCalledWith(
			'wf-1',
			[
				{
					nodeId: 'a',
					versionId: 'v-2',
					status: 'activated',
					triggerKind: 'persisted',
					errorMessage: null,
				},
				{
					nodeId: 'b',
					versionId: 'v-2',
					status: 'activated',
					triggerKind: 'in-memory',
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
		expect(publisher.publishCommand).toHaveBeenCalledWith({
			command: 'display-workflow-publication-status',
			payload: {
				type: 'workflowActivated',
				data: { workflowId: 'wf-1', activeVersionId: 'v-2' },
			},
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
		expect(publisher.publishCommand).toHaveBeenCalledWith({
			command: 'display-workflow-publication-status',
			payload: { type: 'workflowDeactivated', data: { workflowId: 'wf-1' } },
		});
	});

	test('skipped (workflow-not-found) marks the record completed and clears activation errors', async () => {
		await reporter.report(makeRecord(), { type: 'skipped', reason: 'workflow-not-found' });

		expect(outboxRepository.markCompleted).toHaveBeenCalledWith(1, entityManager);
		expect(activationErrorsService.deregister).toHaveBeenCalledWith('wf-1');
		expect(outboxRepository.markFailed).not.toHaveBeenCalled();
		expect(push.broadcast).not.toHaveBeenCalled();
		expect(publisher.publishCommand).not.toHaveBeenCalled();
	});

	test('version-missing marks the record failed without reporting an error', async () => {
		await reporter.report(makeRecord(), { type: 'version-missing' });

		expect(outboxRepository.markFailed).toHaveBeenCalledWith(1, 'Published version not found');
		expect(errorReporter.error).not.toHaveBeenCalled();
		expect(activationErrorsService.deregister).not.toHaveBeenCalled();
		expect(push.broadcast).toHaveBeenCalledWith({
			type: 'workflowFailedToActivate',
			data: { workflowId: 'wf-1', errorMessage: 'Published version not found' },
		});
		expect(publisher.publishCommand).toHaveBeenCalledWith({
			command: 'display-workflow-publication-status',
			payload: {
				type: 'workflowFailedToActivate',
				data: { workflowId: 'wf-1', errorMessage: 'Published version not found' },
			},
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
		expect(publisher.publishCommand).toHaveBeenCalledWith({
			command: 'display-workflow-publication-status',
			payload: {
				type: 'workflowFailedToActivate',
				data: { workflowId: 'wf-1', errorMessage: 'registration failed' },
			},
		});
	});

	test('failed with triggerStatuses writes rows before marking failed', async () => {
		const error = new Error('partial registration failed');

		await reporter.report(makeRecord(), {
			type: 'failed',
			error,
			triggerStatuses: [
				{ nodeId: 'a', nodeName: 'Webhook', status: 'activated', triggerKind: 'persisted' },
				{
					nodeId: 'b',
					nodeName: 'Schedule',
					status: 'failed',
					triggerKind: 'in-memory',
					errorMessage: 'cron unavailable',
				},
			],
		});

		expect(triggerStatusRepository.replaceForWorkflow).toHaveBeenCalledWith(
			'wf-1',
			[
				{
					nodeId: 'a',
					versionId: 'v-2',
					status: 'activated',
					triggerKind: 'persisted',
					errorMessage: null,
				},
				{
					nodeId: 'b',
					versionId: 'v-2',
					status: 'failed',
					triggerKind: 'in-memory',
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
				{ nodeId: 'a', nodeName: 'Webhook', status: 'activated', triggerKind: 'persisted' },
				{
					nodeId: 'b',
					nodeName: 'Schedule',
					status: 'failed',
					triggerKind: 'in-memory',
					errorMessage: 'cron unavailable',
				},
				{
					nodeId: 'c',
					nodeName: 'Kafka',
					status: 'failed',
					triggerKind: 'in-memory',
					errorMessage: 'broker down',
				},
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
					triggerKind: 'persisted',
					errorMessage: null,
				},
				{
					nodeId: 'b',
					versionId: 'v-2',
					status: 'failed',
					triggerKind: 'in-memory',
					errorMessage: 'cron unavailable',
				},
				{
					nodeId: 'c',
					versionId: 'v-2',
					status: 'failed',
					triggerKind: 'in-memory',
					errorMessage: 'broker down',
				},
			],
			entityManager,
		);
		// CAT-3432: partial path must NOT register activation errors
		expect(activationErrorsService.register).not.toHaveBeenCalled();
		const expectedPushMsg = {
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
		};
		expect(push.broadcast).toHaveBeenCalledWith(expectedPushMsg);
		expect(publisher.publishCommand).toHaveBeenCalledWith({
			command: 'display-workflow-publication-status',
			payload: expectedPushMsg,
		});
		expect(outboxRepository.markCompleted).not.toHaveBeenCalled();
		expect(outboxRepository.markFailed).not.toHaveBeenCalled();
	});

	test('a failed pubsub relay is reported but does not fail the report', async () => {
		const publishError = new Error('redis unavailable');
		publisher.publishCommand.mockRejectedValue(publishError);

		await expect(reporter.report(makeRecord(), { type: 'unpublished' })).resolves.toBeUndefined();

		expect(push.broadcast).toHaveBeenCalledWith({
			type: 'workflowDeactivated',
			data: { workflowId: 'wf-1' },
		});
		expect(outboxRepository.markCompleted).toHaveBeenCalledWith(1, entityManager);
		// The rejection is handled asynchronously; flush the microtask queue.
		await new Promise(process.nextTick);
		expect(errorReporter.error).toHaveBeenCalledWith(publishError, { shouldBeLogged: true });
	});

	test('a relayed publication status is broadcast to local clients', () => {
		reporter.handleDisplayWorkflowPublicationStatus({
			type: 'workflowActivated',
			data: { workflowId: 'wf-1', activeVersionId: 'v-2' },
		});

		expect(push.broadcast).toHaveBeenCalledWith({
			type: 'workflowActivated',
			data: { workflowId: 'wf-1', activeVersionId: 'v-2' },
		});
		expect(publisher.publishCommand).not.toHaveBeenCalled();
	});
});
