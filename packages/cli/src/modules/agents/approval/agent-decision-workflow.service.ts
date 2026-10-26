import { truncate } from '@n8n/utils/string/truncate';
import { AgentChannelHitlService } from './agent-channel-hitl.service';
import type { BuiltTool, InterruptibleToolContext } from '@n8n/agents';
import { wrapToolForApproval } from '@n8n/agents/tool';
import {
	AGENT_DECISION_TRIGGER_NODE_TYPE,
	AgentDecisionSchema,
	WORKFLOW_WAIT_SUSPEND_TYPE,
	type AgentApprovalRoute,
	type AgentJsonConfig,
	type AgentIntegrationConfig,
} from '@n8n/api-types';
import { Container, Service } from '@n8n/di';
import { OperationalError, UserError, jsonParse } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { ActiveExecutions } from '@/active-executions';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks';

import { decodeAgentSandboxHostMetadata } from '../agent-sandbox-principal';
import { AgentBackgroundJobService } from '../background/agent-background-job.service';
import { buildApprovalArgs } from '../execution-recorder';
import { AgentBackgroundJobRepository } from '../repositories/agent-background-job.repository';
import { executeWorkflow } from '../tools/workflow-tool-factory';
import { WorkflowToolWorkflowLoader } from '../tools/workflow-tool-workflow-loader.service';
import { collectAgentDecision } from './decision-result';
import { readWorkflowCaller } from './workflow-caller';

export const DECISION_CONTINUATION_SCHEMA = z.object({
	__agentDecisionWorkflow: z.literal(true),
	executionId: z.string(),
});

const RESUME_SCHEMA = z.object({ type: z.string().optional(), value: z.string().optional() });

@Service()
export class AgentDecisionWorkflowService {
	constructor(
		private readonly loader: WorkflowToolWorkflowLoader,
		private readonly policyChecker: SubworkflowPolicyChecker,
		private readonly activeExecutions: ActiveExecutions,
		private readonly jobs: AgentBackgroundJobService,
		private readonly jobRepository: AgentBackgroundJobRepository,
		private readonly executionPersistence: ExecutionPersistence,
	) {}

	wrap(
		tool: BuiltTool,
		route: AgentApprovalRoute | undefined,
		agentConfig: AgentJsonConfig,
		identity: {
			agentId: string;
			projectId: string;
			published: boolean;
			integrations?: AgentIntegrationConfig[];
		},
	): BuiltTool {
		const effective = route ?? agentConfig.defaultApprovalRoute;
		if (!effective || effective.type === 'conversation') {
			return wrapToolForApproval(tool, { requireApproval: true });
		}
		const configuration = agentConfig.hitlConfigurations?.find(
			(entry) => entry.id === effective.configurationId,
		);
		const handler = tool.handler;
		return {
			...tool,
			approval: { required: true },
			suspendSchema: z.unknown(),
			resumeSchema: z.unknown(),
			handler: async (input, ctx) => {
				if (!('suspend' in ctx)) throw new OperationalError('Approval requires a resumable tool');
				const pending = DECISION_CONTINUATION_SCHEMA.safeParse(ctx.continuation);
				if (ctx.suspendPayload !== undefined && !pending.success) {
					return await handler?.call(tool, input, ctx);
				}
				if (!configuration) throw new UserError('The selected HITL configuration is unavailable');
				return await this.decide(tool, input, ctx, configuration, identity);
			},
		};
	}

	private approvalMessage(toolName: string, input: unknown, redacted: boolean) {
		const argumentsText = redacted
			? 'Tool arguments are hidden by the caller settings.'
			: JSON.stringify(buildApprovalArgs(input), null, 2);
		// Telegram escapes can double the length. Leave room for both buttons and the notice.
		const message = `Approval required for ${toolName}\n\n${argumentsText}`;
		return message.length > 1900
			? `${truncate(message, 1900)}\n\nTool arguments are truncated.`
			: message;
	}

