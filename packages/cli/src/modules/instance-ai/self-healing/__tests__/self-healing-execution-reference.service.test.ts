import type { Logger } from '@n8n/backend-common';
import type { ExecutionRepository, IExecutionBase, User } from '@n8n/db';
import { BadRequestError, ForbiddenError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { EngineV2ExecutionReader } from '@/executions/engine-v2-execution-reader.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { SelfHealingExecutionReferenceService } from '../self-healing-execution-reference.service';

const WORKFLOW_ID = 'workflow-1';
const V1_EXECUTION_ID = '123';
const V2_EXECUTION_ID = '01a038ae-c4a8-7799-8a3e-e3c2ca055cfa';
const user = mock<User>({ id: 'user-1', disabled: false });
const workflowHead = { versionId: 'version-1', activeVersionId: null, updatedAt: new Date() };

describe('SelfHealingExecutionReferenceService', () => {
	const executions = mock<ExecutionRepository>();
	const engineV2 = mock<EngineV2ExecutionReader>();
	const workflows = mock<WorkflowFinderService>();
	const logger = mock<Logger>();
	const service = new SelfHealingExecutionReferenceService(executions, engineV2, workflows, logger);

	beforeEach(() => {
		vi.resetAllMocks();
		workflows.findWorkflowHeadForUser.mockResolvedValue(workflowHead);
		executions.findSingleExecution.mockResolvedValue(
			mock<IExecutionBase>({ id: V1_EXECUTION_ID, workflowId: WORKFLOW_ID }),
		);
		engineV2.findReference.mockResolvedValue({ id: V2_EXECUTION_ID, workflowId: WORKFLOW_ID });
	});

	describe('getReference', () => {
		it('returns a v1 reference without loading workflow or execution data', async () => {
			await expect(service.getReference(user, WORKFLOW_ID, V1_EXECUTION_ID)).resolves.toEqual({
				status: 'available',
				id: V1_EXECUTION_ID,
			});
			expect(workflows.findWorkflowHeadForUser).toHaveBeenCalledWith(WORKFLOW_ID, user, [
				'workflow:read',
				'execution:read',
			]);
			expect(executions.findSingleExecution).toHaveBeenCalledWith(V1_EXECUTION_ID, {
				includeData: false,
				includeAnnotation: false,
			});
			expect(engineV2.findReference).not.toHaveBeenCalled();
		});

		it('reads a v2 reference', async () => {
			await expect(service.getReference(user, WORKFLOW_ID, V2_EXECUTION_ID)).resolves.toEqual({
				status: 'available',
				id: V2_EXECUTION_ID,
			});
			expect(engineV2.findReference).toHaveBeenCalledWith(V2_EXECUTION_ID);
			expect(executions.findSingleExecution).not.toHaveBeenCalled();
		});

		it('does not read execution identity after workflow access is lost', async () => {
			workflows.findWorkflowHeadForUser.mockResolvedValue(null);

			await expect(service.getReference(user, WORKFLOW_ID, V1_EXECUTION_ID)).resolves.toEqual({
				status: 'unavailable',
			});
			expect(executions.findSingleExecution).not.toHaveBeenCalled();
			expect(engineV2.findReference).not.toHaveBeenCalled();
		});

		it('requires execution access when the user can read the workflow', async () => {
			workflows.findWorkflowHeadForUser.mockImplementation(async (_workflowId, _user, scopes) =>
				scopes.includes('execution:read') ? null : workflowHead,
			);

			await expect(service.getReference(user, WORKFLOW_ID, V1_EXECUTION_ID)).resolves.toEqual({
				status: 'unavailable',
			});
			expect(executions.findSingleExecution).not.toHaveBeenCalled();
		});

		it('does not expose a reference to a disabled user', async () => {
			const disabled = mock<User>({ id: user.id, disabled: true });

			await expect(service.getReference(disabled, WORKFLOW_ID, V2_EXECUTION_ID)).resolves.toEqual({
				status: 'unavailable',
			});
			expect(workflows.findWorkflowHeadForUser).not.toHaveBeenCalled();
			expect(engineV2.findReference).not.toHaveBeenCalled();
		});

		it.each([V1_EXECUTION_ID, V2_EXECUTION_ID])(
			'returns unavailable without an ID when execution %s is missing',
			async (executionId) => {
				executions.findSingleExecution.mockResolvedValue(undefined);
				engineV2.findReference.mockResolvedValue(undefined);

				await expect(service.getReference(user, WORKFLOW_ID, executionId)).resolves.toEqual({
					status: 'unavailable',
				});
			},
		);

		it.each([V1_EXECUTION_ID, V2_EXECUTION_ID])(
			'returns unavailable when execution %s belongs to another workflow',
			async (executionId) => {
				executions.findSingleExecution.mockResolvedValue(
					mock<IExecutionBase>({ id: executionId, workflowId: 'other-workflow' }),
				);
				engineV2.findReference.mockResolvedValue({ id: executionId, workflowId: 'other-workflow' });

				await expect(service.getReference(user, WORKFLOW_ID, executionId)).resolves.toEqual({
					status: 'unavailable',
				});
			},
		);

		it.each([V1_EXECUTION_ID, V2_EXECUTION_ID])(
			'keeps execution %s optional when its provider fails',
			async (executionId) => {
				const error = new Error('Provider response contains private execution data');
				executions.findSingleExecution.mockRejectedValue(error);
				engineV2.findReference.mockRejectedValue(error);

				await expect(service.getReference(user, WORKFLOW_ID, executionId)).resolves.toEqual({
					status: 'unavailable',
				});
				expect(logger.warn).toHaveBeenCalledWith(
					'Could not load the execution reference for a self-healing result.',
					{ workflowId: WORKFLOW_ID, executionId },
				);
			},
		);
	});

	describe('validateReference', () => {
		it.each([V1_EXECUTION_ID, V2_EXECUTION_ID])(
			'accepts execution %s in the authorized workflow',
			async (executionId) => {
				await expect(
					service.validateReference(user, WORKFLOW_ID, executionId),
				).resolves.toBeUndefined();
				if (executionId === V2_EXECUTION_ID) {
					expect(engineV2.findReference).toHaveBeenCalledWith(executionId);
				}
			},
		);

		it.each([V1_EXECUTION_ID, V2_EXECUTION_ID])(
			'accepts a historical reference when execution %s was pruned',
			async (executionId) => {
				executions.findSingleExecution.mockResolvedValue(undefined);
				engineV2.findReference.mockResolvedValue(undefined);

				await expect(
					service.validateReference(user, WORKFLOW_ID, executionId),
				).resolves.toBeUndefined();
			},
		);

		it.each([V1_EXECUTION_ID, V2_EXECUTION_ID])(
			'rejects execution %s when it belongs to another workflow',
			async (executionId) => {
				executions.findSingleExecution.mockResolvedValue(
					mock<IExecutionBase>({ id: executionId, workflowId: 'other-workflow' }),
				);
				engineV2.findReference.mockResolvedValue({ id: executionId, workflowId: 'other-workflow' });

				await expect(service.validateReference(user, WORKFLOW_ID, executionId)).rejects.toThrow(
					BadRequestError,
				);
			},
		);

		it('rejects a producer without workflow access before reading execution identity', async () => {
			workflows.findWorkflowHeadForUser.mockResolvedValue(null);

			await expect(service.validateReference(user, WORKFLOW_ID, V1_EXECUTION_ID)).rejects.toThrow(
				ForbiddenError,
			);
			expect(executions.findSingleExecution).not.toHaveBeenCalled();
		});

		it('requires execution access before it accepts a producer reference', async () => {
			workflows.findWorkflowHeadForUser.mockImplementation(async (_workflowId, _user, scopes) =>
				scopes.includes('execution:read') ? null : workflowHead,
			);

			await expect(service.validateReference(user, WORKFLOW_ID, V1_EXECUTION_ID)).rejects.toThrow(
				ForbiddenError,
			);
			expect(executions.findSingleExecution).not.toHaveBeenCalled();
		});

		it.each([V1_EXECUTION_ID, V2_EXECUTION_ID])(
			'does not treat a provider failure for execution %s as a pruned reference',
			async (executionId) => {
				const error = new Error('Provider unavailable');
				executions.findSingleExecution.mockRejectedValue(error);
				engineV2.findReference.mockRejectedValue(error);

				await expect(service.validateReference(user, WORKFLOW_ID, executionId)).rejects.toBe(error);
			},
		);
	});
});
