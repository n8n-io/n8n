import type { Mock } from 'vitest';

import { executeTool } from '../../../__tests__/tool-test-utils';
import { createToolRegistry } from '../../../tool-registry';
import type {
	InstanceAiDataTableService,
	InstanceAiWorkflowService,
	OrchestrationContext,
	WorkflowTaskService,
} from '../../../types';
import { createRemediation, MAX_VERIFY_ATTEMPTS } from '../../../workflow-loop/remediation';
import type { WorkflowBuildOutcome } from '../../../workflow-loop/workflow-loop-state';
import { createVerifyBuiltWorkflowTool } from '../verify-built-workflow.tool';

type VerifyBuiltWorkflowOutput = {
	success: boolean;
	resolvedWorkItemId?: string;
	error?: string;
	executionId?: string;
	status?: string;
	nodesExecuted?: string[];
	nodePreviews?: Array<{
		nodeName: string;
		itemCount?: number;
		preview: string;
		truncated: boolean;
		chars: number;
		simulated?: boolean;
	}>;
	simulatedNodes?: Array<{ nodeName: string; reason: string }>;
	simulationNote?: string;
	lastNodeExecuted?: string;
	nodesNotReached?: string[];
	nodeErrors?: Array<{ nodeName: string; message?: string }>;
	coverageNote?: string;
	data?: Record<string, unknown>;
	remediation?: { category: string; shouldEdit: boolean; reason?: string };
};

function createContext(overrides: Partial<OrchestrationContext> = {}): OrchestrationContext {
	const defaultBuildOutcome = {
		workItemId: 'wi_1',
		taskId: 'task_1',
		workflowId: 'wf_1',
		submitted: true,
		triggerType: 'manual_or_testable',
		nodeSimulationPlan: [],
		needsUserInput: false,
		summary: 'Built',
	};
	const workflowTaskService = {
		reportBuildOutcome: vi.fn(),
		reportVerificationVerdict: vi.fn(),
		getBuildOutcome: vi.fn().mockResolvedValue(defaultBuildOutcome),
		getLatestBuildOutcomeForWorkflow: vi.fn().mockResolvedValue(defaultBuildOutcome),
		getWorkflowLoopState: vi.fn(),
		updateBuildOutcome: vi.fn(),
	};

	return {
		threadId: 'thread_1',
		runId: 'run_1',
		userId: 'user_1',
		orchestratorAgentId: 'agent_1',
		modelId: 'test-model',
		eventBus: {} as OrchestrationContext['eventBus'],
		logger: {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
		} as unknown as OrchestrationContext['logger'],
		domainTools: createToolRegistry(),
		abortSignal: new AbortController().signal,
		taskStorage: {} as OrchestrationContext['taskStorage'],
		workflowTaskService,
		domainContext: {
			userId: 'user_1',
			workflowService: {
				getAsWorkflowJSON: vi.fn().mockResolvedValue({ nodes: [] }),
			} as unknown as InstanceAiWorkflowService,
			executionService: {
				run: vi.fn().mockResolvedValue({
					executionId: 'exec_1',
					status: 'success',
				}),
			},
			credentialService: {} as never,
			nodeService: {} as never,
			dataTableService: {
				queryRows: vi.fn().mockResolvedValue({ count: 0, data: [] }),
				deleteRows: vi.fn().mockResolvedValue({ deletedCount: 0 }),
			} as unknown as InstanceAiDataTableService,
		},
		...overrides,
	} as OrchestrationContext;
}

