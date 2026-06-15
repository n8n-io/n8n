import type { Logger } from '@n8n/backend-common';
import type { WorkflowPublicationOutbox, WorkflowPublicationOutboxRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { ErrorReporter } from 'n8n-core';

import type { ActivationErrorsService } from '@/activation-errors.service';
import type { PublicationResult } from '@/workflows/publication/publication-result';
import { PublicationStatusReporter } from '@/workflows/publication/publication-status-reporter';

describe('PublicationStatusReporter', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const errorReporter = mock<ErrorReporter>();
	const outboxRepository = mock<WorkflowPublicationOutboxRepository>();
	const activationErrorsService = mock<ActivationErrorsService>();

	const reporter = new PublicationStatusReporter(
		logger,
		errorReporter,
		outboxRepository,
		activationErrorsService,
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
		jest.clearAllMocks();
		outboxRepository.markCompleted.mockResolvedValue(undefined);
		outboxRepository.markFailed.mockResolvedValue(undefined);
		activationErrorsService.deregister.mockResolvedValue(undefined);
	});

	test('completed marks the record completed and clears activation errors', async () => {
		await reporter.report(makeRecord(), { type: 'completed' });

		expect(outboxRepository.markCompleted).toHaveBeenCalledWith(1);
		expect(activationErrorsService.deregister).toHaveBeenCalledWith('wf-1');
		expect(outboxRepository.markFailed).not.toHaveBeenCalled();
	});

	test.each([['workflow-not-found'], ['workflow-inactive']] as const)(
		'skipped (%s) marks the record completed and clears activation errors',
		async (reason) => {
			await reporter.report(makeRecord(), { type: 'skipped', reason });

			expect(outboxRepository.markCompleted).toHaveBeenCalledWith(1);
			expect(activationErrorsService.deregister).toHaveBeenCalledWith('wf-1');
			expect(outboxRepository.markFailed).not.toHaveBeenCalled();
		},
	);

	test('version-missing marks the record failed without reporting an error', async () => {
		await reporter.report(makeRecord(), { type: 'version-missing' });

		expect(outboxRepository.markFailed).toHaveBeenCalledWith(1, 'Published version not found');
		expect(errorReporter.error).not.toHaveBeenCalled();
		expect(activationErrorsService.deregister).not.toHaveBeenCalled();
	});

	test('failed reports the error and marks the record failed with its message', async () => {
		const error = new Error('registration failed');

		await reporter.report(makeRecord(), { type: 'failed', error });

		expect(errorReporter.error).toHaveBeenCalledWith(error, { shouldBeLogged: true });
		expect(outboxRepository.markFailed).toHaveBeenCalledWith(1, 'registration failed');
		expect(outboxRepository.markCompleted).not.toHaveBeenCalled();
	});

	test('partial is not handled yet and surfaces as an error', async () => {
		const result: PublicationResult = { type: 'partial', error: new Error('partial') };

		await expect(reporter.report(makeRecord(), result)).rejects.toThrow(
			'Partial workflow publication results are not handled yet',
		);
		expect(outboxRepository.markFailed).not.toHaveBeenCalled();
		expect(outboxRepository.markCompleted).not.toHaveBeenCalled();
	});
});
