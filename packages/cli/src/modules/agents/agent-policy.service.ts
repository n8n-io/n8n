import type { AgentJsonConfig } from '@n8n/api-types';
import type { PolicedWorkflow, PolicyDecision } from '@n8n/decorators';
import { Service } from '@n8n/di';

import { toPolicedNodes } from '@/policy/policed-agent-nodes';
import type { PolicyActor } from '@/policy/policy-enforcement-backend';
import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';

/** The part of an agent config the policy reads. */
export type PolicedAgentContent = Pick<AgentJsonConfig, 'name' | 'tools'>;

/** Agents reuse the workflow policy points, so an agent is policed as a workflow of its node tools. */
function policedWorkflowForAgent(
	agentId: string | null,
	content: PolicedAgentContent,
): PolicedWorkflow {
	return {
		id: agentId,
		name: content.name,
		nodes: toPolicedNodes(content.tools),
		artifactKind: 'agent',
	};
}

/**
 * Polices an agent at the workflow points, with one node for each node tool, so every
 * workflow check covers agents too. Call it outside a transaction: checks read on their own.
 */
@Service()
export class AgentPolicyService {
	constructor(private readonly policyEnforcementService: PolicyEnforcementService) {}

	/** `stored` is the draft this write replaces, loaded by the caller; `null` for a create. */
	async enforceSave(
		projectId: string,
		agentId: string | null,
		content: PolicedAgentContent,
		stored: PolicedAgentContent | null,
		actor: PolicyActor,
	): Promise<void> {
		await this.policyEnforcementService.enforceWorkflowSave(
			{
				workflow: policedWorkflowForAgent(agentId, content),
				storedWorkflow: stored === null ? null : policedWorkflowForAgent(agentId, stored),
				projectId,
			},
			actor,
		);
	}

	async enforcePublish(
		projectId: string,
		agentId: string,
		content: PolicedAgentContent,
		actor: PolicyActor,
	): Promise<void> {
		await this.policyEnforcementService.enforceWorkflowPublish(
			{ workflow: policedWorkflowForAgent(agentId, content), projectId },
			actor,
		);
	}

	async evaluatePublish(
		projectId: string,
		agentId: string,
		content: PolicedAgentContent,
	): Promise<PolicyDecision> {
		return await this.policyEnforcementService.evaluateWorkflowPublish({
			workflow: policedWorkflowForAgent(agentId, content),
			projectId,
		});
	}
}
