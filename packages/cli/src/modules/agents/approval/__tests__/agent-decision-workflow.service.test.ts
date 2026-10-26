import type { BuiltTool, InterruptibleToolContext } from '@n8n/agents';
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
	defaultApprovalRoute: { type: 'configuration', configurationId: 'review' },
};

function setup() {
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
	const wrapped = service.wrap(tool, undefined, configuration, {
		agentId: 'agent',
		projectId: 'project',
		published: false,
	});
	const suspend = vi.fn().mockResolvedValue('waiting');
	const context: InterruptibleToolContext = {
		suspend,
		resumeData: undefined,
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

	it.each([false, true])('dispatches a decision workflow with redaction=%s', async (redacted) => {
		const { loader, jobs, jobService, executions, wrapped, handler, context } = setup();
		Container.set(WorkflowRunner, mock<WorkflowRunner>());
		const execute = vi.spyOn(workflowTools, 'executeWorkflow').mockResolvedValue({
			executionId: 'child',
			status: 'waiting',
		});
		loader.loadWorkflow.mockResolvedValue({
			id: 'decision-workflow',
			nodes: [{ name: 'Agent decision', type: 'n8n-nodes-base.agentDecisionTrigger' }],
			settings: {},
		} as WorkflowEntity);
		jobs.findWorkflowJobByExecutionId.mockResolvedValue({
			id: 'job',
			status: 'running',
		} as AgentBackgroundJob);
		executions.findSingleExecution.mockResolvedValue({ status: 'waiting' } as IExecutionResponse);
		const result = await wrapped.handler?.(
			{ value: 'review me' },
			{
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
			},
		);
		expect(result).toBe('waiting');
		expect(handler).not.toHaveBeenCalled();
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
				...(redacted ? { argumentsRedacted: true } : { arguments: { value: 'review me' } }),
			}),
			expect.objectContaining({
				agentRun: expect.objectContaining({
					workflowCaller: { workflowId: 'caller', executionId: 'parent' },
				}),
			}),
		);
		if (redacted) expect(execute.mock.calls[0][2]).not.toHaveProperty('arguments');
		expect(jobService.registerWorkflowJob).toHaveBeenCalledWith(
			expect.objectContaining({
				kind: 'approval',
				parentRunId: 'run',
				parentAgentId: 'agent',
				executionId: 'child',
			}),
		);
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
});
