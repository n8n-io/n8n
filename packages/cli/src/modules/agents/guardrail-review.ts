import {
	AGENT_DECISION_TRIGGER_NODE_TYPE,
	type AgentHitlConfiguration,
	type AgentIntegrationConfig,
	type AgentToolGuardrailConfig,
} from '@n8n/api-types';
import type { GuardrailToolCallContext } from '@n8n/agents';
import { AgentsConfig } from '@n8n/config';
import { Logger } from '@n8n/backend-common';
import { Container, Service } from '@n8n/di';
import type { INode } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks';
import { CallableWorkflowLoader } from '@/workflows/callable/callable-workflow-loader.service';

import { buildApprovalArgs } from './execution-recorder';
import { executeWorkflow } from './tools/workflow-tool-factory';

/** Per-run identity the `review` response routes flagged content with. */
export interface ToolGuardrailReviewContext {
	agentId: string;
	projectId: string;
	/** Published runs execute the review workflow's published version, integrated. */
	published: boolean;
	/** The agent's connected channels; a channel destination must be among them. */
	integrations: AgentIntegrationConfig[];
	/** The agent's human-review configurations, resolved by id at trigger time. */
	configurations: AgentHitlConfiguration[];
}

/** The flagged content a guardrail sends to review. */
export interface GuardrailReviewPayload {
	/** The stage the check ran at, for the reviewer's context. */
	stage: 'before' | 'after';
	/** The value the check flagged: the tool input or the tool result. */
	value: unknown;
	/** What the check matched, as the check reported it. */
	matchDetails: Record<string, unknown>;
}

/**
 * Routes a `review`-response guardrail trigger to the agent's human-review
 * configuration. The routing starts a decision-workflow execution and returns;
 * the tool call continues and never waits for a reviewer.
 */
@Service()
export class ToolGuardrailReviewService {
	constructor(
		private readonly loader: CallableWorkflowLoader,
		private readonly policyChecker: SubworkflowPolicyChecker,
		private readonly activeExecutions: ActiveExecutions,
		private readonly config: AgentsConfig,
		private readonly logger: Logger,
	) {}

	/** Never rejects: a review must not break the call it flagged. */
	async route(
		context: ToolGuardrailReviewContext | undefined,
		guardrail: AgentToolGuardrailConfig,
		ctx: GuardrailToolCallContext,
		payload: GuardrailReviewPayload,
	): Promise<void> {
		try {
			await this.startRouting(context, guardrail, ctx, payload);
		} catch (error) {
			this.logger.warn('A guardrail review did not route', {
				guardrailKind: guardrail.kind,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private async startRouting(
		context: ToolGuardrailReviewContext | undefined,
		guardrail: AgentToolGuardrailConfig,
		ctx: GuardrailToolCallContext,
		payload: GuardrailReviewPayload,
	): Promise<void> {
		if (!context) {
			this.logger.warn('A guardrail review did not route: the run has no review identity', {
				guardrailKind: guardrail.kind,
			});
			return;
		}
		if (!this.config.humanReviewEnabled) {
			this.logger.warn('A guardrail review did not route: human review is not enabled', {
				agentId: context.agentId,
				guardrailKind: guardrail.kind,
			});
			return;
		}
		const configuration = context.configurations.find(
			(entry) => entry.id === guardrail.reviewConfigurationId,
		);
		if (!configuration) {
			this.logger.warn('A guardrail review did not route: its configuration is unavailable', {
				agentId: context.agentId,
				guardrailKind: guardrail.kind,
			});
			return;
		}
		if (configuration.method === 'channel') {
			// The only channel delivery the HITL surface offers is a
			// send-and-wait approval card, and its buttons only work for real
			// approval jobs this path never creates — so a channel review would
			// deliver a card with dead buttons and leave the child execution
			// waiting until timeout. A notify-only channel destination needs
			// per-platform nodes from the approval owners; until then, routing
			// skips the channel rather than sending a broken card.
			this.logger.warn(
				'A guardrail review did not route: channel review destinations are not supported yet',
				{ agentId: context.agentId, guardrailKind: guardrail.kind },
			);
			return;
		}
		const workflow = await this.loader.loadWorkflow(
			context.projectId,
			{ workflowId: configuration.workflowId, workflowName: configuration.name },
			{ usePublishedVersion: context.published },
		);
		if (!workflow) {
			this.logger.warn('A guardrail review did not route: the review workflow is unavailable', {
				agentId: context.agentId,
				guardrailKind: guardrail.kind,
			});
			return;
		}
		const trigger = workflow.nodes.find(
			(node: INode) => node.type === AGENT_DECISION_TRIGGER_NODE_TYPE && !node.disabled,
		);
		if (!trigger) {
			this.logger.warn(
				'A guardrail review did not route: the review workflow has no Request from agent trigger',
				{ agentId: context.agentId, guardrailKind: guardrail.kind },
			);
			return;
		}

		const description = `Guardrail "${guardrail.name ?? guardrail.kind}" flagged a ${
			payload.stage === 'before' ? 'tool input' : 'tool result'
		} for ${ctx.toolName}: ${JSON.stringify(payload.matchDetails)}`;
		// The execution runs on its own: nothing resumes the tool call on its
		// completion, so the review informs and never gates.
		const { WorkflowRunner } = await import('@/workflow-runner.js');
		void executeWorkflow(
			workflow,
			trigger,
			{
				requestId: `${ctx.runId}:${ctx.toolCallId}:${guardrail.id}`,
				agentId: context.agentId,
				toolName: ctx.toolName,
				description,
				toolInput: buildApprovalArgs(payload.value),
				requestedAt: new Date().toISOString(),
			},
			{
				workflowRunner: Container.get(WorkflowRunner),
				subworkflowPolicyChecker: this.policyChecker,
				activeExecutions: this.activeExecutions,
				projectId: context.projectId,
				executionMode: context.published ? 'integrated' : 'manual',
			},
		).catch((error) =>
			this.logger.warn('A guardrail review workflow failed', {
				agentId: context.agentId,
				guardrailKind: guardrail.kind,
				error: error instanceof Error ? error.message : String(error),
			}),
		);
	}
}