	private async decide(
		tool: BuiltTool,
		input: unknown,
		ctx: InterruptibleToolContext,
		configuration: NonNullable<AgentJsonConfig['hitlConfigurations']>[number],
		identity: {
			agentId: string;
			projectId: string;
			published: boolean;
			integrations?: AgentIntegrationConfig[];
		},
	): Promise<unknown> {
		const pending = DECISION_CONTINUATION_SCHEMA.safeParse(ctx.continuation);
		let executionId: string;
		if (pending.success) {
			executionId = pending.data.executionId;
		} else {
			const caller = readWorkflowCaller(ctx.persistence?.hostMetadata?.workflowCaller);
			if (!caller || !ctx.runId || !ctx.toolCallId || !ctx.persistence) {
				throw new UserError(
					'This spike supports advanced approvals from Message an Agent version 4',
				);
			}
			const workflow =
				configuration.method === 'channel'
					? Container.get(AgentChannelHitlService).buildWorkflow(
							configuration,
							identity.integrations ?? [],
							caller.workflowId,
						)
					: await this.loader.loadWorkflow(
							identity.projectId,
							{ workflowId: configuration.workflowId, workflowName: configuration.name },
							{ usePublishedVersion: identity.published },
						);
			const trigger = workflow?.nodes.find(
				(node) => node.type === AGENT_DECISION_TRIGGER_NODE_TYPE && !node.disabled,
			);
			if (!workflow || !trigger)
				throw new UserError('Select a workflow with an Agent decision trigger');
			if (configuration.method === 'workflow' && workflow.id === caller.workflowId)
				throw new UserError('A decision workflow cannot call itself');
			const { WorkflowRunner } = await import('@/workflow-runner.js');
			const result = await executeWorkflow(
				Object.assign(workflow, {
					settings: {
						...workflow.settings,
						saveDataSuccessExecution: 'all',
						saveDataErrorExecution: 'all',
					},
				}),
				trigger,
				{
					...(configuration.method === 'channel'
						? {
								message: this.approvalMessage(
									tool.name,
									input,
									ctx.persistence.hostMetadata?.approvalArgumentsRedacted === true,
								),
							}
						: {}),
					requestId: `${ctx.runId}:${ctx.toolCallId}`,
					agentId: identity.agentId,
					toolName: tool.name,
					...(ctx.persistence.hostMetadata?.approvalArgumentsRedacted === true
						? { argumentsRedacted: true }
						: { arguments: buildApprovalArgs(input) }),
					requestedAt: new Date().toISOString(),
				},
				{
					workflowRunner: Container.get(WorkflowRunner),
					subworkflowPolicyChecker: this.policyChecker,
					activeExecutions: this.activeExecutions,
					projectId: identity.projectId,
					...(configuration.method === 'channel' ? { executionProjectId: identity.projectId } : {}),
					executionMode: identity.published ? 'integrated' : 'manual',
					agentRun: {
						...identity,
						threadId: ctx.persistence.threadId,
						runId: ctx.runId,
						toolCallId: ctx.toolCallId,
						workflowCaller: caller,
					},
					abortSignal: ctx.abortSignal,
				},
			);
			executionId = result.executionId;
			const scope = decodeAgentSandboxHostMetadata(ctx.persistence.hostMetadata);
			if (!scope) throw new OperationalError('Approval execution scope is unavailable');
			await this.jobs.registerWorkflowJob({
				id: randomUUID(),
				kind: 'approval',
				parentRunId: ctx.runId,
				parentAgentId: identity.agentId,
				parentThreadId: ctx.persistence.threadId,
				parentResourceId: ctx.persistence.resourceId,
				parentPrincipalHash: scope.principalHash,
				title: configuration.name,
				workflowId: workflow.id,
				executionId,
			});
		}

		let job = await this.jobRepository.findWorkflowJobByExecutionId(executionId);
		if (job?.status === 'running') {
			const execution = await this.executionPersistence.findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
			});
			if (!execution) throw new OperationalError('The decision workflow result is unavailable');
			if (execution.status === 'success') {
				const decision = collectAgentDecision(
					execution.data.resultData.runData,
					execution.workflowData.connections,
				);
				await this.jobs.settle(job.id, { status: 'completed', result: JSON.stringify(decision) });
			} else if (
				execution.status !== 'waiting' &&
				execution.status !== 'running' &&
				execution.status !== 'new'
			) {
				await this.jobs.settle(job.id, {
					status: 'failed',
					error: `Decision workflow ended with status ${execution.status}`,
				});
			}
			job = await this.jobRepository.findWorkflowJobByExecutionId(executionId);
		}
		if (!job) throw new OperationalError('The approval job is unavailable');
		if (job.status === 'running') {
			return await ctx.suspend(
				{
					type: WORKFLOW_WAIT_SUSPEND_TYPE,
					title: `Waiting for ${configuration.name}`,
					components: [],
				},
				{
					continuation: { __agentDecisionWorkflow: true, executionId },
					resumeSchema: RESUME_SCHEMA,
				},
			);
		}
		if (job.status !== 'completed' || !job.result)
			throw new OperationalError(job.error ?? 'The decision workflow was cancelled');
		const decision = AgentDecisionSchema.parse(jsonParse<unknown>(job.result));
		ctx.abortSignal?.throwIfAborted();
		if (!decision.approved)
			return { declined: true, message: `Tool "${tool.name}" was not approved` };
		return await tool.handler?.call(tool, input, {
			...ctx,
			resumeData: undefined,
			continuation: undefined,
			suspendPayload: undefined,
			resumeSchema: undefined,
		});
	}
}
