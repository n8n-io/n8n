import {
	AgentEvent,
	type BuiltTool,
	type InterruptibleToolContext,
	type JSONValue,
} from '@n8n/agents';
import { getToolApprovalDisplayName, wrapToolForApproval } from '@n8n/agents/tool';
import {
	AGENT_DECISION_TRIGGER_NODE_TYPE,
	AgentDecisionSchema,
	WORKFLOW_WAIT_SUSPEND_TYPE,
	type AgentApprovalRoute,
	type AgentJsonConfig,
	type AgentIntegrationConfig,
} from '@n8n/api-types';
import { AgentsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Container, Service } from '@n8n/di';
import { OperationalError, UserError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';
import { truncate } from '@n8n/utils/string/truncate';
import { jsonParse } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { ActiveExecutions } from '@/active-executions';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks';
import { CallableWorkflowLoader } from '@/workflows/callable/callable-workflow-loader.service';

import { decodeAgentSandboxHostMetadata } from '../agent-sandbox-principal';
import { AgentBackgroundJobService } from '../background/agent-background-job.service';
import { buildApprovalArgs } from '../execution-recorder';
import { buildApprovalCardPayload } from '../integrations/agent-chat-suspension-cards';
import { AgentBackgroundJobRepository } from '../repositories/agent-background-job.repository';
import { executeWorkflow } from '../tools/workflow-tool-factory';
import { AgentChannelHitlService } from './agent-channel-hitl.service';
import { getAgentRuntimeDefinitionHash } from '../utils/agent-config-hash';
import { APPROVAL_EXPIRED_ERROR, hasApprovalExpired } from './approval-expiry';
import { collectAgentDecision } from './decision-result';
import { readWorkflowCaller } from './workflow-caller';

interface ApprovalRunIdentity {
	agentId: string;
	projectId: string;
	published: boolean;
	integrations?: AgentIntegrationConfig[];
	integrationType?: string;
	userId?: string;
	previewChat?: boolean;
	publishedN8nChat?: boolean;
}

export const DECISION_CONTINUATION_SCHEMA = z.object({
	__agentDecisionWorkflow: z.literal(true),
	executionId: z.string(),
	definitionHash: z.string(),
	workflowVersionId: z.string().optional(),
	reviewIndex: z.number().int().min(0).default(0),
	toolSuspended: z.boolean().optional(),
	toolContinuation: z.string().optional(),
});

const RESUME_SCHEMA = z.object({ type: z.string().optional(), value: z.string().optional() });

@Service()
export class AgentDecisionWorkflowService {
	constructor(
		private readonly loader: CallableWorkflowLoader,
		private readonly policyChecker: SubworkflowPolicyChecker,
		private readonly activeExecutions: ActiveExecutions,
		private readonly jobs: AgentBackgroundJobService,
		private readonly jobRepository: AgentBackgroundJobRepository,
		private readonly executionPersistence: ExecutionPersistence,
		private readonly config: AgentsConfig,
	) {}

	wrap(
		tool: BuiltTool,
		route: AgentApprovalRoute | undefined,
		agentConfig: AgentJsonConfig,
		identity: ApprovalRunIdentity,
		toolCodeByName: Record<string, string> = {},
	): BuiltTool {
		const effective = route;
		if (!effective || effective.type === 'conversation') {
			return wrapToolForApproval(tool, { requireApproval: true });
		}
		const configurations = effective.configurationIds.map((id) =>
			agentConfig.hitlConfigurations?.find((entry) => entry.id === id),
		);
		const definitionHash = getAgentRuntimeDefinitionHash(
			agentConfig,
			toolCodeByName,
			identity.integrations,
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
				if (pending.success && pending.data.definitionHash !== definitionHash)
					throw new UserError(
						'The Agent configuration changed while approval was pending. Start a new request.',
					);
				if (pending.success && pending.data.reviewIndex >= configurations.length)
					throw new UserError('The human review continuation is invalid');
				if (pending.success && pending.data.toolSuspended) {
					if (pending.data.reviewIndex !== configurations.length - 1)
						throw new UserError('The human review continuation is invalid');
					ctx.abortSignal?.throwIfAborted();
					return await handler?.call(tool, input, {
						...this.approvedContext(ctx, pending.data.executionId, pending.data.definitionHash),
						continuation:
							pending.data.toolContinuation === undefined
								? undefined
								: jsonParse<JSONValue>(pending.data.toolContinuation),
					});
				}
				if (
					!pending.success &&
					ctx.suspendPayload !== undefined &&
					(!isRecord(ctx.suspendPayload) || ctx.suspendPayload.type !== 'approval')
				)
					throw new UserError('The approval continuation is invalid');
				if (configurations.some((entry) => !entry))
					throw new UserError('A selected human review is unavailable');
				const firstIndex = pending.success ? pending.data.reviewIndex : 0;
				const review = async (index: number, workflowVersionId?: string): Promise<unknown> => {
					const configuration = configurations[index];
					if (!configuration) throw new UserError('A selected human review is unavailable');
					const reviewContext: InterruptibleToolContext = {
						...ctx,
						...(index !== firstIndex
							? { continuation: undefined, resumeData: undefined, suspendPayload: undefined }
							: {}),
						suspend: async (payload, options) =>
							await ctx.suspend(payload, {
								...options,
								continuation: {
									...(isRecord(options?.continuation) ? options.continuation : {}),
									reviewIndex: index,
								},
							}),
					};
					const reviewedTool: BuiltTool =
						index === configurations.length - 1
							? tool
							: {
									...tool,
									handler: async (_input, approved) => {
										const version =
											'continuation' in approved &&
											isRecord(approved.continuation) &&
											typeof approved.continuation.__agentApprovalWorkflowVersion === 'string'
												? approved.continuation.__agentApprovalWorkflowVersion
												: workflowVersionId;
										return await review(index + 1, version);
									},
								};
					return await this.decide(
						reviewedTool,
						input,
						reviewContext,
						configuration,
						identity,
						definitionHash,
						workflowVersionId,
					);
				};
				return await review(firstIndex);
			},
		};
	}

	private approvedContext(
		ctx: InterruptibleToolContext,
		executionId: string,
		definitionHash: string,
	): InterruptibleToolContext {
		return {
			...ctx,
			suspend: async (payload, options) => {
				const child = options?.continuation;
				return await ctx.suspend(payload, {
					...options,
					continuation: {
						__agentDecisionWorkflow: true,
						executionId:
							isRecord(child) && typeof child.executionId === 'string'
								? child.executionId
								: executionId,
						definitionHash,
						toolSuspended: true,
						...(isRecord(ctx.continuation) && typeof ctx.continuation.reviewIndex === 'number'
							? { reviewIndex: ctx.continuation.reviewIndex }
							: {}),
						...(child === undefined ? {} : { toolContinuation: JSON.stringify(child) }),
					},
				});
			},
		};
	}

	private approvalMessage(tool: BuiltTool, description: string | undefined, redacted: boolean) {
		const card = buildApprovalCardPayload({
			type: 'approval',
			toolName: tool.name,
			displayName: getToolApprovalDisplayName(tool),
			description: redacted ? 'Request details are hidden by the caller settings.' : description,
			supportsSessionApproval: false,
		});
		const message = [
			card.title,
			...card.components.flatMap((component) =>
				component.type === 'section' && typeof component.text === 'string' ? [component.text] : [],
			),
		].join('\n\n');
		// Telegram escapes can double the length. Leave room for both buttons and the notice.
		return truncate(message, 1900);
	}

	private async decide(
		tool: BuiltTool,
		input: unknown,
		ctx: InterruptibleToolContext,
		configuration: NonNullable<AgentJsonConfig['hitlConfigurations']>[number],
		identity: ApprovalRunIdentity,
		definitionHash: string,
		reviewedWorkflowVersionId?: string,
	): Promise<unknown> {
		const pending = DECISION_CONTINUATION_SCHEMA.safeParse(ctx.continuation);
		let executionId: string;
		let workflowVersionId = pending.success
			? pending.data.workflowVersionId
			: reviewedWorkflowVersionId;
		if (pending.success) {
			if (pending.data.definitionHash !== definitionHash)
				throw new UserError(
					'The Agent configuration changed while approval was pending. Start a new request.',
				);
			executionId = pending.data.executionId;
		} else {
			if (!this.config.humanInteractionsEnabled)
				throw new UserError('Human review is not enabled on this instance');
			if (tool.metadata?.kind === 'workflow' && typeof tool.metadata.workflowId === 'string') {
				const target = await this.loader.loadWorkflow(
					identity.projectId,
					{
						workflowId: tool.metadata.workflowId,
						workflowName: String(tool.metadata.workflowName ?? tool.name),
					},
					{ usePublishedVersion: identity.published },
				);
				if (!target) throw new UserError('The tool workflow is unavailable');
				if (workflowVersionId && workflowVersionId !== target.versionId)
					throw new UserError(
						'The tool workflow changed while human review was pending. Start a new request.',
					);
				workflowVersionId = target.versionId;
			}
			const caller = readWorkflowCaller(ctx.persistence?.hostMetadata?.workflowCaller);
			if (
				!ctx.runId ||
				!ctx.toolCallId ||
				!ctx.persistence ||
				(!caller && !identity.integrationType)
			) {
				throw new UserError(
					'Human review requires a resumable conversation, workflow, or task run',
				);
			}
			const workflow =
				configuration.method === 'channel'
					? await Container.get(AgentChannelHitlService).prepareWorkflow(
							configuration,
							identity.integrations ?? [],
							identity.projectId,
							identity.agentId,
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
			if (configuration.method === 'workflow' && workflow.id === caller?.workflowId)
				throw new UserError('A decision workflow cannot call itself');
			const scope = decodeAgentSandboxHostMetadata(ctx.persistence.hostMetadata);
			if (!scope) throw new OperationalError('Approval execution scope is unavailable');
			const { WorkflowRunner } = await import('@/workflow-runner.js');
			const requestedAt = new Date();
			const timeoutAt = configuration.expirySeconds
				? new Date(
						requestedAt.getTime() + configuration.expirySeconds * Time.seconds.toMilliseconds,
					)
				: undefined;
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
									tool,
									ctx.approvalDescription,
									ctx.persistence.hostMetadata?.approvalArgumentsRedacted === true,
								),
							}
						: {}),
					requestId: `${ctx.runId}:${ctx.toolCallId}`,
					agentId: identity.agentId,
					toolName: tool.name,
					...(ctx.approvalDescription &&
					ctx.persistence.hostMetadata?.approvalArgumentsRedacted !== true
						? { description: ctx.approvalDescription }
						: {}),
					...(ctx.persistence.hostMetadata?.approvalArgumentsRedacted === true
						? { argumentsRedacted: true }
						: { arguments: buildApprovalArgs(input) }),
					requestedAt: requestedAt.toISOString(),
					...(timeoutAt ? { expiresAt: timeoutAt.toISOString() } : {}),
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
			try {
				await this.jobs.registerWorkflowJob({
					id: randomUUID(),
					kind: 'approval',
					parentRunId: ctx.runId,
					callerExecutionId: caller?.executionId,
					parentAgentId: identity.agentId,
					parentThreadId: ctx.persistence.threadId,
					parentResourceId: ctx.persistence.resourceId,
					parentPrincipalHash: scope.principalHash,
					title: configuration.name,
					workflowId: workflow.id,
					executionId,
					...(timeoutAt ? { timeoutAt } : {}),
				});
			} catch (error) {
				// A request without a durable receipt must not leave a waiting child behind.
				const { ExecutionService } = await import('@/executions/execution.service.js');
				const { MissingExecutionStopError } = await import(
					'@/errors/missing-execution-stop.error.js'
				);
				try {
					await Container.get(ExecutionService).stop(executionId, [workflow.id]);
				} catch (stopError) {
					if (!(stopError instanceof MissingExecutionStopError))
						throw new AggregateError(
							[error, stopError],
							'Could not register or stop the approval execution',
						);
				}
				throw error;
			}
			ctx.emitEvent?.({
				type: AgentEvent.ToolApproval,
				phase: 'requested',
				toolCallId: ctx.toolCallId,
				toolName: tool.name,
				request: {
					type: 'approval',
					displayName: getToolApprovalDisplayName(tool),
					...(ctx.persistence.hostMetadata?.approvalArgumentsRedacted === true
						? { argumentsRedacted: true }
						: { args: buildApprovalArgs(input), description: ctx.approvalDescription }),
					...(configuration.method === 'workflow'
						? { workflowId: workflow.id, workflowExecutionId: executionId }
						: {}),
				},
			});
		}

		let job = await this.jobRepository.findWorkflowJobByExecutionId(executionId);
		if (job && hasApprovalExpired(job)) {
			if (job.status === 'running') await this.jobs.expireApprovalJob(job, { resumeAgent: false });
			throw new OperationalError(APPROVAL_EXPIRED_ERROR);
		}
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
		if (hasApprovalExpired(job)) {
			if (job.status === 'running') await this.jobs.expireApprovalJob(job, { resumeAgent: false });
			throw new OperationalError(APPROVAL_EXPIRED_ERROR);
		}
		if (job.status === 'running') {
			return await ctx.suspend(
				{
					type: WORKFLOW_WAIT_SUSPEND_TYPE,
					approval: true,
					displayName: getToolApprovalDisplayName(tool),
					...(configuration.method === 'workflow'
						? { workflowId: job.workflowId, workflowExecutionId: executionId }
						: {}),
					title: `Waiting for approval to run ${getToolApprovalDisplayName(tool) ?? tool.name}.`,
					components: [
						...(ctx.approvalDescription &&
						ctx.persistence?.hostMetadata?.approvalArgumentsRedacted !== true
							? [{ type: 'section', text: ctx.approvalDescription }]
							: []),
						{
							type: 'section',
							text: 'The Agent will continue when the approval request is resolved.',
						},
					],
				},
				{
					continuation: {
						__agentDecisionWorkflow: true,
						executionId,
						definitionHash,
						...(workflowVersionId ? { workflowVersionId } : {}),
					},
					resumeSchema: RESUME_SCHEMA,
				},
			);
		}
		if (job.status !== 'completed' || !job.result)
			throw new OperationalError(job.error ?? 'The decision workflow was cancelled');
		const decision = AgentDecisionSchema.parse(jsonParse<unknown>(job.result));
		ctx.abortSignal?.throwIfAborted();
		if (ctx.toolCallId) {
			ctx.emitEvent?.({
				type: AgentEvent.ToolApproval,
				phase: 'resolved',
				toolCallId: ctx.toolCallId,
				toolName: tool.name,
				response: decision,
			});
		}
		if (!decision.approved)
			return { declined: true, message: `Tool "${tool.name}" was not approved` };
		return await tool.handler?.call(tool, input, {
			...this.approvedContext(ctx, executionId, definitionHash),
			resumeData: undefined,
			continuation: workflowVersionId
				? { __agentApprovalWorkflowVersion: workflowVersionId }
				: undefined,
			suspendPayload: undefined,
			resumeSchema: undefined,
		});
	}
}
