import type { ExternalIdConfig } from '@n8n/config';
import type { WorkflowRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { WorkflowExternalIdService } from '@/workflows/workflow-external-id.service';

describe('WorkflowExternalIdService', () => {
	const externalIdConfig = mock<ExternalIdConfig>();
	const workflowRepository = mock<WorkflowRepository>();
	let service: WorkflowExternalIdService;

	beforeEach(() => {
		vi.clearAllMocks();
		externalIdConfig.workflowExternalId = 'MUTABLE';
		service = new WorkflowExternalIdService(externalIdConfig, workflowRepository);
	});

	describe('resolveOnCreate', () => {
		describe('MUTABLE mode', () => {
			it('leaves externalId untouched when none was requested', async () => {
				const newWorkflow = { id: 'wf-1', externalId: null };

				await service.resolveOnCreate(newWorkflow);

				expect(newWorkflow.externalId).toBeNull();
			});

			it('accepts a client-supplied externalId when it is unique', async () => {
				workflowRepository.existsBy.mockResolvedValue(false);
				const newWorkflow = { id: 'wf-1', externalId: 'ext-1' };

				await service.resolveOnCreate(newWorkflow);

				expect(newWorkflow.externalId).toBe('ext-1');
				expect(workflowRepository.existsBy).toHaveBeenCalledWith({ externalId: 'ext-1' });
			});

			it('throws ConflictError when the client-supplied externalId already exists', async () => {
				workflowRepository.existsBy.mockResolvedValue(true);
				const newWorkflow = { id: 'wf-1', externalId: 'ext-1' };

				await expect(service.resolveOnCreate(newWorkflow)).rejects.toThrow(ConflictError);
			});
		});

		describe('MATCH_WORKFLOW_ID mode', () => {
			beforeEach(() => {
				externalIdConfig.workflowExternalId = 'MATCH_WORKFLOW_ID';
			});

			it('forces externalId to equal the workflow id, ignoring any client-supplied value', async () => {
				const newWorkflow = { id: 'wf-1', externalId: 'client-supplied' };

				await service.resolveOnCreate(newWorkflow);

				expect(newWorkflow.externalId).toBe('wf-1');
				expect(workflowRepository.existsBy).not.toHaveBeenCalled();
			});

			it('pre-generates an id when one is not already set, and mirrors it into externalId', async () => {
				const newWorkflow = { id: '', externalId: null };

				await service.resolveOnCreate(newWorkflow);

				expect(newWorkflow.id).not.toBe('');
				expect(newWorkflow.externalId).toBe(newWorkflow.id);
			});
		});
	});

	describe('validateUpdate', () => {
		it('does nothing when externalId is not part of the update', () => {
			expect(() => service.validateUpdate('ext-1', undefined)).not.toThrow();
		});

		describe('MUTABLE mode', () => {
			it('allows changing the value', () => {
				expect(() => service.validateUpdate('ext-1', 'ext-2')).not.toThrow();
			});

			it('allows clearing the value', () => {
				expect(() => service.validateUpdate('ext-1', null)).not.toThrow();
			});
		});

		describe('MATCH_WORKFLOW_ID mode', () => {
			beforeEach(() => {
				externalIdConfig.workflowExternalId = 'MATCH_WORKFLOW_ID';
			});

			it('allows resubmitting the same value as a no-op', () => {
				expect(() => service.validateUpdate('ext-1', 'ext-1')).not.toThrow();
			});

			it('rejects changing the value', () => {
				expect(() => service.validateUpdate('ext-1', 'ext-2')).toThrow(BadRequestError);
			});

			it('rejects clearing the value', () => {
				expect(() => service.validateUpdate('ext-1', null)).toThrow(BadRequestError);
			});
		});
	});
});
