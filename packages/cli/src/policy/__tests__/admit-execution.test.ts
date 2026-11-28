import type { Project } from '@n8n/db';
import type { PolicyCleared } from '@n8n/decorators';
import { EntityNotFoundError } from '@n8n/typeorm';
import type { WorkflowExecutionSource } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { PolicyCheckFailedError } from '@/modules/policy-infrastructure/policy-check-failed.error';
import { PolicyViolationError } from '@/policy/policy-violation.error';
import type { OwnershipService } from '@/services/ownership.service';

import { admitExecution } from '../admit-execution';
import type { PolicyEnforcementService } from '../policy-enforcement.service';

describe('admitExecution', () => {
	const policyEnforcementService = mock<PolicyEnforcementService>();
	const ownershipService = mock<OwnershipService>();
	const workflow = { id: 'workflow-1', name: 'Test Workflow' };

	beforeEach(() => {
		vi.clearAllMocks();
		policyEnforcementService.hasChecksFor.mockReturnValue(true);
		ownershipService.getWorkflowProjectCached.mockResolvedValue(mock<Project>({ id: 'project-1' }));
	});

	const admit = async (overrides: { projectId?: string; workflowId?: string } = {}) =>
		await admitExecution(policyEnforcementService, ownershipService, {
			workflow: { ...workflow, id: overrides.workflowId ?? workflow.id },
			mode: 'webhook',
			projectId: overrides.projectId,
		});

	const enforcedContext = () => policyEnforcementService.enforceExecutionAdmission.mock.calls[0][0];

	it('skips the lookup and the check when nothing is registered for executionAdmission', async () => {
		policyEnforcementService.hasChecksFor.mockReturnValue(false);

		const result = await admit();

		expect(result).toBeUndefined();
		expect(policyEnforcementService.hasChecksFor).toHaveBeenCalledWith('executionAdmission');
		expect(ownershipService.getWorkflowProjectCached).not.toHaveBeenCalled();
		expect(policyEnforcementService.enforceExecutionAdmission).not.toHaveBeenCalled();
	});

	it('uses a supplied project id without a lookup', async () => {
		await admit({ projectId: 'supplied-project' });

		expect(ownershipService.getWorkflowProjectCached).not.toHaveBeenCalled();
		expect(enforcedContext().projectId).toBe('supplied-project');
	});

	it('treats an empty project id as unknown and looks up the owner project', async () => {
		await admit({ projectId: '' });

		expect(ownershipService.getWorkflowProjectCached).toHaveBeenCalledWith('workflow-1');
		expect(enforcedContext().projectId).toBe('project-1');
	});

	it('looks up the owner project when no project id is supplied', async () => {
		await admit();

		expect(ownershipService.getWorkflowProjectCached).toHaveBeenCalledWith('workflow-1');
		expect(enforcedContext().projectId).toBe('project-1');
	});

	it('uses a null project when the lookup finds no entity', async () => {
		ownershipService.getWorkflowProjectCached.mockRejectedValue(
			new EntityNotFoundError('Project', {}),
		);

		await admit();

		expect(enforcedContext().projectId).toBeNull();
	});

	it('uses a null project without a lookup when the workflow id is empty', async () => {
		await admit({ workflowId: '' });

		expect(ownershipService.getWorkflowProjectCached).not.toHaveBeenCalled();
		expect(enforcedContext().projectId).toBeNull();
	});

	it('propagates any other lookup error and does not enforce', async () => {
		ownershipService.getWorkflowProjectCached.mockRejectedValue(new Error('database down'));

		await expect(admit()).rejects.toThrow('database down');

		expect(policyEnforcementService.enforceExecutionAdmission).not.toHaveBeenCalled();
	});

	it('builds a v1 workflow artifact context with a null source by default', async () => {
		await admit();

		expect(enforcedContext()).toEqual({
			artifact: { kind: 'workflow', id: 'workflow-1', name: 'Test Workflow' },
			projectId: 'project-1',
			mode: 'webhook',
			source: null,
			engine: 'v1',
		});
	});

	it('passes the source through when given', async () => {
		const source: WorkflowExecutionSource = 'user';

		await admitExecution(policyEnforcementService, ownershipService, {
			workflow,
			mode: 'trigger',
			source,
			projectId: 'project-1',
		});

		expect(enforcedContext().source).toBe(source);
		expect(enforcedContext().mode).toBe('trigger');
	});

	it('enforces as the system actor without an execution id', async () => {
		await admit();

		expect(policyEnforcementService.enforceExecutionAdmission.mock.calls[0][1]).toStrictEqual({
			kind: 'system',
			reason: 'execution',
		});
	});

	it('propagates a policy violation unchanged', async () => {
		const violation = new PolicyViolationError([
			{ message: 'Execution blocked' } as PolicyViolationError['violations'][number],
		]);
		policyEnforcementService.enforceExecutionAdmission.mockRejectedValue(violation);

		await expect(admit()).rejects.toBe(violation);
	});

	it('propagates a failed policy check unchanged', async () => {
		const failure = new PolicyCheckFailedError('executionAdmission', ['correlation-1']);
		policyEnforcementService.enforceExecutionAdmission.mockRejectedValue(failure);

		await expect(admit()).rejects.toBe(failure);
	});

	it('returns the token that enforce resolves with', async () => {
		const token = mock<PolicyCleared<'executionAdmission'>>();
		policyEnforcementService.enforceExecutionAdmission.mockResolvedValue(token);

		await expect(admit()).resolves.toBe(token);
	});
});
