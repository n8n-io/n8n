import type { WorkflowSuggestionGraph, WorkflowSuggestionSnapshot } from '@n8n/api-types';
import type { LicenseState } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { NodeOperationError, type INodeType } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { NodeTypes } from '@/node-types';
import type { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import * as WorkflowHelpers from '@/workflow-helpers';
import type { NodeGroupRulesFlagGate } from '@/workflows/node-group-rules-flag-gate';
import type { WorkflowValidationService } from '@/workflows/workflow-validation.service';
import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';

import { WorkflowSuggestionCandidateService } from '../workflow-suggestion-candidate.service';

const license = mock<LicenseState>();
const credentials = mock<CredentialsService>();
const nodeTypes = mock<NodeTypes>();
const validation = mock<WorkflowValidationService>();
const policies = mock<PolicyEnforcementService>();
const nodeGroupRules = mock<NodeGroupRulesFlagGate>();
const enterprise = mockInstance(EnterpriseWorkflowService);
const user = mock<User>({ id: 'user' });
const service = new WorkflowSuggestionCandidateService(
	license,
	credentials,
	nodeTypes,
	validation,
	policies,
	nodeGroupRules,
);
const baseline: WorkflowSuggestionSnapshot = {
	name: 'Original',
	nodes: [],
	connections: {},
	settings: { executionTimeout: 15 },
	nodeGroups: [],
};
const graph: WorkflowSuggestionGraph = {
	nodes: [
		{
			id: 'n',
			name: 'Node',
			type: 'n8n-nodes-base.noOp',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
	],
	connections: {},
};

beforeEach(() => {
	vi.resetAllMocks();
	license.isSharingLicensed.mockReturnValue(false);
	validation.validateCredentialNodeRestrictions.mockReturnValue({ isValid: true });
	nodeTypes.getByNameAndVersion.mockReturnValue(mock<INodeType>({ description: { webhooks: [] } }));
	credentials.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([]);
});

it('prepares a copy in Community and checks policy against the captured baseline', async () => {
	const original = structuredClone(baseline);
	const candidate = structuredClone(graph);
	expect(await service.prepare(user, 'wf', 'project', baseline, graph)).toEqual(graph);
	expect(baseline).toEqual(original);
	expect(graph).toEqual(candidate);
	expect(policies.enforceWorkflowSave).toHaveBeenCalledWith({
		projectId: 'project',
		workflow: { id: 'wf', name: 'Original', nodes: graph.nodes },
		storedWorkflow: { id: 'wf', name: 'Original', nodes: baseline.nodes },
	});
	expect(enterprise.preventTampering).not.toHaveBeenCalled();
});

it('uses the captured baseline for credential protection and returns the prepared graph', async () => {
	license.isSharingLicensed.mockReturnValue(true);
	enterprise.validateWorkflowCredentialUsage.mockImplementation((candidate) => {
		candidate.nodes = [];
		return candidate;
	});
	expect(await service.prepare(user, 'wf', 'project', baseline, graph)).toEqual({
		nodes: [],
		connections: {},
	});
	expect(enterprise.validateWorkflowCredentialUsage).toHaveBeenCalledWith(
		expect.anything(),
		baseline,
		[],
	);
	expect(graph.nodes).toHaveLength(1);
});

it('rejects a credential binding restriction', async () => {
	validation.validateCredentialNodeRestrictions.mockReturnValue({
		isValid: false,
		error: 'Restricted credential',
	});
	await expect(service.prepare(user, 'wf', 'project', baseline, graph)).rejects.toThrow(
		'Restricted credential',
	);
	expect(policies.enforceWorkflowSave).not.toHaveBeenCalled();
});

it('returns a validation error when credential access is unavailable', async () => {
	license.isSharingLicensed.mockReturnValue(true);
	enterprise.validateWorkflowCredentialUsage.mockImplementation(() => {
		throw new NodeOperationError(graph.nodes[0], 'Credential access is required.');
	});
	await expect(service.prepare(user, 'wf', 'project', baseline, graph)).rejects.toMatchObject({
		httpStatusCode: 400,
		message: 'Credential access is required.',
	});
	expect(policies.enforceWorkflowSave).not.toHaveBeenCalled();
});

it('preserves unexpected credential validation errors', async () => {
	license.isSharingLicensed.mockReturnValue(true);
	const error = new Error('Credential validation failed.');
	enterprise.validateWorkflowCredentialUsage.mockImplementation(() => {
		throw error;
	});
	await expect(service.prepare(user, 'wf', 'project', baseline, graph)).rejects.toBe(error);
});

it('rejects a save policy violation', async () => {
	policies.enforceWorkflowSave.mockRejectedValue(new Error('Save policy failed'));
	await expect(service.prepare(user, 'wf', 'project', baseline, graph)).rejects.toThrow(
		'Save policy',
	);
});

it('rejects inconsistent preserved node groups', async () => {
	const groups = vi
		.spyOn(WorkflowHelpers, 'validateWorkflowNodeGroups')
		.mockImplementationOnce(() => {
			throw new Error('Invalid node group');
		});
	await expect(service.prepare(user, 'wf', 'project', baseline, graph)).rejects.toThrow(
		'node group',
	);
	expect(groups).toHaveBeenCalledWith(
		expect.objectContaining({ nodeGroups: baseline.nodeGroups }),
		expect.any(Function),
		{},
	);
	groups.mockRestore();
});

it.each([true, false])(
	'validates a preserved trigger group with allowTriggerInGroup=%s',
	async (allowTriggerInGroup) => {
		nodeGroupRules.getEnabledRules.mockResolvedValue({
			allowTriggerInGroup,
			allowMultipleBoundaryNodes: false,
		});
		nodeTypes.getByNameAndVersion.mockReturnValue(
			mock<INodeType>({ description: { group: ['trigger'], webhooks: [] } }),
		);
		const groupedBaseline: WorkflowSuggestionSnapshot = {
			...baseline,
			nodes: graph.nodes.map((node) => ({ ...node, type: 'n8n-nodes-base.manualTrigger' })),
			nodeGroups: [{ id: 'group', name: 'Trigger group', nodeIds: ['n'] }],
		};
		const candidate: WorkflowSuggestionGraph = {
			nodes: groupedBaseline.nodes.map((node) => ({ ...node, position: [100, 0] })),
			connections: {},
		};

		const preparation = service.prepare(user, 'wf', 'project', groupedBaseline, candidate);

		if (allowTriggerInGroup) {
			await expect(preparation).resolves.toEqual(candidate);
		} else {
			await expect(preparation).rejects.toThrow('cannot contain trigger nodes');
			expect(policies.enforceWorkflowSave).not.toHaveBeenCalled();
		}
	},
);

it('rejects an invalid graph before credential preparation', async () => {
	license.isSharingLicensed.mockReturnValue(true);
	await expect(
		service.prepare(user, 'wf', 'project', baseline, {
			nodes: [...graph.nodes, ...graph.nodes],
			connections: {},
		}),
	).rejects.toThrow('structure');
	expect(credentials.getCredentialsAUserCanUseInAWorkflow).not.toHaveBeenCalled();
});