describe('verify-built-workflow tool — remediation guard', () => {
	it('routes mocked-credential verification failures to setup and records terminal verdict', async () => {
		const context = createContext();
		vi.mocked(context.workflowTaskService!.getBuildOutcome).mockResolvedValue({
			workItemId: 'wi_1',
			taskId: 'task_1',
			workflowId: 'wf_1',
			submitted: true,
			triggerType: 'manual_or_testable',
			nodeSimulationPlan: [],
			needsUserInput: false,
			mockedCredentialTypes: ['gmailOAuth2'],
			mockedNodeNames: ['Gmail'],
			summary: 'Built',
		});
		vi.mocked(context.domainContext!.executionService.run).mockResolvedValue({
			executionId: 'exec_1',
			status: 'error',
			error: 'Gmail credentials are mocked',
		});
		const tool = createVerifyBuiltWorkflowTool(context);

		const result = await executeTool(tool, { workItemId: 'wi_1', workflowId: 'wf_1' });

		expect(result.remediation).toMatchObject({
			category: 'needs_setup',
			shouldEdit: false,
			reason: 'mocked_credentials_or_placeholders',
		});
		expect(context.workflowTaskService!.reportVerificationVerdict).toHaveBeenCalledWith(
			expect.objectContaining({
				verdict: 'needs_user_input',
			}),
		);
		const reported = vi.mocked(context.workflowTaskService!.reportVerificationVerdict).mock
			.calls[0]?.[0] as { remediation?: { category?: string } };
		expect(reported.remediation).toMatchObject({ category: 'needs_setup' });
	});

	it('does not treat mocked credentials as setup when the execution error is code-fixable', async () => {
		const context = createContext();
		vi.mocked(context.workflowTaskService!.getBuildOutcome).mockResolvedValue({
			workItemId: 'wi_1',
			taskId: 'task_1',
			workflowId: 'wf_1',
			submitted: true,
			triggerType: 'manual_or_testable',
			nodeSimulationPlan: [],
			needsUserInput: false,
			mockedCredentialTypes: ['slackApi'],
			mockedNodeNames: ['Slack'],
			summary: 'Built',
		});
		vi.mocked(context.domainContext!.executionService.run).mockResolvedValue({
			executionId: 'exec_1',
			status: 'error',
			error: 'Code node failed: Cannot read properties of undefined',
		});
		const tool = createVerifyBuiltWorkflowTool(context);

		const result = await executeTool(tool, { workItemId: 'wi_1', workflowId: 'wf_1' });

		expect(result.remediation).toMatchObject({
			category: 'code_fixable',
			shouldEdit: true,
			reason: 'runtime_failure',
		});
		expect(context.workflowTaskService!.reportVerificationVerdict).not.toHaveBeenCalled();
	});

	it('does not treat unresolved placeholders as setup when the execution error is code-fixable', async () => {
		const context = createContext();
		vi.mocked(context.workflowTaskService!.getBuildOutcome).mockResolvedValue({
			workItemId: 'wi_1',
			taskId: 'task_1',
			workflowId: 'wf_1',
			submitted: true,
			triggerType: 'manual_or_testable',
			nodeSimulationPlan: [],
			needsUserInput: false,
			hasUnresolvedPlaceholders: true,
			summary: 'Built',
		});
		vi.mocked(context.domainContext!.executionService.run).mockResolvedValue({
			executionId: 'exec_1',
			status: 'error',
			error: 'Code node failed: Cannot read properties of undefined',
		});
		const tool = createVerifyBuiltWorkflowTool(context);

		const result = await executeTool(tool, { workItemId: 'wi_1', workflowId: 'wf_1' });

		expect(result.remediation).toMatchObject({
			category: 'code_fixable',
			shouldEdit: true,
			reason: 'runtime_failure',
		});
		expect(context.workflowTaskService!.reportVerificationVerdict).not.toHaveBeenCalled();
	});

	it('routes execution errors from reached placeholder values to setup', async () => {
		const context = createContext();
		vi.mocked(context.workflowTaskService!.getBuildOutcome).mockResolvedValue({
			workItemId: 'wi_1',
			taskId: 'task_1',
			workflowId: 'wf_1',
			submitted: true,
			triggerType: 'manual_or_testable',
			nodeSimulationPlan: [],
			needsUserInput: false,
			hasUnresolvedPlaceholders: true,
			summary: 'Built',
		});
		vi.mocked(context.domainContext!.executionService.run).mockResolvedValue({
			executionId: 'exec_1',
			status: 'error',
			error: 'Invalid value <__PLACEHOLDER_VALUE__Your email address__>',
		});
		const tool = createVerifyBuiltWorkflowTool(context);

		const result = await executeTool(tool, { workItemId: 'wi_1', workflowId: 'wf_1' });

		expect(result.remediation).toMatchObject({
			category: 'needs_setup',
			shouldEdit: false,
			reason: 'mocked_credentials_or_placeholders',
		});
		expect(context.workflowTaskService!.reportVerificationVerdict).toHaveBeenCalledWith(
			expect.objectContaining({
				verdict: 'needs_user_input',
			}),
		);
	});

	it('returns terminal remediation even when verdict persistence and telemetry fail', async () => {
		const trackTelemetry = vi.fn(() => {
			throw new Error('telemetry unavailable');
		});
		const context = createContext({ trackTelemetry });
		vi.mocked(context.workflowTaskService!.reportVerificationVerdict).mockRejectedValue(
			new Error('storage unavailable'),
		);
		vi.mocked(context.workflowTaskService!.getBuildOutcome).mockResolvedValue({
			workItemId: 'wi_1',
			taskId: 'task_1',
			workflowId: 'wf_1',
			submitted: true,
			triggerType: 'manual_or_testable',
			nodeSimulationPlan: [],
			needsUserInput: false,
			mockedCredentialTypes: ['gmailOAuth2'],
			mockedNodeNames: ['Gmail'],
			summary: 'Built',
		});
		vi.mocked(context.domainContext!.executionService.run).mockResolvedValue({
			executionId: 'exec_1',
			status: 'error',
			error: 'Gmail credentials are mocked',
		});
		const tool = createVerifyBuiltWorkflowTool(context);

		const result = await executeTool(tool, { workItemId: 'wi_1', workflowId: 'wf_1' });

		expect(result.success).toBe(false);
		expect(result.remediation).toMatchObject({
			category: 'needs_setup',
			shouldEdit: false,
			reason: 'mocked_credentials_or_placeholders',
		});
		expect(context.workflowTaskService!.reportVerificationVerdict).toHaveBeenCalled();
		expect(trackTelemetry).toHaveBeenCalled();
		expect(context.logger.warn).toHaveBeenCalledWith(
			'verify-built-workflow: failed to persist terminal verdict',
			expect.objectContaining({ error: 'storage unavailable' }),
		);
		expect(context.logger.warn).toHaveBeenCalledWith(
			'verify-built-workflow: failed to emit remediation telemetry',
			expect.objectContaining({ error: 'telemetry unavailable' }),
		);
	});

	it('does not execute or report another verdict when the persisted guard is terminal', async () => {
		const context = createContext();
		vi.mocked(context.workflowTaskService!.getWorkflowLoopState).mockResolvedValue({
			workItemId: 'wi_1',
			threadId: 'thread_1',
			runId: 'run_1',
			workflowId: 'wf_1',
			phase: 'blocked',
			status: 'blocked',
			source: 'create',
			rebuildAttempts: 0,
			lastRemediation: createRemediation({
				category: 'blocked',
				shouldEdit: false,
				reason: 'post_submit_budget_exhausted',
				guidance: 'Stop editing.',
			}),
		});
		const tool = createVerifyBuiltWorkflowTool(context);

		const result = await executeTool(tool, { workItemId: 'wi_1', workflowId: 'wf_1' });
		const repeatedResult = await executeTool(tool, { workItemId: 'wi_1', workflowId: 'wf_1' });

		expect(result.success).toBe(false);
		expect(result.remediation).toMatchObject({ reason: 'post_submit_budget_exhausted' });
		expect(repeatedResult.success).toBe(false);
		expect(repeatedResult.remediation).toMatchObject({
			reason: 'post_submit_budget_exhausted',
		});
		expect(context.domainContext!.executionService.run).not.toHaveBeenCalled();
		expect(context.workflowTaskService!.reportVerificationVerdict).not.toHaveBeenCalled();
	});

	it('ignores terminal remediation from a previous run', async () => {
		const context = createContext();
		vi.mocked(context.workflowTaskService!.getWorkflowLoopState).mockResolvedValue({
			workItemId: 'wi_1',
			threadId: 'thread_1',
			runId: 'run_previous',
			workflowId: 'wf_1',
			phase: 'blocked',
			status: 'blocked',
			source: 'create',
			rebuildAttempts: 0,
			lastRemediation: createRemediation({
				category: 'needs_setup',
				shouldEdit: false,
				reason: 'mocked_credentials_or_placeholders',
				guidance: 'Route to setup.',
			}),
		});
		const tool = createVerifyBuiltWorkflowTool(context);

		const result = await executeTool(tool, { workItemId: 'wi_1', workflowId: 'wf_1' });

		expect(result.success).toBe(true);
		expect(context.domainContext!.executionService.run).toHaveBeenCalled();
	});

	it('still verifies the second allowed post-submit repair before blocking further edits', async () => {
		const context = createContext();
		vi.mocked(context.workflowTaskService!.getWorkflowLoopState).mockResolvedValue({
			workItemId: 'wi_1',
			threadId: 'thread_1',
			runId: 'run_1',
			workflowId: 'wf_1',
			phase: 'verifying',
			status: 'active',
			source: 'create',
			rebuildAttempts: 2,
			successfulSubmitSeen: true,
			postSubmitRemediationSubmitsUsed: 2,
			lastRemediation: createRemediation({
				category: 'code_fixable',
				shouldEdit: true,
				reason: 'runtime_failure',
				guidance: 'Verify the latest repair.',
			}),
		});
		const tool = createVerifyBuiltWorkflowTool(context);

		const result = await executeTool(tool, { workItemId: 'wi_1', workflowId: 'wf_1' });

		expect(result.success).toBe(true);
		expect(context.domainContext!.executionService.run).toHaveBeenCalled();
		expect(context.workflowTaskService!.reportVerificationVerdict).not.toHaveBeenCalled();
	});

	it('blocks a failing verification after the second post-submit repair was already submitted', async () => {
		const context = createContext();
		vi.mocked(context.workflowTaskService!.getWorkflowLoopState).mockResolvedValue({
			workItemId: 'wi_1',
			threadId: 'thread_1',
			runId: 'run_1',
			workflowId: 'wf_1',
			phase: 'verifying',
			status: 'active',
			source: 'create',
			rebuildAttempts: 2,
			successfulSubmitSeen: true,
			postSubmitRemediationSubmitsUsed: 2,
			lastRemediation: createRemediation({
				category: 'code_fixable',
				shouldEdit: true,
				reason: 'runtime_failure',
				guidance: 'Verify the latest repair.',
			}),
		});
		vi.mocked(context.domainContext!.executionService.run).mockResolvedValue({
			executionId: 'exec_1',
			status: 'error',
			error: 'Code node still fails',
		});
		const tool = createVerifyBuiltWorkflowTool(context);

		const result = await executeTool(tool, { workItemId: 'wi_1', workflowId: 'wf_1' });

		expect(result.success).toBe(false);
		expect(result.remediation).toMatchObject({
			category: 'blocked',
			shouldEdit: false,
			reason: 'post_submit_budget_exhausted',
			remainingSubmitFixes: 0,
		});
		expect(context.domainContext!.executionService.run).toHaveBeenCalled();
		expect(context.workflowTaskService!.reportVerificationVerdict).toHaveBeenCalledWith(
			expect.objectContaining({
				verdict: 'failed_terminal',
				failureSignature: 'post_submit_budget_exhausted',
			}),
		);
	});

	it('returns editable remediation for generic runtime failures without terminal reporting', async () => {
		const context = createContext();
		vi.mocked(context.domainContext!.executionService.run).mockResolvedValue({
			executionId: 'exec_1',
			status: 'error',
			error: 'Node parameter value is invalid',
		});
		const tool = createVerifyBuiltWorkflowTool(context);

		const result = await executeTool(tool, { workItemId: 'wi_1', workflowId: 'wf_1' });

		expect(result.remediation).toMatchObject({
			category: 'code_fixable',
			shouldEdit: true,
		});
		expect(context.workflowTaskService!.reportVerificationVerdict).not.toHaveBeenCalled();
	});
});

