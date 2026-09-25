import type { WorkflowSuggestionGraph, WorkflowSuggestionSnapshot } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import isEqual from 'lodash/isEqual';

import { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NodeTypes } from '@/node-types';
import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import * as WorkflowHelpers from '@/workflow-helpers';
import { WorkflowValidationService } from '@/workflows/workflow-validation.service';

@Service()
export class WorkflowSuggestionCandidateService {
	constructor(
		private readonly licenseState: LicenseState,
		private readonly credentials: CredentialsService,
		private readonly nodeTypes: NodeTypes,
		private readonly validation: WorkflowValidationService,
		private readonly policies: PolicyEnforcementService,
	) {}

	async prepare(
		user: User,
		workflowId: string,
		projectId: string,
		baseline: WorkflowSuggestionSnapshot,
		graph: WorkflowSuggestionGraph,
	) {
		WorkflowHelpers.validateWorkflowStructure(graph);
		const original = structuredClone(baseline);
		const candidate = { ...original, ...structuredClone(graph) };
		await WorkflowHelpers.replaceInvalidCredentials(candidate, projectId);
		if (this.licenseState.isSharingLicensed()) {
			const { EnterpriseWorkflowService } = await import('@/workflows/workflow.service.ee.js');
			const allowed = await this.credentials.getCredentialsAUserCanUseInAWorkflow(user, {
				workflowId,
			});
			Container.get(EnterpriseWorkflowService).validateWorkflowCredentialUsage(
				candidate,
				original,
				allowed,
			);
		}
		WorkflowHelpers.addNodeIds(candidate);
		WorkflowHelpers.resolveNodeWebhookIds(candidate, this.nodeTypes);
		WorkflowHelpers.validateWorkflowStructure(candidate);
		WorkflowHelpers.validateWorkflowNodeGroups(
			candidate,
			WorkflowHelpers.makeGetNodeTypeForGrouping(this.nodeTypes),
		);
		const restrictions = this.validation.validateCredentialNodeRestrictions(candidate.nodes);
		if (!restrictions.isValid)
			throw new BadRequestError(restrictions.error ?? 'Credential binding is not allowed.');
		await this.policies.enforceWorkflowSave({
			workflow: { id: workflowId, name: original.name, nodes: candidate.nodes },
			storedWorkflow: { id: workflowId, name: original.name, nodes: original.nodes },
			projectId,
		});
		return { nodes: candidate.nodes, connections: candidate.connections };
	}

	async assertStillAllowed(
		user: User,
		workflowId: string,
		projectId: string,
		baseline: WorkflowSuggestionSnapshot,
		graph: WorkflowSuggestionGraph,
	) {
		const prepared = await this.prepare(user, workflowId, projectId, baseline, graph);
		if (!isEqual(prepared, graph))
			throw new ConflictError('Suggestion permissions changed. Prepare a new revision.');
	}
}
