import type { UpdateWorkflowPublicDto, UpdateWorkflowQueryDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { PolicyViolationError } from '@/policy/policy-violation.error';
import type { WorkflowService } from '@/workflows/workflow.service';

import { WorkflowsPublicController } from '../workflows.public.controller';

describe('WorkflowsPublicController', () => {
	let controller: WorkflowsPublicController;
	const workflowService = mock<WorkflowService>();

	beforeEach(() => {
		vi.clearAllMocks();
		controller = new WorkflowsPublicController(
			mock(), // workflowHistoryService
			mock(), // workflowFinderService
			mock(), // workflowCreationService
			workflowService,
			mock(), // enterpriseWorkflowService
			mock(), // eventService
			mock(), // globalConfig
			mock(), // tagService
			mock(), // redactionEnforcementService
		);
	});

	const updateWorkflow = async () =>
		await controller.updateWorkflow(
			mock<AuthenticatedRequest>(),
			mock<Response>(),
			'workflow-id',
			mock<UpdateWorkflowPublicDto>(),
			mock<UpdateWorkflowQueryDto>(),
		);

	describe('updateWorkflow error mapping', () => {
		// The legacy handler answered 400 with the message for anything it did not recognise.
		// Integration tests cover the errors the service raises on purpose; these two cover what
		// happens when it raises something else.
		it('answers 400 for an unexpected error', async () => {
			workflowService.update.mockRejectedValue(new Error('the database went away'));

			await expect(updateWorkflow()).rejects.toThrow(BadRequestError);
			await expect(updateWorkflow()).rejects.toThrow('the database went away');
		});

		it('rethrows a value that is not an Error', async () => {
			workflowService.update.mockRejectedValue('not an error object');

			await expect(updateWorkflow()).rejects.toBe('not an error object');
		});

		it('rethrows a policy violation with its status and violations intact', async () => {
			const violation = {
				kind: 'node-type-unavailable',
				checkId: 'node-allowlist',
				message: 'Slack is not allowed',
			};
			workflowService.update.mockRejectedValue(new PolicyViolationError([violation]));

			const error = await updateWorkflow().catch((e: unknown) => e);

			expect(error).toBeInstanceOf(PolicyViolationError);
			expect((error as PolicyViolationError).httpStatusCode).toBe(403);
			expect((error as PolicyViolationError).meta.violations).toEqual([violation]);
		});
	});
});