type ExecutionRunResult = {
	executionId?: string | null;
	status: 'success' | 'error' | 'waiting' | 'running' | 'unknown';
	data?: Record<string, unknown>;
	executedNodeNames?: string[];
	lastNodeExecuted?: string;
	nodeErrors?: Array<{ nodeName: string; message?: string }>;
	error?: string;
};

interface VerifyToolContext {
	workflowTaskService: WorkflowTaskService;
	domainContext: {
		executionService: {
			run: Mock<
				(
					...args: [
						string,
						Record<string, unknown> | undefined,
						{ timeout?: number; verificationPinData?: unknown },
					]
				) => Promise<ExecutionRunResult>
			>;
		};
		workflowService?: InstanceAiWorkflowService;
		dataTableService?: InstanceAiDataTableService;
		credentialService?: { list: Mock };
	};
	logger: { debug: Mock; info: Mock; warn: Mock; error: Mock };
}

function makeBuildOutcome(overrides: Partial<WorkflowBuildOutcome> = {}): WorkflowBuildOutcome {
	return {
		workItemId: 'wi-1',
		taskId: 'task-1',
		workflowId: 'wf-1',
		submitted: true,
		triggerType: 'manual_or_testable',
		nodeSimulationPlan: [],
		needsUserInput: false,
		summary: 'built ok',
		...overrides,
	};
}

function wrapExecutionOutput(value: unknown): string {
	return `<untrusted_data source="execution-output" label="node:test">\n${JSON.stringify(value, null, 2)}\n</untrusted_data>`;
}

function makeContext(
	outcome: WorkflowBuildOutcome | undefined,
	runResult: ExecutionRunResult,
	overrides: {
		workflowNodes?: Array<{
			name?: string;
			type: string;
			parameters?: Record<string, unknown>;
			credentials?: Record<string, unknown>;
		}>;
		workflowConnections?: Record<string, unknown>;
		tableRows?: Record<string, Array<Record<string, unknown>>>;
		availableCredentials?: Array<{ id: string; name: string; type: string }>;
	} = {},
) {
	const updateBuildOutcome = vi.fn(
		async (_workItemId: string, _update: Partial<WorkflowBuildOutcome>) => {
			await Promise.resolve();
		},
	);
	const run = vi.fn(
		async (
			_workflowId: string,
			_inputData: Record<string, unknown> | undefined,
			_options: { timeout?: number; verificationPinData?: unknown },
		): Promise<ExecutionRunResult> => {
			await Promise.resolve();
			return runResult;
		},
	);

	type QueryRowsResult = { count: number; data: Array<Record<string, unknown>> };
	const queryRows = vi.fn(
		async (
			dataTableId: string,
			opts?: { limit?: number; offset?: number },
		): Promise<QueryRowsResult> => {
			const rows = overrides.tableRows?.[dataTableId] ?? [];
			const limit = opts?.limit ?? Number.MAX_SAFE_INTEGER;
			const offset = opts?.offset ?? 0;
			await Promise.resolve();
			return { count: rows.length, data: rows.slice(offset, offset + limit) };
		},
	);
	type DeleteRowsFilter = {
		type: 'and' | 'or';
		filters: Array<{
			columnName: string;
			condition: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like';
			value: string | number | boolean | null;
		}>;
	};
	const deleteRows = vi.fn(async (_dataTableId: string, _filter: DeleteRowsFilter) => {
		await Promise.resolve();
		return { deletedCount: 0, dataTableId: '', tableName: '', projectId: '' };
	});

	const workflowService = {
		getAsWorkflowJSON: vi.fn(async () => {
			await Promise.resolve();
			return {
				nodes: overrides.workflowNodes ?? [],
				connections: overrides.workflowConnections ?? {},
			};
		}),
	} as unknown as InstanceAiWorkflowService;

	const credentialService = {
		list: vi.fn(async () => {
			await Promise.resolve();
			return overrides.availableCredentials ?? [];
		}),
	};

	const dataTableService = {
		queryRows,
		deleteRows,
	} as unknown as InstanceAiDataTableService;

	const logger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	};

	const ctx: VerifyToolContext = {
		workflowTaskService: {
			reportBuildOutcome: vi.fn(),
			reportVerificationVerdict: vi.fn(),
			getBuildOutcome: vi.fn(async () => {
				await Promise.resolve();
				return outcome;
			}),
			getLatestBuildOutcomeForWorkflow: vi.fn(async () => {
				await Promise.resolve();
				return outcome;
			}),
			getWorkflowLoopState: vi.fn(),
			updateBuildOutcome,
		} as unknown as WorkflowTaskService,
		domainContext: {
			executionService: { run },
			workflowService,
			dataTableService,
			credentialService,
		},
		logger,
	};
	return { ctx, updateBuildOutcome, queryRows, deleteRows };
}

