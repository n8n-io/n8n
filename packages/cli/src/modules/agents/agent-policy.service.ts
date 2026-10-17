import type { AgentJsonConfig, PolicyViolation } from '@n8n/api-types';
import type { PolicedWorkflow, PolicyDecision } from '@n8n/decorators';
import { Service } from '@n8n/di';

import { toPolicedNodes } from '@/policy/policed-agent-nodes';
import type { PolicyActor } from '@/policy/policy-enforcement-backend';
import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';

/** The part of an agent config the policy reads. */
export type PolicedAgentContent = Pick<AgentJsonConfig, 'name' | 'tools' | 'mcpServers'>;

/** Agents reuse the workflow policy points, so an agent is policed as a workflow of its node tools. */
function policedWorkflowForAgent(
	agentId: string | null,
	content: PolicedAgentContent,
): PolicedWorkflow {
	return {
		id: agentId,
		name: content.name,
		nodes: toPolicedNodes(content.tools, content.mcpServers),
		artifactKind: 'agent',
	};
}

/**
 * Polices an agent at the workflow points, with one node for each node tool and each MCP
 * server, so every workflow check covers agents too. Call it outside a transaction: checks
 * read on their own.
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

	/**
	 * Advisory twin of {@link enforcePublish}: same checks and the same policed nodes, but it
	 * returns the decision instead of throwing, and writes no audit line. Validation uses it to
	 * report what a publish would reject. {@link enforcePublish} stays the gate.
	 */
	async evaluatePublish(
		projectId: string,
		agentId: string | null,
		content: PolicedAgentContent,
	): Promise<PolicyDecision> {
		return await this.policyEnforcementService.evaluateWorkflowPublish({
			workflow: policedWorkflowForAgent(agentId, content),
			projectId,
		});
	}
}

/**
 * The denied node types of a decision, by type name. A violation names the type, never the node
 * that holds it, so a caller attributes it by matching the types its own entry runs as.
 */
export function deniedNodeTypes(decision: PolicyDecision): Map<string, PolicyViolation> {
	const denied = new Map<string, PolicyViolation>();

	for (const violation of decision.violations) {
		if (violation.kind !== 'node-type-unavailable') continue;
		if (violation.subjectType !== 'nodeType') continue;
		if (!violation.subject) continue;
		if (!denied.has(violation.subject)) denied.set(violation.subject, violation);
	}

	return denied;
}

/** The scope-qualified reason for a `restricted_node_type` issue, absent when the scope is unknown. */
export function restrictionReason(violation: PolicyViolation): string | undefined {
	if (violation.scope === 'instance') return 'restricted_by_instance';
	if (violation.scope === 'project') return 'restricted_by_project';
	return undefined;
}
