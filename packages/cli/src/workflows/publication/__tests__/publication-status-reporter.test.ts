import type { Logger } from '@n8n/backend-common';
import type { WorkflowPublicationOutbox, WorkflowPublicationOutboxRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';
import type { ErrorReporter } from 'n8n-core';

import type { ActivationErrorsService } from '@/activation-errors.service';
import type { Push } from '@/push';
import { PublicationStatusReporter } from '@/workflows/publication/publication-status-reporter';

describe('PublicationStatusReporter', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const errorReporter = mock<ErrorReporter>();
	const outboxRepository = mock<WorkflowPublicationOutboxRepository>();
	const activationErrorsService = mock<ActivationErrorsService>();
	const push = mock<Push>();

	const reporter = new PublicationStatusReporter(
		logger,
		errorReporter,
		outboxRepository,
		activationErrorsService,
		push,
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
	});

	test('completed marks the record completed and clears activation errors', async () => {
		await reporter.report(makeRecord(), { type: 'completed' });

		expect(outboxRepository.markCompleted).toHaveBeenCalledWith(1);
		expect(activationErrorsService.deregister).toHaveBeenCalledWith('wf-1');
		expect(outboxRepository.markFailed).not.toHaveBeenCalled();
		expect(push.broadcast).toHaveBeenCalledWith({
			type: 'workflowActivated',
			data: { workflowId: 'wf-1', activeVersionId: 'v-2' },
		});
	});

	test('unpublished marks the record completed, clears errors, and pushes deactivation', async () => {
		await reporter.report(makeRecord(), { type: 'unpublished' });

		expect(outboxRepository.markCompleted).toHaveBeenCalledWith(1);
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

			expect(outboxRepository.markCompleted).toHaveBeenCalledWith(1);
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

		expect(errorReporter.error).toHaveBeenCalledWith(error, { shouldBeLogged: true });
		expect(outboxRepository.markFailed).toHaveBeenCalledWith(1, 'registration failed');
		expect(outboxRepository.markCompleted).not.toHaveBeenCalled();
		expect(push.broadcast).toHaveBeenCalledWith({
			type: 'workflowFailedToActivate',
			data: { workflowId: 'wf-1', errorMessage: 'registration failed' },
		});
	});

	test('partial marks partial_success, registers per-node detail, and pushes the failures', async () => {
		await reporter.report(makeRecord(), {
			type: 'partial',
			activatedNodeIds: ['a'],
			failures: [
				{ nodeId: 'b', nodeName: 'Schedule', error: new Error('cron unavailable') },
				{ nodeId: 'c', nodeName: 'Kafka', error: new Error('broker down') },
			],
		});

		const expectedMessage =
			'Some triggers failed to activate: "Schedule": cron unavailable; "Kafka": broker down';

		expect(outboxRepository.markPartialSuccess).toHaveBeenCalledWith(1, expectedMessage);
		expect(activationErrorsService.register).toHaveBeenCalledWith('wf-1', expectedMessage);
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
