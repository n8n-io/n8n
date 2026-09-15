import type { PolicyViolation } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { WorkflowEntity } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { PolicyCleared } from '@n8n/decorators';

import type { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { PolicyViolationError } from '@/policy/policy-violation.error';

import type { WorkflowPlanItem } from '../../entities/workflow/workflow-import.types';
import { ContentImportPolicyGate, contentImportTransport } from '../content-import-policy';

const violation: PolicyViolation = {
	kind: 'node-type-unavailable',
	checkId: 'test.check',
	message: 'Node type is not available here',
};

const cleared = mock<PolicyCleared<'contentImport'>>();

const entity = (name: string) => ({ name, nodes: [] }) as unknown as WorkflowEntity;

const createItem = (sourceWorkflowId: string, decidedId = 'local-1'): WorkflowPlanItem =>
	({
		action: 'create',
		decidedId,
		sourceWorkflowId,
		entity: entity(sourceWorkflowId),
	}) as WorkflowPlanItem;

const updateItem = (sourceWorkflowId: string, existingId: string): WorkflowPlanItem =>
	({
		action: 'update',
		sourceWorkflowId,
		entity: entity(sourceWorkflowId),
		existing: { id: existingId } as WorkflowEntity,
	}) as WorkflowPlanItem;

const skipItem = (sourceWorkflowId: string): WorkflowPlanItem =>
	({
		action: 'skip',
		sourceWorkflowId,
		entity: entity(sourceWorkflowId),
		existing: { id: 'existing' } as WorkflowEntity,
	}) as WorkflowPlanItem;

describe('contentImportTransport', () => {
	it.each([
		['git-pull', 'git-connection'],
		['package-import', 'package'],
		[undefined, 'package'],
	] as const)('maps %s to %s', (source, expected) => {
		expect(contentImportTransport(source)).toBe(expected);
	});
});

describe('ContentImportPolicyGate', () => {
	const policyEnforcementService = mock<PolicyEnforcementService>();
	const gate = new ContentImportPolicyGate(policyEnforcementService, mock<Logger>());

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('admits nothing when no check is registered', async () => {
		policyEnforcementService.hasChecksFor.mockReturnValue(false);

		expect(await gate.refusedWorkflows([createItem('W1')], 'project-1', 'package')).toEqual([]);
		expect(policyEnforcementService.hasChecksFor).toHaveBeenCalledTimes(1);
		expect(policyEnforcementService.enforceContentImport).not.toHaveBeenCalled();
	});

	it('admits every workflow the import will write', async () => {
		policyEnforcementService.hasChecksFor.mockReturnValue(true);
		policyEnforcementService.enforceContentImport.mockResolvedValue(cleared);

		expect(
			await gate.refusedWorkflows([createItem('W1'), createItem('W2')], 'project-1', 'package'),
		).toEqual([]);
		expect(policyEnforcementService.enforceContentImport).toHaveBeenCalledTimes(2);
	});

	it('skips workflows the import will not write', async () => {
		policyEnforcementService.hasChecksFor.mockReturnValue(true);
		policyEnforcementService.enforceContentImport.mockResolvedValue(cleared);

		await gate.refusedWorkflows([skipItem('W1'), createItem('W2')], 'project-1', 'package');

		expect(policyEnforcementService.enforceContentImport).toHaveBeenCalledTimes(1);
	});

	it('passes the transport and the id the workflow will be written under', async () => {
		policyEnforcementService.hasChecksFor.mockReturnValue(true);
		policyEnforcementService.enforceContentImport.mockResolvedValue(cleared);

		await gate.refusedWorkflows(
			[createItem('W1', 'new-id'), updateItem('W2', 'existing-id')],
			'project-1',
			'git-connection',
		);

		expect(policyEnforcementService.enforceContentImport).toHaveBeenNthCalledWith(1, {
			workflow: { id: 'new-id', name: 'W1', nodes: [] },
			projectId: 'project-1',
			transport: 'git-connection',
		});
		expect(policyEnforcementService.enforceContentImport).toHaveBeenNthCalledWith(2, {
			workflow: { id: 'existing-id', name: 'W2', nodes: [] },
			projectId: 'project-1',
			transport: 'git-connection',
		});
	});

	it('reports every refusal, not just the first', async () => {
		policyEnforcementService.hasChecksFor.mockReturnValue(true);
		policyEnforcementService.enforceContentImport.mockRejectedValue(
			new PolicyViolationError([violation]),
		);

		const refused = await gate.refusedWorkflows(
			[createItem('W1'), createItem('W2')],
			'project-1',
			'package',
		);

		expect(refused).toEqual([
			{ type: 'policy-violation', sourceWorkflowId: 'W1', name: 'W1', violations: [violation] },
			{ type: 'policy-violation', sourceWorkflowId: 'W2', name: 'W2', violations: [violation] },
		]);
	});

	it('carries on past a refusal to admit the rest', async () => {
		policyEnforcementService.hasChecksFor.mockReturnValue(true);
		policyEnforcementService.enforceContentImport
			.mockRejectedValueOnce(new PolicyViolationError([violation]))
			.mockResolvedValue(cleared);

		const refused = await gate.refusedWorkflows(
			[createItem('W1'), createItem('W2')],
			'project-1',
			'package',
		);

		expect(refused).toHaveLength(1);
		expect(policyEnforcementService.enforceContentImport).toHaveBeenCalledTimes(2);
	});

	it('fails the import when a check breaks, rather than reading as a refusal', async () => {
		policyEnforcementService.hasChecksFor.mockReturnValue(true);
		const checkFailure = new Error('check exploded');
		policyEnforcementService.enforceContentImport.mockRejectedValue(checkFailure);

		await expect(gate.refusedWorkflows([createItem('W1')], 'project-1', 'package')).rejects.toBe(
			checkFailure,
		);
	});
});
