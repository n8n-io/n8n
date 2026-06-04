import { UserError } from 'n8n-workflow';

import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiContext } from '../../../types';
import { parseAndValidate } from '../../../workflow-builder';
import type { WorkflowBuildOutcome } from '../../../workflow-loop/workflow-loop-state';
import { createBuildWorkflowTool } from '../build-workflow.tool';
import { resolveCredentials } from '../resolve-credentials';
import { stripStaleCredentialsFromWorkflow } from '../setup-workflow.service';
import { ensureWebhookIds } from '../submit-workflow.tool';

vi.mock('../../../workflow-builder', () => ({
	parseAndValidate: vi.fn(() => ({
		workflow: {
			name: 'Generated workflow',
			nodes: [{ name: 'Webhook', type: 'n8n-nodes-base.webhook', parameters: {} }],
			connections: {},
		},
		warnings: [],
	})),
	partitionWarnings: vi.fn((warnings: unknown[]) => ({ errors: [], informational: warnings })),
}));

vi.mock('../resolve-credentials', () => ({
	buildCredentialMap: vi.fn(async () => await Promise.resolve(new Map())),
	resolveCredentials: vi.fn(
		async () =>
			await Promise.resolve({
				mockedNodeNames: [],
				mockedCredentialTypes: [],
				mockedCredentialsByNode: {},
				verificationPinData: {},
				usesWorkflowPinDataForVerification: false,
			}),
	),
}));

vi.mock('../setup-workflow.service', () => ({
	stripStaleCredentialsFromWorkflow: vi.fn(async () => await Promise.resolve()),
}));

vi.mock('../submit-workflow.tool', () => ({
	ensureWebhookIds: vi.fn(async () => await Promise.resolve()),
}));

