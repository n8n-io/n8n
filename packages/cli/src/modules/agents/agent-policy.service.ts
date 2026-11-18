import type { PreToolExecution, RunToolCall } from '@n8n/agents';
import type { AgentJsonConfig, ToolPolicy } from '@n8n/api-types';
import type {
	PolicedSession,
	PolicedToolCallRecord,
	PolicedWorkflow,
	PolicyDecision,
} from '@n8n/decorators';
import { Service } from '@n8n/di';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';

import { toPolicedNodes } from '@/policy/policed-agent-nodes';
import type { PolicyActor } from '@/policy/policy-enforcement-backend';
import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { findPolicyViolations } from '@/policy/policy-violation.error';

import { AgentToolCallHistoryService } from './agent-tool-call-history.service';
import { AgentRepository } from './repositories/agent.repository';
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
function toPolicedToolCall(call: RunToolCall): PolicedToolCallRecord {
	const { toolCallId, toolName, input, tool } = call;
	const base = { toolCallId, toolName, input, ...(tool && { tool }) };
	if (call.state === 'pending') return { ...base, status: 'pending' };
	if (call.state === 'rejected') return { ...base, status: 'error', output: call.error };
	return { ...base, status: call.canceled ? 'canceled' : 'success', output: call.output };
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
		private readonly agentRepository: AgentRepository,
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
	 * the runtime is built: the agent, its project, its tool policy and whether it runs the
	 * published version. What changes for each run comes from the call.
	 */
	preToolExecutionHook({
		projectId,
		agentId,
		toolPolicy,
		usePublishedVersion,
	}: {
		projectId: string;
		agentId: string;
		toolPolicy: ToolPolicy | null;
		usePublishedVersion: boolean;
	}): PreToolExecution {
		return async ({ toolCallId, runId, tool, input, resumed, persistence, runToolCalls }) => {
			const threadId = persistence?.threadId ?? null;
			const policedRunToolCalls = () => runToolCalls().map(toPolicedToolCall);
			// One decision can ask several times, and the history cannot change while it is made.
			let sessionHistory: Promise<PolicedSession[]> | undefined;
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
						delegated: persistence?.delegated === true,
						toolPolicy,
						loadAgentToolPolicy: async (otherAgentId) =>
							await this.findToolPolicy(otherAgentId, projectId, usePublishedVersion),
						runToolCalls: policedRunToolCalls,
						sessionHistory: async () =>
							await (sessionHistory ??= this.toolCallHistory.sessionHistory(
								threadId,
								agentId,
								policedRunToolCalls(),
							)),
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

	/**
	 * A sub-agent runs the same kind of version as the agent that delegated to it, so the
	 * policy of a parent is read from the version that this run uses.
	 */
	private async findToolPolicy(
		agentId: string,
		projectId: string,
		usePublishedVersion: boolean,
	): Promise<ToolPolicy | null> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		const config = usePublishedVersion ? agent?.activeVersion?.schema : agent?.schema;
		return config?.config?.guardrails?.toolPolicy ?? null;
	}
}
