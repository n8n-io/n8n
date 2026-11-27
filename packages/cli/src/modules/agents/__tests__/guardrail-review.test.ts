import { Container } from '@n8n/di';
import type { AgentsConfig } from '@n8n/config';
import { Logger } from '@n8n/backend-common';
import type { AgentHitlConfiguration, AgentToolGuardrailConfig } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CallableWorkflowLoader } from '@/workflows/callable/callable-workflow-loader.service';
import type { ActiveExecutions } from '@/active-executions';
import type { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks';

import { ToolGuardrailReviewService } from '../guardrail-review';

vi.mock('@/workflow-runner', () => ({
	WorkflowRunner: class {},
}));

vi.mock('../tools/workflow-tool-factory', () => ({
	executeWorkflow: vi.fn(),
}));

vi.mock('../execution-recorder', () => ({
	buildApprovalArgs: vi.fn((value: unknown) => value),
}));

import { WorkflowRunner } from '@/workflow-runner';
import { executeWorkflow as executeWorkflowFn } from '../tools/workflow-tool-factory';

/** The module mock's typed view: the real signature carries no vitest members. */
const executeWorkflow = vi.mocked(executeWorkflowFn);

const workflowWithTrigger = {
	id: 'wf-9',
	name: 'Security review',
	nodes: [
		{
			id: 't',
			name: 'Request from agent',
			type: 'n8n-nodes-base.agentDecisionTrigger',
			disabled: false,
		},
	],
	connections: {},
};

const reviewGuardrail = {
	kind: 'keywords',
	id: 'g1',
	response: 'review',
	reviewConfigurationId: 'config-1',
	keywords: ['secret'],
} satisfies AgentToolGuardrailConfig;

const context = {
	agentId: 'agent-1',
	projectId: 'project-1',
	published: false,
	integrations: [],
	configurations: [
		{ id: 'config-1', name: 'Security review', method: 'workflow', workflowId: 'wf-9' },
	] as AgentHitlConfiguration[],
};

const toolCtx = { toolCallId: 'tc-1', toolName: 'echo', input: {}, runId: 'run-1' };

function makeService(overrides: Partial<AgentsConfig> = {}) {
	const loader = mock<CallableWorkflowLoader>();
	const logger = mock<Logger>();
	const service = new ToolGuardrailReviewService(
		loader,
		mock<SubworkflowPolicyChecker>(),
		mock<ActiveExecutions>(),
		{ humanReviewEnabled: true, ...overrides } as AgentsConfig,
		logger,
	);
	return { service, loader, logger };
}

beforeEach(() => {
	vi.clearAllMocks();
	// The routing resolves the runner through the DI container.
	Container.set(WorkflowRunner, mock<WorkflowRunner>());
});

describe('ToolGuardrailReviewService.route', () => {
	it('warns and routes nothing when the run has no review identity', async () => {
		const { service, logger } = makeService();

		await service.route(undefined, reviewGuardrail, toolCtx, {
			stage: 'before',
			value: {},
			matchDetails: {},
		});

		expect(logger.warn).toHaveBeenCalledWith(
			'A guardrail review did not route: the run has no review identity',
			expect.anything(),
		);
		expect(executeWorkflow).not.toHaveBeenCalled();
	});

	it('warns and routes nothing when human review is disabled', async () => {
		const { service, logger } = makeService({ humanReviewEnabled: false });

		await service.route(context, reviewGuardrail, toolCtx, {
			stage: 'before',
			value: {},
			matchDetails: {},
		});

		expect(logger.warn).toHaveBeenCalledWith(
			'A guardrail review did not route: human review is not enabled',
			expect.anything(),
		);
		expect(executeWorkflow).not.toHaveBeenCalled();
	});

	it('warns and routes nothing when the configuration is gone', async () => {
		const { service, logger } = makeService();

		await service.route({ ...context, configurations: [] }, reviewGuardrail, toolCtx, {
			stage: 'before',
			value: {},
			matchDetails: {},
		});

		expect(logger.warn).toHaveBeenCalledWith(
			'A guardrail review did not route: its configuration is unavailable',
			expect.anything(),
		);
		expect(executeWorkflow).not.toHaveBeenCalled();
	});

	it('skips a channel destination instead of sending a broken approval card', async () => {
		const { service, logger } = makeService();

		await service.route(
			{
				...context,
				configurations: [
					{
						id: 'config-1',
						name: 'Slack review',
						method: 'channel',
						channel: 'slack',
						credentialId: 'cred-1',
						recipient: { kind: 'channel', id: 'C1', name: '#security' },
					},
				],
			},
			reviewGuardrail,
			toolCtx,
			{ stage: 'before', value: {}, matchDetails: {} },
		);

		expect(logger.warn).toHaveBeenCalledWith(
			'A guardrail review did not route: channel review destinations are not supported yet',
			expect.anything(),
		);
		expect(executeWorkflow).not.toHaveBeenCalled();
	});

	it('warns when the review workflow has no decision trigger', async () => {
		const { service, loader, logger } = makeService();
		loader.loadWorkflow.mockResolvedValue({
			...workflowWithTrigger,
			nodes: [{ id: 't', name: 'Manual', type: 'n8n-nodes-base.manualTrigger', disabled: false }],
		} as never);

		await service.route(context, reviewGuardrail, toolCtx, {
			stage: 'before',
			value: {},
			matchDetails: {},
		});

		expect(logger.warn).toHaveBeenCalledWith(
			'A guardrail review did not route: the review workflow has no Request from agent trigger',
			expect.anything(),
		);
		expect(executeWorkflow).not.toHaveBeenCalled();
	});

	it('fires the review workflow with the flagged content and never waits', async () => {
		const { service, loader } = makeService();
		loader.loadWorkflow.mockResolvedValue(workflowWithTrigger as never);

		await service.route(context, reviewGuardrail, toolCtx, {
			stage: 'before',
			value: { note: 'a secret' },
			matchDetails: { matchedKeywords: ['secret'] },
		});

		expect(loader.loadWorkflow).toHaveBeenCalledWith(
			'project-1',
			{ workflowId: 'wf-9', workflowName: 'Security review' },
			{ usePublishedVersion: false },
		);
		expect(executeWorkflow).toHaveBeenCalledTimes(1);
		const [workflow, trigger, item, executionContext] = executeWorkflow.mock.calls[0];
		expect(workflow).toBe(workflowWithTrigger);
		expect(trigger.type).toBe('n8n-nodes-base.agentDecisionTrigger');
		expect(item).toMatchObject({
			requestId: 'run-1:tc-1:g1',
			agentId: 'agent-1',
			toolName: 'echo',
			toolInput: { note: 'a secret' },
			// The description carries match counts, never the matched values.
			description: expect.stringContaining('1 keyword match'),
		});
		expect(item.description).not.toContain('secret');
		expect(executionContext).toMatchObject({
			projectId: 'project-1',
			executionMode: 'manual',
		});
		// The routing fires the execution and returns: the review informs,
		// it never gates the tool call.
		expect(executeWorkflow.mock.calls[0][3]).toHaveProperty('workflowRunner');
	});

	it('resolves even when the routing itself throws', async () => {
		const { service, loader, logger } = makeService();
		loader.loadWorkflow.mockRejectedValue(new Error('loader blew up'));

		await expect(
			service.route(context, reviewGuardrail, toolCtx, {
				stage: 'before',
				value: {},
				matchDetails: {},
			}),
		).resolves.toBeUndefined();
		expect(logger.warn).toHaveBeenCalledWith('A guardrail review did not route', expect.anything());
	});
});
