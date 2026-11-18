import type { ContentToolCall, PreToolExecution } from '@n8n/agents';
import type { AgentJsonConfig, ToolPolicy } from '@n8n/api-types';
import type { PolicedToolCallRecord, PolicedWorkflow, PolicyDecision } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';

import { toPolicedNodes } from '@/policy/policed-agent-nodes';
import type { PolicyActor } from '@/policy/policy-enforcement-backend';
import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { findPolicyViolations } from '@/policy/policy-violation.error';

import { AgentToolCallHistoryService } from './agent-tool-call-history.service';
import { toPolicyRefusalResult } from './tools/policy-refusal';
import { hostMetadataExecutionId } from './types/agent-queued-message';

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

/** A tool call of the running turn, as a policy check reads it. */
function toPolicedToolCall(call: ContentToolCall): PolicedToolCallRecord {
	const { toolCallId, toolName, input } = call;
	if (call.state === 'pending') return { toolCallId, toolName, input, status: 'pending' };
	if (call.state === 'rejected') {
		return { toolCallId, toolName, input, status: 'error', output: call.error };
	}
	const status = call.canceled ? 'canceled' : 'success';
	return { toolCallId, toolName, input, status, output: call.output };
}

/**
 * Polices an agent at the workflow points, with one node for each node tool and each MCP
 * server, so every workflow check covers agents too. Call it outside a transaction: checks
 * read on their own.
 *
 * A running agent is policed for each tool call instead, through {@link preToolExecutionHook}.
 */
@Service()
export class AgentPolicyService {
	constructor(
		private readonly policyEnforcementService: PolicyEnforcementService,
		private readonly toolCallHistory: AgentToolCallHistoryService,
	) {}

	async evaluateSave(
		projectId: string,
		agentId: string | null,
		content: PolicedAgentContent,
		stored: PolicedAgentContent | null,
	) {
		return await this.policyEnforcementService.evaluateWorkflowSave({
			workflow: policedWorkflowForAgent(agentId, content),
			storedWorkflow: stored === null ? null : policedWorkflowForAgent(agentId, stored),
			projectId,
		});
	}

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

	/**
	 * The hook that asks the policy before each tool call of one agent runtime.
	 *
	 * A runtime is cached and shared between runs, so the hook holds only what is fixed when
	 * the runtime is built: the agent, its project and its tool policy. What changes for each
	 * run comes from the call.
	 */
	preToolExecutionHook(
		projectId: string,
		agentId: string,
		toolPolicy: ToolPolicy | null,
	): PreToolExecution {
		return async ({ toolCallId, runId, tool, input, resumed, persistence, runToolCalls }) => {
			const threadId = persistence?.threadId ?? null;
			const policedRunToolCalls = () => runToolCalls().map(toPolicedToolCall);
			try {
				await this.policyEnforcementService.enforcePreToolExecution(
					{
						agentId,
						projectId,
						threadId,
						agentExecutionId: hostMetadataExecutionId(persistence?.hostMetadata) ?? null,
						runId,
						toolCallId,
						tool,
						input,
						resumed,
						toolPolicy,
						runToolCalls: policedRunToolCalls,
						sessionHistory: async () =>
							await this.toolCallHistory.sessionHistory(threadId, agentId, policedRunToolCalls()),
					},
					// An agent execution is not a workflow execution, so the actor has no `executionId`.
					{ kind: 'system', reason: 'execution' },
				);
				return { allow: true };
			} catch (error) {
				const violations = findPolicyViolations(error);
				// A check that did not answer is not a refusal. The runtime stops the call on a throw.
				if (!violations) throw error;
				return { allow: false, result: toPolicyRefusalResult(getErrorMessage(error), violations) };
			}
		};
	}
}