async function runTool(
	ctx: VerifyToolContext,
	input: {
		workItemId?: string;
		workflowId: string;
		inputData?: Record<string, unknown>;
		includeData?: boolean;
		maxDataChars?: number;
		fixtureOverrides?: Record<string, Array<Record<string, unknown>>>;
	},
) {
	const tool = createVerifyBuiltWorkflowTool(ctx as unknown as OrchestrationContext);
	return await executeTool<VerifyBuiltWorkflowOutput>(tool, input);
}

describe('verify-built-workflow tool', () => {
	it('persists a success verification record onto the build outcome', async () => {
		const { ctx, updateBuildOutcome } = makeContext(makeBuildOutcome(), {
			executionId: 'exec-1',
			status: 'success',
			data: { 'Form Trigger': {}, 'Insert Row': {} },
		});

		const result = await runTool(ctx, {
			workItemId: 'wi-1',
			workflowId: 'wf-1',
			inputData: { name: 'Alice' },
		});

		expect(result.success).toBe(true);
		expect(updateBuildOutcome).toHaveBeenCalledTimes(1);
		const call = updateBuildOutcome.mock.calls[0];
		expect(call).toBeDefined();
		const update = call[1];
		expect(update.verification).toMatchObject({
			attempted: true,
			success: true,
			executionId: 'exec-1',
			status: 'success',
		});
		expect(update.verification?.evidence?.nodesExecuted).toEqual(['Form Trigger', 'Insert Row']);
		expect(typeof update.verification?.verifiedAt).toBe('string');
	});

	it('increments the verify attempt count on the build outcome each run', async () => {
		const { ctx, updateBuildOutcome } = makeContext(makeBuildOutcome({ verifyAttempts: 2 }), {
			executionId: 'exec-count',
			status: 'success',
			data: { 'Manual Trigger': [{ ok: true }] },
		});

		await runTool(ctx, { workItemId: 'wi-1', workflowId: 'wf-1' });

		expect(updateBuildOutcome.mock.calls[0][1].verifyAttempts).toBe(3);
	});

	it('blocks verification once the verify attempt budget is exhausted', async () => {
		const { ctx, updateBuildOutcome } = makeContext(
			makeBuildOutcome({ verifyAttempts: MAX_VERIFY_ATTEMPTS }),
			{ executionId: 'exec-exhausted', status: 'success', data: {} },
		);

		const result = await runTool(ctx, { workItemId: 'wi-1', workflowId: 'wf-1' });

		expect(result.success).toBe(false);
		expect(result.remediation).toMatchObject({
			category: 'blocked',
			shouldEdit: false,
			reason: 'verify_budget_exhausted',
		});
		expect(result.error).toContain('executions(action="run")');
		expect(ctx.domainContext.executionService.run).not.toHaveBeenCalled();
		expect(updateBuildOutcome).not.toHaveBeenCalled();
	});

	it('returns compact verification evidence by default without full execution data', async () => {
		const largeRows = [{ json: { id: 1, body: 'x'.repeat(2000) } }];
		const { ctx } = makeContext(makeBuildOutcome(), {
			executionId: 'exec-compact',
			status: 'success',
			data: {
				'Webhook Trigger': [{ json: { body: { event: 'signup' } } }],
				'Create Lead': largeRows,
			},
		});

		const result = await runTool(ctx, {
			workItemId: 'wi-1',
			workflowId: 'wf-1',
			maxDataChars: 40,
		});

		expect(result.success).toBe(true);
		expect(result.executionId).toBe('exec-compact');
		expect(result.nodesExecuted).toEqual(['Webhook Trigger', 'Create Lead']);
		expect(result.data).toBeUndefined();
		expect(result.nodePreviews).toEqual([
			expect.objectContaining({
				nodeName: 'Webhook Trigger',
				itemCount: 1,
			}),
			expect.objectContaining({
				nodeName: 'Create Lead',
				itemCount: 1,
				truncated: true,
			}),
		]);
		expect(result.nodePreviews?.[1].preview.length).toBeLessThanOrEqual(43);
	});

	it('returns full execution data when includeData is true', async () => {
		const data = {
			'Manual Trigger': [{ json: { ok: true } }],
			'Set Fields': [{ json: { name: 'Alice' } }],
		};
		const { ctx } = makeContext(makeBuildOutcome(), {
			executionId: 'exec-full',
			status: 'success',
			data,
		});

		const result = await runTool(ctx, {
			workItemId: 'wi-1',
			workflowId: 'wf-1',
			includeData: true,
		});

		expect(result.success).toBe(true);
		expect(result.data).toStrictEqual(data);
		expect(result.nodesExecuted).toEqual(['Manual Trigger', 'Set Fields']);
		expect(result.nodePreviews).toHaveLength(2);
	});

	it('persists a failure verification record with failureSignature', async () => {
		const { ctx, updateBuildOutcome } = makeContext(makeBuildOutcome(), {
			executionId: 'exec-2',
			status: 'error',
			error: 'Node "Insert Row" crashed',
		});

		const result = await runTool(ctx, { workItemId: 'wi-1', workflowId: 'wf-1' });

		expect(result.success).toBe(false);
		expect(updateBuildOutcome).toHaveBeenCalledTimes(1);
		const call = updateBuildOutcome.mock.calls[0];
		expect(call).toBeDefined();
		const update = call[1];
		expect(update.verification).toMatchObject({
			attempted: true,
			success: false,
			status: 'error',
			failureSignature: 'Node "Insert Row" crashed',
			evidence: { errorMessage: 'Node "Insert Row" crashed' },
		});
	});

	it('returns an error result when no build outcome exists', async () => {
		const { ctx, updateBuildOutcome } = makeContext(undefined, {
			status: 'success',
		});

		const result = await runTool(ctx, { workItemId: 'wi-missing', workflowId: 'wf-1' });

		expect(result.success).toBe(false);
		expect(result.error).toMatch(/No build outcome found/);
		expect(updateBuildOutcome).not.toHaveBeenCalled();
	});

	it('resolves the latest build outcome by workflow ID when work item ID is omitted', async () => {
		const { ctx, updateBuildOutcome } = makeContext(
			makeBuildOutcome({ workItemId: 'wi-latest', workflowId: 'wf-1' }),
			{
				executionId: 'exec-latest',
				status: 'success',
				data: { 'Manual Trigger': [{ ok: true }] },
			},
		);

		const result = await runTool(ctx, { workflowId: 'wf-1' });

		expect(result.success).toBe(true);
		expect(result.resolvedWorkItemId).toBe('wi-latest');
		expect(ctx.workflowTaskService.getBuildOutcome).not.toHaveBeenCalled();
		expect(ctx.workflowTaskService.getLatestBuildOutcomeForWorkflow).toHaveBeenCalledWith('wf-1');
		expect(updateBuildOutcome.mock.calls[0][0]).toBe('wi-latest');
	});

	it('falls back to the workflow build outcome when the supplied work item ID is stale', async () => {
		const { ctx, updateBuildOutcome } = makeContext(
			makeBuildOutcome({ workItemId: 'wi-latest', workflowId: 'wf-1' }),
			{
				executionId: 'exec-fallback',
				status: 'success',
				data: { 'Manual Trigger': [{ ok: true }] },
			},
		);
		vi.mocked(ctx.workflowTaskService.getBuildOutcome).mockResolvedValueOnce(undefined);

		const result = await runTool(ctx, { workItemId: 'wi-guessed', workflowId: 'wf-1' });

		expect(result.success).toBe(true);
		expect(result.resolvedWorkItemId).toBe('wi-latest');
		expect(ctx.workflowTaskService.getLatestBuildOutcomeForWorkflow).toHaveBeenCalledWith('wf-1');
		expect(updateBuildOutcome.mock.calls[0][0]).toBe('wi-latest');
	});

	it('rejects verification when the requested workflow does not match the build outcome', async () => {
		const { ctx, updateBuildOutcome } = makeContext(makeBuildOutcome({ workflowId: 'wf-2' }), {
			executionId: 'exec-mismatch',
			status: 'success',
			data: { 'Manual Trigger': [{ json: { ok: true } }] },
		});

		const result = await runTool(ctx, { workItemId: 'wi-1', workflowId: 'wf-1' });

		expect(result.success).toBe(false);
		expect(result.error).toContain('belongs to workflow wf-2');
		expect(ctx.domainContext.executionService.run).not.toHaveBeenCalled();
		expect(updateBuildOutcome).not.toHaveBeenCalled();
	});

	it('rejects verification when the build outcome has no workflow ID', async () => {
		const { ctx, updateBuildOutcome } = makeContext(makeBuildOutcome({ workflowId: undefined }), {
			executionId: 'exec-missing-workflow',
			status: 'success',
			data: { 'Manual Trigger': [{ json: { ok: true } }] },
		});

		const result = await runTool(ctx, { workItemId: 'wi-1', workflowId: 'wf-1' });

		expect(result.success).toBe(false);
		expect(result.error).toContain('does not include a workflow ID');
		expect(ctx.domainContext.executionService.run).not.toHaveBeenCalled();
		expect(updateBuildOutcome).not.toHaveBeenCalled();
	});

	it('swallows storage errors when persisting verification', async () => {
		const { ctx, updateBuildOutcome } = makeContext(makeBuildOutcome(), {
			executionId: 'exec-3',
			status: 'success',
		});
		updateBuildOutcome.mockRejectedValueOnce(new Error('storage unavailable'));

		const result = await runTool(ctx, { workItemId: 'wi-1', workflowId: 'wf-1' });

		expect(result.success).toBe(true);
		expect(result.executionId).toBe('exec-3');
	});

	it('counts wrapped execution output items in previews and persisted evidence', async () => {
		const { ctx, updateBuildOutcome } = makeContext(makeBuildOutcome(), {
			executionId: 'exec-wrapped',
			status: 'success',
			data: {
				'Set Rows': wrapExecutionOutput([{ id: 1 }, { id: 2 }]),
				'Large Export': wrapExecutionOutput({
					totalItems: 5,
					truncated: true,
					items: [{ id: 3 }],
				}),
				'Large Transform': wrapExecutionOutput({
					_itemCount: 7,
					_truncated: true,
					_firstItemPreview: { id: 4 },
				}),
			},
		});

		const result = await runTool(ctx, { workItemId: 'wi-1', workflowId: 'wf-1' });

		expect(result.success).toBe(true);
		expect(result.nodePreviews).toEqual([
			expect.objectContaining({ nodeName: 'Set Rows', itemCount: 2 }),
			expect.objectContaining({ nodeName: 'Large Export', itemCount: 5 }),
			expect.objectContaining({ nodeName: 'Large Transform', itemCount: 7 }),
		]);
		expect(updateBuildOutcome.mock.calls[0][1].verification?.evidence?.producedOutputRows).toBe(14);
	});

	it('treats a waiting status with output as a successful run (e.g. Form Trigger response page)', async () => {
		const { ctx, updateBuildOutcome } = makeContext(makeBuildOutcome(), {
			executionId: 'exec-form-1',
			status: 'waiting',
			data: {
				'Lead Form': {},
				'Insert Lead': {},
				'Confirmation Page': {},
			},
		});

		const result = await runTool(ctx, {
			workItemId: 'wi-1',
			workflowId: 'wf-1',
			inputData: { name: 'Alice', email: 'a@b.c' },
		});

		expect(result.success).toBe(true);
		expect(result.status).toBe('waiting');
		expect(updateBuildOutcome).toHaveBeenCalledTimes(1);
		const update = updateBuildOutcome.mock.calls[0][1];
		expect(update.verification).toMatchObject({
			attempted: true,
			success: true,
			status: 'waiting',
		});
	});

	it('treats a waiting status with no output as failure', async () => {
		const { ctx } = makeContext(makeBuildOutcome(), {
			executionId: 'exec-form-2',
			status: 'waiting',
			data: {},
		});

		const result = await runTool(ctx, { workItemId: 'wi-1', workflowId: 'wf-1' });

		expect(result.success).toBe(false);
	});

	it('treats waiting as a failure when the build has a simulation plan (unsimulated user-action node)', async () => {
		// With a plan, every legitimate pause should have been pinned — a
		// `waiting` result means a user-action node slipped past classification
		// and everything downstream went unverified.
		const { ctx } = makeContext(
			makeBuildOutcome({
				nodeSimulationPlan: [
					{
						nodeName: 'Send Slack',
						verdict: 'simulate',
						reason: 'Sends a message',
						confidence: 'high',
						source: 'deterministic',
					},
				],
			}),
			{
				executionId: 'exec-waiting-plan',
				status: 'waiting',
				data: { 'Community Pause': [{ ok: true }] },
			},
		);

		const result = await runTool(ctx, { workItemId: 'wi-1', workflowId: 'wf-1' });

		expect(result.success).toBe(false);
		expect(result.remediation).toMatchObject({
			category: 'needs_setup',
			shouldEdit: false,
			reason: 'unsimulated_user_action_node',
		});
	});

	it('never reads or deletes data-table rows, even when the workflow contains insert nodes', async () => {
		// Destructive nodes are simulated via the node simulation plan; the verify
		// tool itself must not touch data tables (the old snapshot/cleanup
		// machinery is gone — deleting rows based on node output is never safe
		// when outputs can be fabricated fixtures).
		const { ctx, deleteRows, queryRows } = makeContext(
			makeBuildOutcome(),
			{
				executionId: 'exec-4',
				status: 'success',
				data: {
					'Insert Lead': [{ id: 3, name: 'Test', email: 'test@example.com' }],
				},
			},
			{
				workflowNodes: [
					{
						name: 'Insert Lead',
						type: 'n8n-nodes-base.dataTable',
						parameters: { operation: 'insert', dataTableId: 'tbl-leads' },
					},
				],
				tableRows: { 'tbl-leads': [{ id: 1 }, { id: 2 }] },
			},
		);

		const result = await runTool(ctx, { workItemId: 'wi-1', workflowId: 'wf-1' });

		expect(result.success).toBe(true);
		expect(queryRows).not.toHaveBeenCalled();
		expect(deleteRows).not.toHaveBeenCalled();
	});
});

