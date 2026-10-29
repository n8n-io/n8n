import { AgentChannelHitlService } from '../agent-channel-hitl.service';
import { AgentEvent, type BuiltTool, type InterruptibleToolContext } from '@n8n/agents';
import type { AgentJsonConfig } from '@n8n/api-types';
import { Container } from '@n8n/di';
import type { IExecutionResponse, WorkflowEntity } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { WorkflowRunner } from '@/workflow-runner';
import {
	encodeAgentSandboxHostMetadata,
	hashAgentSandboxPrincipal,
} from '../../agent-sandbox-principal';
import * as workflowTools from '../../tools/workflow-tool-factory';
import type { ActiveExecutions } from '@/active-executions';
import type { ExecutionPersistence } from '@/executions/execution-persistence';
import type { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks';
import type { AgentBackgroundJobService } from '../../background/agent-background-job.service';
import type { AgentBackgroundJob } from '../../entities/agent-background-job.entity';
import type { AgentBackgroundJobRepository } from '../../repositories/agent-background-job.repository';
import type { WorkflowToolWorkflowLoader } from '../../tools/workflow-tool-workflow-loader.service';
import { AgentDecisionWorkflowService } from '../agent-decision-workflow.service';

const configuration: AgentJsonConfig = {
	name: 'Reviewer',
	model: 'anthropic/test',
	instructions: 'Review tools',
	hitlConfigurations: [
		{ id: 'review', name: 'Review', method: 'workflow', workflowId: 'workflow' },
	],
};

function setup(agentConfiguration: AgentJsonConfig = configuration) {
	const jobs = mock<AgentBackgroundJobRepository>();
	const executions = mock<ExecutionPersistence>();
	const loader = mock<WorkflowToolWorkflowLoader>();
	const jobService = mock<AgentBackgroundJobService>();
	const service = new AgentDecisionWorkflowService(
		loader,
		mock<SubworkflowPolicyChecker>(),
		mock<ActiveExecutions>(),
		jobService,
		jobs,
		executions,
	);
	const handler = vi.fn().mockResolvedValue('executed');
	const tool: BuiltTool = { name: 'write', description: 'Write a record', handler };
	const wrapped = service.wrap(
		tool,
		{ type: 'configuration', configurationId: 'review' },
		agentConfiguration,
		{
			agentId: 'agent',
			projectId: 'project',
			published: false,
		},
	);
	const suspend = vi.fn().mockResolvedValue('waiting');
	const context: InterruptibleToolContext = {
		suspend,
		resumeData: undefined,
		emitEvent: vi.fn(),
		toolCallId: 'call',
		continuation: { __agentDecisionWorkflow: true, executionId: 'child' },
		suspendPayload: { type: 'workflow_wait' },
	};
	return {
		jobs,
		jobService,
		loader,
		executions,
		service,
		tool,
		wrapped,
		handler,
		suspend,
		context,
	};
}

describe('Agent decision workflow approval', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		Container.reset();
	});

	it.each([
		[false, undefined, false],
		[true, 3600, false],
		[false, 86400, false],
		[false, 604800, false],
		[false, undefined, true],
	] as const)(
		'dispatches a decision workflow with redaction=%s, expiry=%s, and immediate=%s',
		async (redacted, expirySeconds, immediate) => {
			const { loader, jobs, jobService, executions, wrapped, handler, context } = setup({
				...configuration,
				hitlConfigurations: configuration.hitlConfigurations?.map((entry) => ({
					...entry,
					expirySeconds,
				})),
			});
			Container.set(WorkflowRunner, mock<WorkflowRunner>());
			const execute = vi.spyOn(workflowTools, 'executeWorkflow').mockResolvedValue({
				executionId: 'child',
				status: immediate ? 'success' : 'waiting',
			});
			loader.loadWorkflow.mockResolvedValue({
				id: 'decision-workflow',
				nodes: [{ name: 'Agent decision', type: 'n8n-nodes-base.agentDecisionTrigger' }],
				settings: {},
			} as WorkflowEntity);
			jobs.findWorkflowJobByExecutionId.mockResolvedValue({
				id: 'job',
				status: immediate ? 'completed' : 'running',
				result: immediate ? JSON.stringify({ approved: true }) : null,
			} as AgentBackgroundJob);
			executions.findSingleExecution.mockResolvedValue({ status: 'waiting' } as IExecutionResponse);
			const input = {
				value: 'review me',
				recipients: ['reviewer@example.com', 'owner@example.com'],
				changes: { count: 4, enabled: false, details: { note: 'Review this change' } },
			};
			const result = await wrapped.handler?.(input, {
				...context,
				continuation: undefined,
				suspendPayload: undefined,
				runId: 'run',
				toolCallId: 'call',
				persistence: {
					threadId: 'thread',
					resourceId: 'resource',
					hostMetadata: {
						...encodeAgentSandboxHostMetadata({
							projectId: 'project',
							principalHash: hashAgentSandboxPrincipal({
								type: 'workflow-execution',
								workflowId: 'caller',
								executionId: 'parent',
							}),
						}),
						workflowCaller: JSON.stringify({ workflowId: 'caller', executionId: 'parent' }),
						approvalArgumentsRedacted: redacted,
					},
				},
			});
			expect(context.emitEvent).toHaveBeenCalledWith({
				type: AgentEvent.ToolApproval,
				phase: 'requested',
				toolCallId: 'call',
				toolName: 'write',
				request: expect.objectContaining({
					type: 'approval',
					workflowId: 'decision-workflow',
					workflowExecutionId: 'child',
					...(redacted ? { argumentsRedacted: true } : { args: input }),
				}),
			});
			if (redacted)
				expect(vi.mocked(context.emitEvent!).mock.calls[0][0]).not.toHaveProperty('request.args');
			expect(result).toBe(immediate ? 'executed' : 'waiting');
			expect(handler).toHaveBeenCalledTimes(immediate ? 1 : 0);
			if (immediate) {
				expect(context.suspend).not.toHaveBeenCalled();
				expect(context.emitEvent).toHaveBeenLastCalledWith(
					expect.objectContaining({ phase: 'resolved', response: { approved: true } }),
				);
			}
			expect(loader.loadWorkflow).toHaveBeenCalledWith(
				'project',
				expect.objectContaining({ workflowId: 'workflow' }),
				{ usePublishedVersion: false },
			);
			expect(execute).toHaveBeenCalledWith(
				expect.objectContaining({
					settings: expect.objectContaining({ saveDataSuccessExecution: 'all' }),
				}),
				expect.anything(),
				expect.objectContaining({
					requestId: 'run:call',
					toolName: 'write',
					...(redacted ? { argumentsRedacted: true } : { arguments: input }),
				}),
				expect.objectContaining({
					agentRun: expect.objectContaining({
						workflowCaller: { workflowId: 'caller', executionId: 'parent' },
					}),
				}),
			);
			if (redacted) expect(execute.mock.calls[0][2]).not.toHaveProperty('arguments');
			const request = execute.mock.calls[0][2];
			const registered = jobService.registerWorkflowJob.mock.calls[0][0];
			if (expirySeconds) {
				const expected = new Date(
					new Date(request.requestedAt as string).getTime() + expirySeconds * 1000,
				);
				expect(registered.timeoutAt).toEqual(expected);
				expect(request.expiresAt).toBe(expected.toISOString());
			} else {
				expect(registered).not.toHaveProperty('timeoutAt');
				expect(request).not.toHaveProperty('expiresAt');
			}

			expect(jobService.registerWorkflowJob).toHaveBeenCalledWith(
				expect.objectContaining({
					kind: 'approval',
					parentRunId: 'run',
					parentAgentId: 'agent',
					executionId: 'child',
				}),
			);
		},
	);

	it.each([true, false])('dispatches a channel request with redaction=%s', async (redacted) => {
		const { service, tool, jobs, executions, context, handler, loader } = setup();
		const channels = mock<AgentChannelHitlService>();
		Container.set(AgentChannelHitlService, channels);
		Container.set(WorkflowRunner, mock<WorkflowRunner>());
		channels.prepareWorkflow.mockResolvedValue({
			id: 'caller',
			name: 'Channel approval',
			nodes: [{ name: 'Agent decision', type: 'n8n-nodes-base.agentDecisionTrigger' }],
			connections: {},
			settings: {},
		} as never);
		const execute = vi
			.spyOn(workflowTools, 'executeWorkflow')
			.mockResolvedValue({ executionId: 'child', status: 'waiting' });
		jobs.findWorkflowJobByExecutionId.mockResolvedValue({
			id: 'job',
			status: 'running',
		} as AgentBackgroundJob);
		executions.findSingleExecution.mockResolvedValue({ status: 'waiting' } as IExecutionResponse);
		const integration = { type: 'slack', credentialId: 'credential' } as const;
		const config = {
			...configuration,
			hitlConfigurations: [
				{
					id: 'review',
					name: 'Channel approval',
					method: 'channel',
					channel: 'slack',
					credentialId: 'credential',
					recipient: { kind: 'user', id: 'U1' },
				},
			],
		} as AgentJsonConfig;
		const wrapped = service.wrap(
			tool,
			{ type: 'configuration', configurationId: 'review' },
			config,
			{
				agentId: 'agent',
				projectId: 'project',
				published: false,
				integrations: [integration],
			},
		);
		expect(
			await wrapped.handler?.(
				{ secret: 'hidden' },
				{
					...context,
					continuation: undefined,
					suspendPayload: undefined,
					runId: 'run',
					toolCallId: 'call',
					approvalDescription: 'Update the selected record.',
					persistence: {
						threadId: 'thread',
						resourceId: 'resource',
						hostMetadata: {
							...encodeAgentSandboxHostMetadata({
								projectId: 'project',
								principalHash: hashAgentSandboxPrincipal({
									type: 'workflow-execution',
									workflowId: 'caller',
									executionId: 'parent',
								}),
							}),
							workflowCaller: JSON.stringify({ workflowId: 'caller', executionId: 'parent' }),
							approvalArgumentsRedacted: redacted,
						},
					},
				},
			),
		).toBe('waiting');
		expect(channels.prepareWorkflow).toHaveBeenCalledWith(
			config.hitlConfigurations?.[0],
			[integration],
			'project',
			'agent',
			'caller',
		);
		expect(execute.mock.calls[0][2]).toMatchObject({
			...(redacted ? { argumentsRedacted: true } : { description: 'Update the selected record.' }),
			message: expect.stringContaining(
				redacted ? 'hidden by the caller settings' : 'Update the selected record.',
			),
		});
		const request = execute.mock.calls[0][2];
		if (redacted) {
			expect(request).not.toHaveProperty('arguments');
			expect(request).not.toHaveProperty('description');
			expect(request.message).not.toContain('Update the selected record.');
		}
		expect(context.emitEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				phase: 'requested',
				request: expect.objectContaining({ type: 'approval' }),
			}),
		);
		expect(request.message).toContain('The agent wants to run this tool: write');
		expect(request.message).not.toContain('secret');
		expect(loader.loadWorkflow).not.toHaveBeenCalled();
		expect(handler).not.toHaveBeenCalled();
	});

	it.each([true, false])(
		'uses the durable approved=%s result before running the tool',
		async (approved) => {
			const { jobs, wrapped, context, handler } = setup();
			jobs.findWorkflowJobByExecutionId.mockResolvedValue({
				status: 'completed',
				result: JSON.stringify({ approved }),
			} as AgentBackgroundJob);
			const result = await wrapped.handler?.(
				{ value: 1 },
				{ ...context, resumeData: { approved: !approved } },
			);
			expect(context.emitEvent).toHaveBeenCalledWith({
				type: AgentEvent.ToolApproval,
				phase: 'resolved',
				toolCallId: 'call',
				toolName: 'write',
				response: { approved },
			});
			expect(handler).toHaveBeenCalledTimes(approved ? 1 : 0);
			if (approved) expect(result).toBe('executed');
			else expect(result).toMatchObject({ declined: true });
		},
	);

	it('keeps waiting when the persisted request has no decision', async () => {
		const { jobs, executions, wrapped, context, handler, suspend } = setup();
		jobs.findWorkflowJobByExecutionId.mockResolvedValue({
			status: 'running',
		} as AgentBackgroundJob);
		executions.findSingleExecution.mockResolvedValue({ status: 'waiting' } as never);
		expect(await wrapped.handler?.({}, { ...context, resumeData: { approved: true } })).toBe(
			'waiting',
		);
		expect(suspend).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				continuation: { __agentDecisionWorkflow: true, executionId: 'child' },
			}),
		);
		expect(handler).not.toHaveBeenCalled();
	});

	it.each(['failed', 'cancelled'])(
		'does not execute after the decision workflow is %s',
		async (status) => {
			const { jobs, wrapped, context, handler } = setup();
			jobs.findWorkflowJobByExecutionId.mockResolvedValue({
				status,
				error: 'Review ended',
			} as AgentBackgroundJob);
			await expect(wrapped.handler?.({}, context)).rejects.toThrow('Review ended');
			expect(handler).not.toHaveBeenCalled();
		},
	);

	it('resumes a persisted decision without dispatching another workflow', async () => {
		const { jobs, loader, wrapped, context, handler } = setup();
		jobs.findWorkflowJobByExecutionId.mockResolvedValue({
			status: 'completed',
			result: '{"approved":true}',
		} as AgentBackgroundJob);
		await wrapped.handler?.({}, context);
		expect(handler).toHaveBeenCalledOnce();
		expect(loader.loadWorkflow).not.toHaveBeenCalled();
	});

	it('keeps the current approval behavior when no configuration is selected', async () => {
		const { service, tool, handler, suspend, context, loader } = setup();
		const wrapped = service.wrap(tool, undefined, configuration, {
			agentId: 'agent',
			projectId: 'project',
			published: false,
		});
		await wrapped.handler?.({}, { ...context, continuation: undefined, suspendPayload: undefined });
		expect(suspend).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'approval', toolName: 'write' }),
			expect.anything(),
		);
		expect(loader.loadWorkflow).not.toHaveBeenCalled();
		expect(handler).not.toHaveBeenCalled();
	});

	it.each(['n8n_chat', 'slack', 'telegram', 'discord'])(
		'asks the requester in %s when administrator approval is off',
		async (integrationType) => {
			const { service, tool, handler, suspend, context, loader } = setup();
			const wrapped = service.wrap(
				tool,
				{ type: 'configuration', configurationId: 'review' },
				configuration,
				{
					agentId: 'agent',
					projectId: 'project',
					published: false,
					integrationType,
				},
			);
			await wrapped.handler?.(
				{},
				{ ...context, continuation: undefined, suspendPayload: undefined },
			);
			expect(suspend).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'approval', toolName: 'write' }),
				expect.anything(),
			);
			expect(loader.loadWorkflow).not.toHaveBeenCalled();
			expect(handler).not.toHaveBeenCalled();
			await wrapped.handler?.(
				{},
				{
					...context,
					continuation: suspend.mock.calls[0][1].continuation,
					suspendPayload: suspend.mock.calls[0][0],
					resumeData: { approved: true },
				},
			);
			expect(handler).toHaveBeenCalledOnce();
		},
	);

	it.each([
		['n8n_chat', true, false],
		['n8n_chat', false, true],
		['slack', false, false],
	] as const)(
		'routes administrator approval outside %s (preview=%s, publishedChat=%s)',
		async (integrationType, previewChat, publishedN8nChat) => {
			const { service, tool, jobs, executions, loader, context, suspend, handler } = setup();
			Container.set(WorkflowRunner, mock<WorkflowRunner>());
			const execute = vi
				.spyOn(workflowTools, 'executeWorkflow')
				.mockResolvedValue({ executionId: 'child', status: 'waiting' });
			loader.loadWorkflow.mockResolvedValue(
				mock<WorkflowEntity>({
					id: 'decision',
					nodes: [
						{
							id: 'trigger',
							disabled: false,
							name: 'Agent decision',
							type: 'n8n-nodes-base.agentDecisionTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
					],
					settings: {},
				}),
			);
			jobs.findWorkflowJobByExecutionId.mockResolvedValue(
				mock<AgentBackgroundJob>({ id: 'job', status: 'running', workflowId: 'decision' }),
			);
			executions.findSingleExecution.mockResolvedValue(
				mock<IExecutionResponse>({ status: 'waiting' }),
			);
			const adminConfig = {
				...configuration,
				hitlConfigurations: configuration.hitlConfigurations?.map((entry) => ({
					...entry,
					disallowRequesterApproval: true,
				})),
			};
			const wrapped = service.wrap(
				tool,
				{ type: 'configuration', configurationId: 'review' },
				adminConfig,
				{
					agentId: 'agent',
					projectId: 'project',
					published: publishedN8nChat,
					integrationType,
					previewChat,
					publishedN8nChat,
					userId: 'requester',
				},
			);
			const initial: InterruptibleToolContext = {
				...context,
				continuation: undefined,
				suspendPayload: undefined,
				runId: 'run',
				toolCallId: 'call',
				approvalDescription: 'Update the selected record.',
				persistence: {
					threadId: 'thread',
					resourceId: 'resource',
					hostMetadata: encodeAgentSandboxHostMetadata({
						projectId: 'project',
						principalHash: hashAgentSandboxPrincipal({ type: 'n8n-user', userId: 'requester' }),
					}),
				},
			};
			await wrapped.handler?.({}, initial);
			expect(execute.mock.calls[0][3].agentRun).toMatchObject({
				integrationType,
				previewChat,
				publishedN8nChat,
				userId: 'requester',
				threadId: 'thread',
				runId: 'run',
				toolCallId: 'call',
			});
			expect(execute.mock.calls[0][3].agentRun?.workflowCaller).toBeUndefined();
			expect(suspend.mock.calls[0][0]).toEqual({
				type: 'workflow_wait',
				approval: true,
				displayName: undefined,
				workflowId: 'decision',
				workflowExecutionId: 'child',
				title: 'Waiting for administrator approval to run write.',
				components: [
					{ type: 'section', text: 'Update the selected record.' },
					{
						type: 'section',
						text: 'The Agent will continue when the approval request is resolved.',
					},
				],
			});
			// A requester resume cannot turn an unfinished review into an approval.
			await wrapped.handler?.(
				{},
				{
					...initial,
					continuation: suspend.mock.calls[0][1].continuation,
					suspendPayload: suspend.mock.calls[0][0],
					resumeData: { approved: true },
				},
			);
			expect(handler).not.toHaveBeenCalled();
			expect(execute).toHaveBeenCalledOnce();
			jobs.findWorkflowJobByExecutionId.mockResolvedValue(
				mock<AgentBackgroundJob>({ status: 'completed', result: '{"approved":true}' }),
			);
			await wrapped.handler?.(
				{},
				{
					...initial,
					continuation: suspend.mock.calls[0][1].continuation,
					suspendPayload: suspend.mock.calls[0][0],
					resumeData: { type: 'workflow_finished' },
				},
			);
			expect(handler).toHaveBeenCalledOnce();
		},
	);

	it('uses an explicit conversation override', () => {
		const { service, tool } = setup();
		const wrapped = service.wrap(tool, { type: 'conversation' }, configuration, {
			agentId: 'agent',
			projectId: 'project',
			published: false,
		});
		expect(wrapped.approval).toMatchObject({ required: true });
		expect(wrapped.resumeSchema).toBeDefined();
	});

	it('continues an approved tool that later parks at its own wait', async () => {
		const { wrapped, handler, context, jobs } = setup();
		await wrapped.handler?.({}, { ...context, continuation: { executionId: 'tool-child' } });
		expect(handler).toHaveBeenCalledOnce();
		expect(jobs.findWorkflowJobByExecutionId).not.toHaveBeenCalled();
	});

	it('checks cancellation before it runs an approved tool', async () => {
		const { jobs, wrapped, context, handler } = setup();
		jobs.findWorkflowJobByExecutionId.mockResolvedValue({
			status: 'completed',
			result: '{"approved":true}',
		} as AgentBackgroundJob);
		const controller = new AbortController();
		controller.abort(new Error('Caller cancelled'));
		await expect(
			wrapped.handler?.({}, { ...context, abortSignal: controller.signal }),
		).rejects.toThrow('Caller cancelled');
		expect(handler).not.toHaveBeenCalled();
	});

	it.each(['running', 'completed'] as const)(
		'rejects a %s approval after its saved deadline',
		async (status) => {
			const { jobs, jobService, wrapped, context, handler } = setup();
			const timeoutAt = new Date(Date.now() - 1000);
			const job = mock<AgentBackgroundJob>({
				id: 'job',
				kind: 'approval',
				status,
				timeoutAt,
				settledAt: status === 'completed' ? new Date() : null,
				result: '{"approved":true}',
			});
			jobs.findWorkflowJobByExecutionId.mockResolvedValue(job);
			await expect(wrapped.handler?.({}, context)).rejects.toThrow('approval request expired');
			if (status === 'running')
				expect(jobService.expireApprovalJob).toHaveBeenCalledWith(job, { resumeAgent: false });
			else expect(jobService.expireApprovalJob).not.toHaveBeenCalled();
			expect(handler).not.toHaveBeenCalled();
		},
	);

	it('accepts a decision completed before expiry even when the Agent resumes later', async () => {
		const { jobs, wrapped, context, handler } = setup();
		const timeoutAt = new Date(Date.now() - 1000);
		jobs.findWorkflowJobByExecutionId.mockResolvedValue(
			mock<AgentBackgroundJob>({
				kind: 'approval',
				status: 'completed',
				timeoutAt,
				settledAt: new Date(timeoutAt.getTime() - 1000),
				result: '{"approved":true}',
			}),
		);
		await wrapped.handler?.({}, context);
		expect(handler).toHaveBeenCalledOnce();
	});
});