describe('createBuildWorkflowTool', () => {
	const mockedParseAndValidate = vi.mocked(parseAndValidate);
	const originalBuildViaPlanGuard = process.env.N8N_INSTANCE_AI_ENFORCE_BUILD_VIA_PLAN;
	const restoreBuildViaPlanGuard = () => {
		if (originalBuildViaPlanGuard === undefined) {
			delete process.env.N8N_INSTANCE_AI_ENFORCE_BUILD_VIA_PLAN;
		} else {
			process.env.N8N_INSTANCE_AI_ENFORCE_BUILD_VIA_PLAN = originalBuildViaPlanGuard;
		}
	};

	beforeEach(() => {
		vi.clearAllMocks();
		restoreBuildViaPlanGuard();
	});

	afterEach(() => {
		restoreBuildViaPlanGuard();
	});

	it('rejects new workflow builds outside a planned or post-plan follow-up', async () => {
		const context = {
			userId: 'user-1',
			runId: 'run-1',
			workflowService: {
				createFromWorkflowJSON: vi.fn(),
				clearAiTemporary: vi.fn(),
			},
			credentialService: {},
			nodeService: {},
			dataTableService: {},
			executionService: {},
			permissions: { createWorkflow: 'always_allow' },
			logger: { warn: vi.fn() },
		} as unknown as InstanceAiContext;

		const tool = createBuildWorkflowTool(context);
		const result = await executeTool(tool, { code: 'workflow code' });

		expect(result).toMatchObject({
			success: false,
			errors: [
				'New workflow builds must be planned first: call `plan` so the user can approve the build plan before saving.',
			],
		});
		expect(context.workflowService.createFromWorkflowJSON).not.toHaveBeenCalled();
	});

	it('aborts after repeated new workflow build plan-guard rejections', async () => {
		const warn = vi.fn();
		const context = {
			userId: 'user-1',
			runId: 'run-1',
			workflowService: {
				createFromWorkflowJSON: vi.fn(),
				clearAiTemporary: vi.fn(),
			},
			credentialService: {},
			nodeService: {},
			dataTableService: {},
			executionService: {},
			permissions: { createWorkflow: 'always_allow' },
			logger: { warn },
		} as unknown as InstanceAiContext;

		const tool = createBuildWorkflowTool(context);

		await expect(executeTool(tool, { code: 'workflow code' })).resolves.toMatchObject({
			success: false,
		});
		await expect(executeTool(tool, { code: 'workflow code' })).resolves.toMatchObject({
			success: false,
		});
		await expect(executeTool(tool, { code: 'workflow code' })).rejects.toBeInstanceOf(UserError);

		expect(context.workflowService.createFromWorkflowJSON).not.toHaveBeenCalled();
		expect(warn).toHaveBeenCalledWith(
			'build-workflow plan-guard rejection limit reached — aborting run',
			expect.objectContaining({ rejectionCount: 3 }),
		);
	});

	it('honors the build-via-plan guard escape hatch', async () => {
		process.env.N8N_INSTANCE_AI_ENFORCE_BUILD_VIA_PLAN = 'false';
		const context = {
			userId: 'user-1',
			runId: 'run-1',
			workflowService: {
				createFromWorkflowJSON: vi.fn(async () => await Promise.resolve({ id: 'wf-1' })),
				clearAiTemporary: vi.fn(async () => await Promise.resolve()),
			},
			credentialService: {},
			nodeService: {},
			dataTableService: {},
			executionService: {},
			permissions: { createWorkflow: 'always_allow' },
			logger: { warn: vi.fn() },
		} as unknown as InstanceAiContext;

		const tool = createBuildWorkflowTool(context);
		const result = await executeTool(tool, { code: 'workflow code' });

		expect(result).toMatchObject({
			success: true,
			workflowId: 'wf-1',
		});
		expect(context.workflowService.createFromWorkflowJSON).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'Generated workflow' }),
			{ markAsAiTemporary: true },
		);
		expect(context.workflowService.clearAiTemporary).toHaveBeenCalledWith('wf-1');
	});

	it('suspends existing workflow edits before saving by default', async () => {
		const context = {
			workflowService: {
				getAsWorkflowJSON: async () => await Promise.resolve({ name: 'Target workflow' }),
				updateFromWorkflowJSON: () => {
					throw new Error('should not update workflow');
				},
			},
			permissions: { updateWorkflow: 'require_approval' },
		} as unknown as InstanceAiContext;
		let suspension: unknown;
		const suspend = async (request: unknown) => {
			suspension = request;
			return await Promise.reject(new Error('suspended'));
		};

		await expect(
			executeTool(
				createBuildWorkflowTool(context),
				{ workflowId: 'wf-1', code: 'workflow code' },
				{ suspend },
			),
		).rejects.toThrow('suspended');

		expect(suspension).toEqual(
			expect.objectContaining({
				message: 'Edit Target workflow (ID: wf-1)?',
				severity: 'warning',
			}),
		);
	});

	it('allows new workflow builds during post-plan follow-up repairs', async () => {
		const reportBuildOutcome = vi.fn(
			async () => await Promise.resolve({ type: 'verify' as const, workflowId: 'wf-1' }),
		);
		const context = {
			userId: 'user-1',
			runId: 'run-1',
			workflowService: {
				createFromWorkflowJSON: vi.fn(async () => await Promise.resolve({ id: 'wf-1' })),
				clearAiTemporary: vi.fn(async () => await Promise.resolve()),
			},
			credentialService: {},
			nodeService: {},
			dataTableService: {},
			executionService: {},
			workflowBuildContext: {
				threadId: 'thread-1',
				runId: 'run-1',
				taskId: 'task-1',
				workItemId: 'wi-1',
				allowPostPlanWorkflowCreate: true,
				workflowTaskService: {
					reportBuildOutcome,
				},
			},
			permissions: { createWorkflow: 'always_allow' },
			logger: { warn: vi.fn() },
		} as unknown as InstanceAiContext;

		const tool = createBuildWorkflowTool(context);
		const result = await executeTool(tool, { code: 'workflow code' });

		expect(result).toMatchObject({
			success: true,
			workflowId: 'wf-1',
			workItemId: 'wi-1',
		});
		expect(context.workflowService.createFromWorkflowJSON).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'Generated workflow' }),
			{ markAsAiTemporary: true },
		);
		expect(context.workflowService.clearAiTemporary).toHaveBeenCalledWith('wf-1');
		expect(reportBuildOutcome).toHaveBeenCalledWith(
			expect.objectContaining<Partial<WorkflowBuildOutcome>>({
				workItemId: 'wi-1',
				workflowId: 'wf-1',
				submitted: true,
			}),
		);
	});

	it('updates existing workflows during post-plan follow-ups without redundant approval', async () => {
		const reportBuildOutcome = vi.fn(
			async () => await Promise.resolve({ type: 'verify' as const, workflowId: 'wf-1' }),
		);
		const suspend = vi.fn();
		const context = {
			userId: 'user-1',
			runId: 'run-1',
			workflowService: {
				updateFromWorkflowJSON: vi.fn(async () => await Promise.resolve({ id: 'wf-1' })),
				clearAiTemporary: vi.fn(async () => await Promise.resolve()),
			},
			credentialService: {},
			nodeService: {},
			dataTableService: {},
			executionService: {},
			workflowBuildContext: {
				threadId: 'thread-1',
				runId: 'run-1',
				taskId: 'task-1',
				workItemId: 'wi-1',
				allowPostPlanWorkflowCreate: true,
				workflowTaskService: {
					reportBuildOutcome,
				},
			},
			permissions: { updateWorkflow: 'ask' },
			logger: { warn: vi.fn() },
		} as unknown as InstanceAiContext;

		const tool = createBuildWorkflowTool(context);
		const result = await executeTool(
			tool,
			{ workflowId: 'wf-1', code: 'workflow code' },
			{ suspend },
		);

		expect(result).toMatchObject({
			success: true,
			workflowId: 'wf-1',
			workItemId: 'wi-1',
		});
		expect(suspend).not.toHaveBeenCalled();
		expect(context.workflowService.updateFromWorkflowJSON).toHaveBeenCalledWith(
			'wf-1',
			expect.objectContaining({ name: 'Generated workflow' }),
			undefined,
		);
		expect(reportBuildOutcome).toHaveBeenCalledWith(
			expect.objectContaining<Partial<WorkflowBuildOutcome>>({
				workItemId: 'wi-1',
				workflowId: 'wf-1',
				submitted: true,
			}),
		);
	});

	it('does not finalize the planned task when saving a supporting workflow', async () => {
		const reportBuildOutcome = vi.fn<
			(outcome: WorkflowBuildOutcome) => Promise<{ type: 'verify'; workflowId: string }>
		>(async () => await Promise.resolve({ type: 'verify', workflowId: 'wf-support' }));
		const markSucceeded = vi.fn(async () => await Promise.resolve(null));
		const onBuildOutcome = vi.fn();
		const context = {
			userId: 'user-1',
			runId: 'run-1',
			workflowService: {
				createFromWorkflowJSON: vi.fn(async () => await Promise.resolve({ id: 'wf-support' })),
				clearAiTemporary: vi.fn(async () => await Promise.resolve()),
			},
			credentialService: {},
			nodeService: {},
			dataTableService: {},
			executionService: {},
			workflowBuildContext: {
				threadId: 'thread-1',
				runId: 'run-1',
				taskId: 'task-1',
				workItemId: 'wi-main',
				plannedTaskService: {
					markSucceeded,
				},
				workflowTaskService: {
					reportBuildOutcome,
				},
				onBuildOutcome,
			},
			permissions: { createWorkflow: 'always_allow' },
			logger: { warn: vi.fn() },
		} as unknown as InstanceAiContext;

		const tool = createBuildWorkflowTool(context);
		const result = await executeTool(tool, {
			code: 'workflow code',
			isSupportingWorkflow: true,
		});
		const supportingWorkItemId = result.workItemId;

		expect(result).toMatchObject({
			success: true,
			workflowId: 'wf-support',
			isSupportingWorkflow: true,
		});
		expect(typeof supportingWorkItemId).toBe('string');
		expect(supportingWorkItemId).not.toBe('wi-main');
		expect(context.workflowService.clearAiTemporary).toHaveBeenCalledWith('wf-support');
		expect(onBuildOutcome).not.toHaveBeenCalled();
		expect(markSucceeded).not.toHaveBeenCalled();
		const reportedOutcome = reportBuildOutcome.mock.calls[0]?.[0];
		expect(reportedOutcome).toMatchObject({
			workItemId: supportingWorkItemId,
			workflowId: 'wf-support',
			submitted: true,
		});
		expect(reportedOutcome?.taskId).toEqual(expect.stringMatching(/^task-1:supporting-/));
	});

	it('reports a workflow-loop outcome when saving succeeds', async () => {
		const reportBuildOutcome = vi.fn(
			async () => await Promise.resolve({ type: 'verify' as const, workflowId: 'wf-1' }),
		);
		const markSucceeded = vi.fn<
			(
				threadId: string,
				taskId: string,
				update: { result?: string; outcome?: WorkflowBuildOutcome },
			) => Promise<null>
		>(async () => await Promise.resolve(null));
		const context = {
			userId: 'user-1',
			runId: 'run-1',
			workflowService: {
				createFromWorkflowJSON: vi.fn(async () => await Promise.resolve({ id: 'wf-1' })),
				clearAiTemporary: vi.fn(async () => await Promise.resolve()),
			},
			credentialService: {},
			nodeService: {},
			dataTableService: {},
			executionService: {},
			workflowBuildContext: {
				threadId: 'thread-1',
				runId: 'run-1',
				taskId: 'task-1',
				workItemId: 'wi-1',
				workflowTaskService: {
					reportBuildOutcome,
				},
				plannedTaskService: {
					markSucceeded,
				},
			},
			permissions: { createWorkflow: 'always_allow' },
			logger: { warn: vi.fn() },
		} as unknown as InstanceAiContext;

		const tool = createBuildWorkflowTool(context);
		const result = await executeTool(tool, { code: 'workflow code' });

		expect(context.workflowService.createFromWorkflowJSON).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'Generated workflow' }),
			{ markAsAiTemporary: true },
		);
		expect(resolveCredentials).toHaveBeenCalled();
		expect(stripStaleCredentialsFromWorkflow).toHaveBeenCalled();
		expect(ensureWebhookIds).toHaveBeenCalled();
		expect(context.workflowService.clearAiTemporary).toHaveBeenCalledWith('wf-1');
		expect(result).toMatchObject({
			success: true,
			workflowId: 'wf-1',
			workItemId: 'wi-1',
			verificationReadiness: { status: 'ready' },
			setupRequirement: { status: 'not_required' },
			triggerNodes: [{ nodeName: 'Webhook', nodeType: 'n8n-nodes-base.webhook' }],
		});
		expect(reportBuildOutcome).toHaveBeenCalledWith(
			expect.objectContaining<Partial<WorkflowBuildOutcome>>({
				workItemId: 'wi-1',
				runId: 'run-1',
				taskId: 'task-1',
				workflowId: 'wf-1',
				submitted: true,
				verificationReadiness: { status: 'ready' },
				setupRequirement: { status: 'not_required' },
			}),
		);
		expect(markSucceeded).toHaveBeenCalledWith('thread-1', 'task-1', expect.any(Object));
		const succeededUpdate = markSucceeded.mock.calls[0]?.[2];
		expect(succeededUpdate?.result).toBe('Created workflow "Generated workflow" (wf-1).');
		expect(succeededUpdate?.outcome).toMatchObject({ workItemId: 'wi-1', workflowId: 'wf-1' });
	});

	it('keeps the build successful when main workflow promotion fails', async () => {
		const warn = vi.fn();
		const context = {
			userId: 'user-1',
			runId: 'run-1',
			workflowService: {
				createFromWorkflowJSON: vi.fn(async () => await Promise.resolve({ id: 'wf-1' })),
				clearAiTemporary: vi.fn(async () => {
					await Promise.resolve();
					throw new Error('temporary marker cleanup failed');
				}),
			},
			credentialService: {},
			nodeService: {},
			dataTableService: {},
			executionService: {},
			workflowBuildContext: {
				threadId: 'thread-1',
				runId: 'run-1',
				taskId: 'task-1',
				workItemId: 'wi-1',
				workflowTaskService: {
					reportBuildOutcome: vi.fn(
						async () => await Promise.resolve({ type: 'verify' as const, workflowId: 'wf-1' }),
					),
				},
				plannedTaskService: {
					markSucceeded: vi.fn(async () => await Promise.resolve(null)),
				},
			},
			permissions: { createWorkflow: 'always_allow' },
			logger: { warn },
		} as unknown as InstanceAiContext;

		const tool = createBuildWorkflowTool(context);
		const result = await executeTool(tool, { code: 'workflow code' });

		expect(result).toMatchObject({ success: true, workflowId: 'wf-1' });
		expect(context.workflowService.clearAiTemporary).toHaveBeenCalledWith('wf-1');
		expect(warn).toHaveBeenCalledWith(
			'Failed to clear AI-builder temporary marker on main workflow wf-1: temporary marker cleanup failed',
		);
	});
});