describe('verify-built-workflow tool — node simulation plan', () => {
	const simulateVerdict = (nodeName: string, reason = 'Sends a message') => ({
		nodeName,
		verdict: 'simulate' as const,
		reason,
		confidence: 'high' as const,
		source: 'deterministic' as const,
	});
	const executeVerdict = (nodeName: string) => ({
		nodeName,
		verdict: 'execute' as const,
		reason: 'Reads data',
		confidence: 'high' as const,
		source: 'deterministic' as const,
	});

	it('pins unwrapped fixture items for simulated nodes, merged over legacy credential markers', async () => {
		const { ctx } = makeContext(
			makeBuildOutcome({
				verificationPinData: { Gmail: [{ _mockedCredential: 'gmailOAuth2' }] },
				nodeSimulationPlan: [simulateVerdict('Send Slack'), executeVerdict('Get Rows')],
				simulationFixtures: { 'Send Slack': [{ ok: true, ts: '1718000000.1' }] },
			}),
			{ executionId: 'exec-sim', status: 'success', data: {} },
		);

		await runTool(ctx, { workItemId: 'wi-1', workflowId: 'wf-1' });

		const run = vi.mocked(ctx.domainContext.executionService.run);
		expect(run).toHaveBeenCalledTimes(1);
		// Fixture items are passed unwrapped — the adapter wraps each in {json}.
		expect(run.mock.calls[0][2]).toMatchObject({
			verificationPinData: {
				Gmail: [{ _mockedCredential: 'gmailOAuth2' }],
				'Send Slack': [{ ok: true, ts: '1718000000.1' }],
			},
		});
	});

	it('pins an empty item for simulate-verdict nodes that have no fixture', async () => {
		const { ctx } = makeContext(
			makeBuildOutcome({
				nodeSimulationPlan: [simulateVerdict('Send Slack')],
			}),
			{ executionId: 'exec-sim', status: 'success', data: {} },
		);

		await runTool(ctx, { workItemId: 'wi-1', workflowId: 'wf-1' });

		const run = vi.mocked(ctx.domainContext.executionService.run);
		expect(run.mock.calls[0][2]).toMatchObject({
			verificationPinData: { 'Send Slack': [{}] },
		});
	});

	it('passes source-declared read-node fixtures through verification pin data', async () => {
		const reason = 'Source declares verification output for this node';
		const weatherOutput = [{ daily: { precipitation_sum: [6.4] } }];
		const { ctx } = makeContext(
			makeBuildOutcome({
				nodeSimulationPlan: [simulateVerdict('Get Berlin Weather', reason)],
				simulationFixtures: { 'Get Berlin Weather': weatherOutput },
			}),
			{ executionId: 'exec-sim', status: 'success', data: {} },
		);

		await runTool(ctx, { workItemId: 'wi-1', workflowId: 'wf-1' });

		const run = vi.mocked(ctx.domainContext.executionService.run);
		expect(run.mock.calls[0][2]).toMatchObject({
			verificationPinData: { 'Get Berlin Weather': weatherOutput },
		});
	});

	it('applies fixture overrides to simulated nodes for alternate verification scenarios', async () => {
		const reason = 'Source declares verification output for this node';
		const rainyOutput = [{ weather: [{ main: 'Rain' }] }];
		const clearOutput = [{ weather: [{ main: 'Clear' }] }];
		const { ctx } = makeContext(
			makeBuildOutcome({
				nodeSimulationPlan: [simulateVerdict('Get Berlin Forecast', reason)],
				simulationFixtures: { 'Get Berlin Forecast': rainyOutput },
			}),
			{ executionId: 'exec-clear', status: 'success', data: {} },
		);

		const result = await runTool(ctx, {
			workItemId: 'wi-1',
			workflowId: 'wf-1',
			fixtureOverrides: { 'Get Berlin Forecast': clearOutput },
		});

		expect(result.success).toBe(true);
		const run = vi.mocked(ctx.domainContext.executionService.run);
		expect(run.mock.calls[0][2]).toMatchObject({
			verificationPinData: { 'Get Berlin Forecast': clearOutput },
		});
	});

	it('rejects fixture overrides for nodes that are not simulated', async () => {
		const { ctx } = makeContext(
			makeBuildOutcome({
				nodeSimulationPlan: [executeVerdict('Transform Rows')],
			}),
			{ executionId: 'exec-invalid-override', status: 'success', data: {} },
		);

		const result = await runTool(ctx, {
			workItemId: 'wi-1',
			workflowId: 'wf-1',
			fixtureOverrides: { 'Transform Rows': [{ value: 1 }] },
		});

		expect(result.success).toBe(false);
		expect(result.resolvedWorkItemId).toBe('wi-1');
		expect(result.remediation).toMatchObject({
			category: 'blocked',
			shouldEdit: false,
			reason: 'invalid_fixture_override',
		});
		expect(ctx.domainContext.executionService.run).not.toHaveBeenCalled();
	});

	it('does not pin execute-verdict nodes', async () => {
		const { ctx } = makeContext(
			makeBuildOutcome({
				nodeSimulationPlan: [executeVerdict('Get Rows')],
			}),
			{ executionId: 'exec-sim', status: 'success', data: {} },
		);

		await runTool(ctx, { workItemId: 'wi-1', workflowId: 'wf-1' });

		const run = vi.mocked(ctx.domainContext.executionService.run);
		expect(run.mock.calls[0][2]).toMatchObject({ verificationPinData: undefined });
	});

	it('marks simulated nodes in previews and reports them with reasons', async () => {
		const { ctx } = makeContext(
			makeBuildOutcome({
				nodeSimulationPlan: [simulateVerdict('Send Slack', 'Sends a message to a Slack channel')],
				simulationFixtures: { 'Send Slack': [{ ok: true }] },
			}),
			{
				executionId: 'exec-sim',
				status: 'success',
				data: {
					'Send Slack': [{ ok: true }],
					Transform: [{ value: 1 }],
				},
			},
		);

		const result = await runTool(ctx, { workItemId: 'wi-1', workflowId: 'wf-1' });

		expect(result.success).toBe(true);
		const previews = result.nodePreviews ?? [];
		expect(previews.find((p) => p.nodeName === 'Send Slack')).toMatchObject({ simulated: true });
		expect(previews.find((p) => p.nodeName === 'Transform')?.simulated).toBeUndefined();
		expect(result.simulatedNodes).toEqual([
			{ nodeName: 'Send Slack', reason: 'Sends a message to a Slack channel' },
		]);
		expect(result.simulationNote).toContain('Send Slack');
		expect(result.simulationNote).toContain('no real external writes');
	});

	it('fails closed when the build outcome has no simulation plan at all', async () => {
		// An undefined plan means the outcome predates classification or
		// classification failed — nothing shields destructive nodes in that run.
		const { ctx, updateBuildOutcome } = makeContext(
			makeBuildOutcome({ nodeSimulationPlan: undefined }),
			{
				executionId: 'exec-no-plan',
				status: 'success',
				data: { 'Send Slack': [{ ok: true }] },
			},
		);

		const result = await runTool(ctx, { workItemId: 'wi-1', workflowId: 'wf-1' });

		expect(result.success).toBe(false);
		expect(result.error).toContain('no simulation plan');
		expect(result.remediation).toMatchObject({
			category: 'blocked',
			shouldEdit: false,
			reason: 'missing_simulation_plan',
		});
		expect(ctx.domainContext.executionService.run).not.toHaveBeenCalled();
		expect(updateBuildOutcome.mock.calls[0][1].verification).toMatchObject({
			attempted: true,
			success: false,
			status: 'unknown',
			failureSignature: 'missing_simulation_plan',
		});
		expect(ctx.workflowTaskService.reportVerificationVerdict).toHaveBeenCalledWith(
			expect.objectContaining({
				verdict: 'failed_terminal',
				failureSignature: 'missing_simulation_plan',
			}),
		);
		expect(ctx.logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('no simulation plan'),
			expect.objectContaining({ workItemId: 'wi-1' }),
		);
	});

	it('does not warn when the plan is empty (classified, nothing to simulate)', async () => {
		const { ctx } = makeContext(makeBuildOutcome({ nodeSimulationPlan: [] }), {
			executionId: 'exec-empty-plan',
			status: 'success',
			data: { Transform: [{ value: 1 }] },
		});

		const result = await runTool(ctx, { workItemId: 'wi-1', workflowId: 'wf-1' });

		expect(result.success).toBe(true);
		expect(result.simulationNote).toBeUndefined();
		expect(ctx.logger.warn).not.toHaveBeenCalled();
	});

	it('downgrades workflow success when an executed AI tool errored', async () => {
		const { ctx, updateBuildOutcome } = makeContext(makeBuildOutcome({ nodeSimulationPlan: [] }), {
			executionId: 'exec-ai-tool-error',
			status: 'success',
			data: {
				'API Request': [{ body: { city: 'Lisbon' } }],
				'Destination Analyst': [{ output: '{"city":"Lisbon"}' }],
				'Return Brief': [{ output: '{"city":"Lisbon"}' }],
			},
			executedNodeNames: [
				'API Request',
				'GPT Model',
				'geocode_city',
				'Destination Analyst',
				'Return Brief',
			],
			nodeErrors: [
				{
					nodeName: 'geocode_city',
					message:
						'The node "@n8n/n8n-nodes-langchain.toolHttpRequest" has a "supplyData" method but no "execute" method.',
				},
			],
			lastNodeExecuted: 'Return Brief',
		});

		const result = await runTool(ctx, { workItemId: 'wi-1', workflowId: 'wf-1' });

		expect(result.success).toBe(false);
		expect(result.nodeErrors).toHaveLength(1);
		expect(result.nodeErrors?.[0]?.nodeName).toBe('geocode_city');
		expect(result.nodeErrors?.[0]?.message).toContain('supplyData');
		expect(result.error).toContain('geocode_city');
		const verification = updateBuildOutcome.mock.calls[0][1].verification;
		expect(verification?.success).toBe(false);
		expect(verification?.status).toBe('success');
		expect(verification?.failureSignature).toContain('geocode_city');
		expect(verification?.evidence?.nodeErrors).toHaveLength(1);
		expect(verification?.evidence?.nodeErrors?.[0]?.nodeName).toBe('geocode_city');
		expect(verification?.evidence?.nodeErrors?.[0]?.message).toContain('supplyData');
		expect(verification?.evidence?.errorMessage).toContain('geocode_city');
	});

	it('keeps needs_setup routing when a waiting execution also has node errors', async () => {
		const { ctx } = makeContext(makeBuildOutcome({ nodeSimulationPlan: [] }), {
			executionId: 'exec-waiting-node-error',
			status: 'waiting',
			data: {},
			executedNodeNames: ['Lookup', 'Community Pause'],
			nodeErrors: [{ nodeName: 'Lookup', message: 'lookup failed' }],
		});

		const result = await runTool(ctx, { workItemId: 'wi-1', workflowId: 'wf-1' });

		expect(result.success).toBe(false);
		expect(result.remediation).toMatchObject({
			category: 'needs_setup',
			shouldEdit: false,
			reason: 'execution_waiting',
		});
	});

	it('reports planned simulations the execution never reached as unverified (empty-read dead-end)', async () => {
		// Reproduces the order-fulfillment scenario: a data-table lookup on an
		// empty table returns zero items mid-chain, so everything downstream —
		// including all planned simulations — never runs. The run is still a
		// legitimate `success`, but the tool must not claim those nodes were
		// simulated, and must surface the coverage gap.
		const { ctx } = makeContext(
			makeBuildOutcome({
				nodeSimulationPlan: [
					executeVerdict('Look Up Order'),
					simulateVerdict('Wait 2 Hours', 'Pauses the workflow'),
					simulateVerdict('Send Follow-up Email', 'Sends an email'),
					simulateVerdict('Mark Order Fulfilled', 'Updates a row'),
				],
				simulationFixtures: {
					'Wait 2 Hours': [{}],
					'Send Follow-up Email': [{ id: 'msg-1' }],
					'Mark Order Fulfilled': [{ id: 1 }],
				},
			}),
			{
				executionId: 'exec-dead-end',
				status: 'success',
				data: {
					'Order Received': [{ body: { orderId: 'ORD-1001' } }],
					'Wait 10s': [{ body: { orderId: 'ORD-1001' } }],
				},
				// The lookup ran but produced zero items — present here, absent from data.
				executedNodeNames: ['Order Received', 'Wait 10s', 'Look Up Order'],
				lastNodeExecuted: 'Look Up Order',
			},
		);

		const result = await runTool(ctx, { workItemId: 'wi-1', workflowId: 'wf-1' });

		expect(result.success).toBe(true);
		// The lookup ran (zero output) — it counts as executed, not unreached.
		expect(result.nodesExecuted).toContain('Look Up Order');
		expect(result.lastNodeExecuted).toBe('Look Up Order');
		// None of the planned simulations actually happened.
		expect(result.simulatedNodes).toBeUndefined();
		expect(result.simulationNote).toBeUndefined();
		expect(result.nodesNotReached).toEqual([
			'Wait 2 Hours',
			'Send Follow-up Email',
			'Mark Order Fulfilled',
		]);
		expect(result.coverageNote).toContain('UNVERIFIED');
		expect(result.coverageNote).toContain('Look Up Order');
		expect(result.coverageNote).toContain('Seed matching test data');
	});

	it('flags an items-dropped collapse with $input.all() guidance when a collection ran dry', async () => {
		// INS-662: HTTP split a top-level array into N items, a Code node read $input.first() and emitted zero, downstream was skipped.
		const { ctx } = makeContext(
			makeBuildOutcome({
				nodeSimulationPlan: [
					executeVerdict('Get Top Stories'),
					simulateVerdict('Post to Slack', 'Sends a message'),
				],
				simulationFixtures: { 'Post to Slack': [{ ok: true }] },
			}),
			{
				executionId: 'exec-collapse',
				status: 'success',
				data: {
					// HTTP Request split a bare array of IDs into three items.
					'Get Top Stories': [{ json: 12345 }, { json: 12346 }, { json: 12347 }],
				},
				// The Code node ran but read $input.first(), so it emitted zero items.
				executedNodeNames: ['Get Top Stories', 'Get Top N IDs'],
				lastNodeExecuted: 'Get Top N IDs',
			},
		);

		const result = await runTool(ctx, { workItemId: 'wi-1', workflowId: 'wf-1' });

		expect(result.success).toBe(true);
		expect(result.nodesNotReached).toEqual(['Post to Slack']);
		expect(result.coverageNote).toContain('$input.all()');
		expect(result.coverageNote).toContain('$input.first()');
		// Must NOT misattribute the dead-end to an empty lookup.
		expect(result.coverageNote).not.toContain('Seed matching test data');
	});

	it('persists unreached nodes in the verification evidence', async () => {
		const { ctx, updateBuildOutcome } = makeContext(
			makeBuildOutcome({
				nodeSimulationPlan: [simulateVerdict('Send Slack')],
			}),
			{
				executionId: 'exec-evidence',
				status: 'success',
				data: { Trigger: [{ ok: true }] },
				executedNodeNames: ['Trigger'],
				lastNodeExecuted: 'Trigger',
			},
		);

		await runTool(ctx, { workItemId: 'wi-1', workflowId: 'wf-1' });

		expect(updateBuildOutcome.mock.calls[0][1].verification?.evidence?.nodesNotReached).toEqual([
			'Send Slack',
		]);
	});

	it('never deletes rows whose IDs come from fabricated fixture output', async () => {
		const { ctx, deleteRows } = makeContext(
			makeBuildOutcome({
				nodeSimulationPlan: [simulateVerdict('Insert Lead', 'Inserts a row')],
				// Fabricated fixture ID that collides with a real row — must never
				// reach a delete call.
				simulationFixtures: { 'Insert Lead': [{ id: 3 }] },
			}),
			{
				executionId: 'exec-sim',
				status: 'success',
				data: { 'Insert Lead': [{ id: 3 }] },
			},
			{
				workflowNodes: [
					{
						name: 'Insert Lead',
						type: 'n8n-nodes-base.dataTable',
						parameters: { operation: 'insert', dataTableId: 'tbl-leads' },
					},
				],
				tableRows: { 'tbl-leads': [{ id: 1 }, { id: 2 }, { id: 3 }] },
			},
		);

		const result = await runTool(ctx, { workItemId: 'wi-1', workflowId: 'wf-1' });

		expect(result.success).toBe(true);
		expect(deleteRows).not.toHaveBeenCalled();
	});
});

describe('verify-built-workflow tool — stale mocked-credential plan', () => {
	const mockedCredentialVerdict = {
		nodeName: 'Notion',
		verdict: 'simulate' as const,
		reason: 'Credentials are not configured for this node',
		confidence: 'high' as const,
		source: 'deterministic' as const,
	};
	const staleOutcome = () =>
		makeBuildOutcome({
			mockedNodeNames: ['Notion'],
			mockedCredentialTypes: ['notionApi'],
			mockedCredentialsByNode: { Notion: ['notionApi'] },
			nodeSimulationPlan: [mockedCredentialVerdict],
			simulationFixtures: { Notion: [{ page: 'mock' }] },
		});
	const notionConnections = {
		Trigger: { main: [[{ node: 'Notion', type: 'main', index: 0 }]] },
	};

	it('executes a node for real once its mocked credential was assigned after the build', async () => {
		const { ctx, updateBuildOutcome } = makeContext(
			staleOutcome(),
			{ executionId: 'exec-1', status: 'success', data: {} },
			{
				workflowNodes: [
					{
						name: 'Notion',
						type: 'n8n-nodes-base.notion',
						parameters: { operation: 'get' },
						credentials: { notionApi: { id: 'cred-1', name: 'Notion' } },
					},
				],
				workflowConnections: notionConnections,
				availableCredentials: [{ id: 'cred-1', name: 'Notion', type: 'notionApi' }],
			},
		);

		const result = await runTool(ctx, { workItemId: 'wi-1', workflowId: 'wf-1' });

		expect(result.success).toBe(true);
		expect(result.simulatedNodes).toBeUndefined();
		const run = vi.mocked(ctx.domainContext.executionService.run);
		expect(run.mock.calls[0][2]).toMatchObject({ verificationPinData: undefined });
		expect(updateBuildOutcome).toHaveBeenCalledWith(
			'wi-1',
			expect.objectContaining({
				mockedNodeNames: undefined,
				mockedCredentialTypes: undefined,
				mockedCredentialsByNode: undefined,
				nodeSimulationPlan: [expect.objectContaining({ nodeName: 'Notion', verdict: 'execute' })],
				simulationFixtures: undefined,
			}),
		);
	});

	it('keeps replaying the stored plan while the credential is still missing', async () => {
		const { ctx } = makeContext(
			staleOutcome(),
			{ executionId: 'exec-1', status: 'success', data: {} },
			{
				workflowNodes: [
					{ name: 'Notion', type: 'n8n-nodes-base.notion', parameters: { operation: 'get' } },
				],
				workflowConnections: notionConnections,
			},
		);

		const result = await runTool(ctx, { workItemId: 'wi-1', workflowId: 'wf-1' });

		expect(result.simulatedNodes).toBeUndefined(); // node not reached in this run result
		const run = vi.mocked(ctx.domainContext.executionService.run);
		expect(run.mock.calls[0][2]).toMatchObject({
			verificationPinData: { Notion: [{ page: 'mock' }] },
		});
	});

	it('proceeds with the stored plan when the live workflow cannot be loaded', async () => {
		const { ctx } = makeContext(staleOutcome(), {
			executionId: 'exec-1',
			status: 'success',
			data: {},
		});
		vi.mocked(ctx.domainContext.workflowService!.getAsWorkflowJSON).mockRejectedValue(
			new Error('boom'),
		);

		const result = await runTool(ctx, { workItemId: 'wi-1', workflowId: 'wf-1' });

		expect(result.success).toBe(true);
		const run = vi.mocked(ctx.domainContext.executionService.run);
		expect(run.mock.calls[0][2]).toMatchObject({
			verificationPinData: { Notion: [{ page: 'mock' }] },
		});
		expect(ctx.logger.warn).toHaveBeenCalledWith(
			'verify-built-workflow: could not reconcile mocked-credential plan',
			expect.objectContaining({ workItemId: 'wi-1' }),
		);
	});
});
