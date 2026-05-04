import type {
	InstanceAiDataTableService,
	InstanceAiWorkflowService,
	OrchestrationContext,
	WorkflowTaskService,
} from '../../../types';
import { createRemediation } from '../../../workflow-loop/remediation';
import type { WorkflowBuildOutcome } from '../../../workflow-loop/workflow-loop-state';
import { createVerifyBuiltWorkflowTool } from '../verify-built-workflow.tool';

jest.mock('@mastra/core/tools', () => ({
	createTool: jest.fn((config: Record<string, unknown>) => config),
}));

type Executable = {
	execute: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

function createContext(overrides: Partial<OrchestrationContext> = {}): OrchestrationContext {
	const workflowTaskService = {
		reportBuildOutcome: jest.fn(),
		reportVerificationVerdict: jest.fn(),
		getBuildOutcome: jest.fn().mockResolvedValue({
			workItemId: 'wi_1',
			taskId: 'task_1',
			workflowId: 'wf_1',
			submitted: true,
			triggerType: 'manual_or_testable',
			needsUserInput: false,
			summary: 'Built',
		}),
		getWorkflowLoopState: jest.fn(),
		updateBuildOutcome: jest.fn(),
	};

	return {
		threadId: 'thread_1',
		runId: 'run_1',
		userId: 'user_1',
		orchestratorAgentId: 'agent_1',
		modelId: 'test-model',
		storage: {} as OrchestrationContext['storage'],
		subAgentMaxSteps: 5,
		eventBus: {} as OrchestrationContext['eventBus'],
		logger: {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		} as unknown as OrchestrationContext['logger'],
		domainTools: {},
		abortSignal: new AbortController().signal,
		taskStorage: {} as OrchestrationContext['taskStorage'],
		workflowTaskService,
		domainContext: {
			userId: 'user_1',
			workflowService: {
				getAsWorkflowJSON: jest.fn().mockResolvedValue({ nodes: [] }),
			} as unknown as InstanceAiWorkflowService,
			executionService: {
				run: jest.fn().mockResolvedValue({
					executionId: 'exec_1',
					status: 'success',
				}),
			},
			credentialService: {} as never,
			nodeService: {} as never,
			dataTableService: {
				queryRows: jest.fn().mockResolvedValue({ count: 0, data: [] }),
				deleteRows: jest.fn().mockResolvedValue({ deletedCount: 0 }),
			} as unknown as InstanceAiDataTableService,
		},
		...overrides,
	} as OrchestrationContext;
}

describe('verify-built-workflow tool — remediation guard', () => {
	it('routes mocked-credential verification failures to setup and records terminal verdict', async () => {
		const context = createContext();
		jest.mocked(context.workflowTaskService!.getBuildOutcome).mockResolvedValue({
			workItemId: 'wi_1',
			taskId: 'task_1',
			workflowId: 'wf_1',
			submitted: true,
			triggerType: 'manual_or_testable',
			needsUserInput: false,
			mockedCredentialTypes: ['gmailOAuth2'],
			mockedNodeNames: ['Gmail'],
			summary: 'Built',
		});
		jest.mocked(context.domainContext!.executionService.run).mockResolvedValue({
			executionId: 'exec_1',
			status: 'error',
			error: 'Gmail credentials are mocked',
		});
		const tool = createVerifyBuiltWorkflowTool(context) as unknown as Executable;

		const result = await tool.execute({ workItemId: 'wi_1', workflowId: 'wf_1' });

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
		const reported = jest.mocked(context.workflowTaskService!.reportVerificationVerdict).mock
			.calls[0]?.[0] as { remediation?: { category?: string } };
		expect(reported.remediation).toMatchObject({ category: 'needs_setup' });
	});

	it('does not treat mocked credentials as setup when the execution error is code-fixable', async () => {
		const context = createContext();
		jest.mocked(context.workflowTaskService!.getBuildOutcome).mockResolvedValue({
			workItemId: 'wi_1',
			taskId: 'task_1',
			workflowId: 'wf_1',
			submitted: true,
			triggerType: 'manual_or_testable',
			needsUserInput: false,
			mockedCredentialTypes: ['slackApi'],
			mockedNodeNames: ['Slack'],
			summary: 'Built',
		});
		jest.mocked(context.domainContext!.executionService.run).mockResolvedValue({
			executionId: 'exec_1',
			status: 'error',
			error: 'Code node failed: Cannot read properties of undefined',
		});
		const tool = createVerifyBuiltWorkflowTool(context) as unknown as Executable;

		const result = await tool.execute({ workItemId: 'wi_1', workflowId: 'wf_1' });

		expect(result.remediation).toMatchObject({
			category: 'code_fixable',
			shouldEdit: true,
			reason: 'runtime_failure',
		});
		expect(context.workflowTaskService!.reportVerificationVerdict).not.toHaveBeenCalled();
	});

	it('returns terminal remediation even when verdict persistence and telemetry fail', async () => {
		const trackTelemetry = jest.fn(() => {
			throw new Error('telemetry unavailable');
		});
		const context = createContext({ trackTelemetry });
		jest
			.mocked(context.workflowTaskService!.reportVerificationVerdict)
			.mockRejectedValue(new Error('storage unavailable'));
		jest.mocked(context.workflowTaskService!.getBuildOutcome).mockResolvedValue({
			workItemId: 'wi_1',
			taskId: 'task_1',
			workflowId: 'wf_1',
			submitted: true,
			triggerType: 'manual_or_testable',
			needsUserInput: false,
			mockedCredentialTypes: ['gmailOAuth2'],
			mockedNodeNames: ['Gmail'],
			summary: 'Built',
		});
		jest.mocked(context.domainContext!.executionService.run).mockResolvedValue({
			executionId: 'exec_1',
			status: 'error',
			error: 'Gmail credentials are mocked',
		});
		const tool = createVerifyBuiltWorkflowTool(context) as unknown as Executable;

		const result = await tool.execute({ workItemId: 'wi_1', workflowId: 'wf_1' });

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
		jest.mocked(context.workflowTaskService!.getWorkflowLoopState).mockResolvedValue({
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
		const tool = createVerifyBuiltWorkflowTool(context) as unknown as Executable;

		const result = await tool.execute({ workItemId: 'wi_1', workflowId: 'wf_1' });
		const repeatedResult = await tool.execute({ workItemId: 'wi_1', workflowId: 'wf_1' });

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
		jest.mocked(context.workflowTaskService!.getWorkflowLoopState).mockResolvedValue({
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
		const tool = createVerifyBuiltWorkflowTool(context) as unknown as Executable;

		const result = await tool.execute({ workItemId: 'wi_1', workflowId: 'wf_1' });

		expect(result.success).toBe(true);
		expect(context.domainContext!.executionService.run).toHaveBeenCalled();
	});

	it('still verifies the second allowed post-submit repair before blocking further edits', async () => {
		const context = createContext();
		jest.mocked(context.workflowTaskService!.getWorkflowLoopState).mockResolvedValue({
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
		const tool = createVerifyBuiltWorkflowTool(context) as unknown as Executable;

		const result = await tool.execute({ workItemId: 'wi_1', workflowId: 'wf_1' });

		expect(result.success).toBe(true);
		expect(context.domainContext!.executionService.run).toHaveBeenCalled();
		expect(context.workflowTaskService!.reportVerificationVerdict).not.toHaveBeenCalled();
	});

	it('blocks a failing verification after the second post-submit repair was already submitted', async () => {
		const context = createContext();
		jest.mocked(context.workflowTaskService!.getWorkflowLoopState).mockResolvedValue({
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
		jest.mocked(context.domainContext!.executionService.run).mockResolvedValue({
			executionId: 'exec_1',
			status: 'error',
			error: 'Code node still fails',
		});
		const tool = createVerifyBuiltWorkflowTool(context) as unknown as Executable;

		const result = await tool.execute({ workItemId: 'wi_1', workflowId: 'wf_1' });

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
		jest.mocked(context.domainContext!.executionService.run).mockResolvedValue({
			executionId: 'exec_1',
			status: 'error',
			error: 'Node parameter value is invalid',
		});
		const tool = createVerifyBuiltWorkflowTool(context) as unknown as Executable;

		const result = await tool.execute({ workItemId: 'wi_1', workflowId: 'wf_1' });

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
	error?: string;
};

interface VerifyToolContext {
	workflowTaskService: WorkflowTaskService;
	domainContext: {
		executionService: {
			run: jest.Mock<
				Promise<ExecutionRunResult>,
				[string, Record<string, unknown> | undefined, { timeout?: number; pinData?: unknown }]
			>;
		};
		workflowService?: InstanceAiWorkflowService;
		dataTableService?: InstanceAiDataTableService;
	};
	logger: { debug: jest.Mock; info: jest.Mock; warn: jest.Mock; error: jest.Mock };
}

function makeBuildOutcome(overrides: Partial<WorkflowBuildOutcome> = {}): WorkflowBuildOutcome {
	return {
		workItemId: 'wi-1',
		taskId: 'task-1',
		workflowId: 'wf-1',
		submitted: true,
		triggerType: 'manual_or_testable',
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
		workflowNodes?: Array<{ name?: string; type: string; parameters?: Record<string, unknown> }>;
		tableRows?: Record<string, Array<Record<string, unknown>>>;
		queriesAfterRun?: Record<string, Array<Record<string, unknown>>>;
		/** Throw `snapshotError` on the first queryRows call for the given table id. */
		snapshotErrors?: Record<string, Error>;
	} = {},
) {
	const updateBuildOutcome = jest.fn(
		async (_workItemId: string, _update: Partial<WorkflowBuildOutcome>) => {
			await Promise.resolve();
		},
	);
	const run = jest.fn(
		async (
			_workflowId: string,
			_inputData: Record<string, unknown> | undefined,
			_options: { timeout?: number; pinData?: unknown },
		): Promise<ExecutionRunResult> => {
			await Promise.resolve();
			return runResult;
		},
	);

	type QueryRowsResult = { count: number; data: Array<Record<string, unknown>> };
	/**
	 * Track which dataTableIds we've already "seen a last page for" — any call
	 * after the snapshot phase for a given table switches to `queriesAfterRun`.
	 */
	const snapshotDone = new Set<string>();
	const queryRows = jest.fn(
		async (
			dataTableId: string,
			opts?: { limit?: number; offset?: number },
		): Promise<QueryRowsResult> => {
			const snapshotError = overrides.snapshotErrors?.[dataTableId];
			if (snapshotError && !snapshotDone.has(dataTableId)) {
				// Mark done so post-run phase doesn't keep throwing if that matters.
				snapshotDone.add(dataTableId);
				throw snapshotError;
			}
			const limit = opts?.limit ?? Number.MAX_SAFE_INTEGER;
			const offset = opts?.offset ?? 0;
			const baseRows: Array<Record<string, unknown>> = snapshotDone.has(dataTableId)
				? (overrides.queriesAfterRun?.[dataTableId] ?? overrides.tableRows?.[dataTableId] ?? [])
				: (overrides.tableRows?.[dataTableId] ?? []);
			const page = baseRows.slice(offset, offset + limit);
			// If this page is the last one of the snapshot (fewer than `limit` rows),
			// any subsequent calls for this table should fall through to post-run data.
			if (!snapshotDone.has(dataTableId) && page.length < limit) {
				snapshotDone.add(dataTableId);
			}
			await Promise.resolve();
			return { count: baseRows.length, data: page };
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
	const deleteRows = jest.fn(async (_dataTableId: string, _filter: DeleteRowsFilter) => {
		await Promise.resolve();
		return { deletedCount: 0, dataTableId: '', tableName: '', projectId: '' };
	});

	const workflowService = {
		getAsWorkflowJSON: jest.fn(async () => {
			await Promise.resolve();
			return { nodes: overrides.workflowNodes ?? [] };
		}),
	} as unknown as InstanceAiWorkflowService;

	const dataTableService = {
		queryRows,
		deleteRows,
	} as unknown as InstanceAiDataTableService;

	const logger = {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	};

	const ctx: VerifyToolContext = {
		workflowTaskService: {
			reportBuildOutcome: jest.fn(),
			reportVerificationVerdict: jest.fn(),
			getBuildOutcome: jest.fn(async () => {
				await Promise.resolve();
				return outcome;
			}),
			getWorkflowLoopState: jest.fn(),
			updateBuildOutcome,
		} as unknown as WorkflowTaskService,
		domainContext: {
			executionService: { run },
			workflowService,
			dataTableService,
		},
		logger,
	};
	return { ctx, updateBuildOutcome, queryRows, deleteRows };
}

async function runTool(
	ctx: VerifyToolContext,
	input: {
		workItemId: string;
		workflowId: string;
		inputData?: Record<string, unknown>;
		includeData?: boolean;
		maxDataChars?: number;
	},
) {
	const tool = createVerifyBuiltWorkflowTool(ctx as unknown as OrchestrationContext);
	// createTool's execute signature wraps the user function; invoke directly via internal handler
	const handler = (
		tool as unknown as {
			execute: (input: {
				workItemId: string;
				workflowId: string;
				inputData?: Record<string, unknown>;
				includeData?: boolean;
				maxDataChars?: number;
			}) => Promise<{
				success: boolean;
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
				}>;
				data?: Record<string, unknown>;
			}>;
		}
	).execute;
	return await handler(input);
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

	it('cleans up rows inserted by the verification run, reading row IDs from the node output', async () => {
		const { ctx, deleteRows } = makeContext(
			makeBuildOutcome(),
			{
				executionId: 'exec-4',
				status: 'success',
				// The insert node's output is what drives the delete set — a concurrent
				// writer's row would never appear here, so it's safe from cleanup.
				data: {
					'Lead Form': [{ name: 'Test' }],
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

		const result = await runTool(ctx, {
			workItemId: 'wi-1',
			workflowId: 'wf-1',
			inputData: { name: 'Test' },
		});

		expect(result.success).toBe(true);
		expect(deleteRows).toHaveBeenCalledTimes(1);
		const call = deleteRows.mock.calls[0];
		expect(call).toBeDefined();
		expect(call[0]).toBe('tbl-leads');
		expect(call[1]).toEqual({
			type: 'or',
			filters: [{ columnName: 'id', condition: 'eq', value: 3 }],
		});
	});

	it('cleans up inserted rows when the execution output is wrapped', async () => {
		const { ctx, deleteRows } = makeContext(
			makeBuildOutcome(),
			{
				executionId: 'exec-wrapped-insert',
				status: 'success',
				data: {
					'Insert Lead': wrapExecutionOutput([{ id: 3, name: 'Test' }]),
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
		expect(deleteRows.mock.calls[0][1]).toEqual({
			type: 'or',
			filters: [{ columnName: 'id', condition: 'eq', value: 3 }],
		});
	});

	it('never deletes rows produced by an upsert node, even when the ID looks new', async () => {
		// Upsert outputs cannot distinguish a freshly-created row from a match on
		// an existing row. A concurrent writer inserting between snapshot and
		// upsert would yield an ID that looks "new" to ID-diff but actually
		// belongs to that writer — deleting it would destroy production data.
		// We therefore skip cleanup for upsert nodes entirely.
		const { ctx, deleteRows } = makeContext(
			makeBuildOutcome(),
			{
				executionId: 'exec-upsert',
				status: 'success',
				data: {
					// id=99 is not in the pre-verify snapshot — under the old
					// ID-diff logic this would be deleted. The new contract leaves
					// it alone because we cannot prove it was created by verify.
					'Upsert Lead': [{ id: 99, name: 'Could be a concurrent writer' }],
				},
			},
			{
				workflowNodes: [
					{
						name: 'Upsert Lead',
						type: 'n8n-nodes-base.dataTable',
						parameters: { operation: 'upsert', dataTableId: 'tbl-leads' },
					},
				],
				tableRows: { 'tbl-leads': [{ id: 1 }, { id: 2 }] },
			},
		);

		const result = await runTool(ctx, { workItemId: 'wi-1', workflowId: 'wf-1' });

		expect(result.success).toBe(true);
		expect(deleteRows).not.toHaveBeenCalled();
	});

	it('does not delete rows from concurrent writers that never appeared in the node output', async () => {
		const { ctx, deleteRows } = makeContext(
			makeBuildOutcome(),
			{
				executionId: 'exec-concurrent',
				status: 'success',
				// The verify's insert node only emitted id=3; a concurrent writer that
				// added id=4 after the snapshot would be invisible to us and must NOT
				// be deleted. This test asserts the delete set is driven purely by
				// node output, not by a post-verify table-wide diff.
				data: {
					'Insert Lead': [{ id: 3, name: 'VerifyRow' }],
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
		expect(deleteRows).toHaveBeenCalledTimes(1);
		// Only id=3 (the row our insert node emitted), not id=4 from the concurrent writer.
		expect(deleteRows.mock.calls[0][1]).toEqual({
			type: 'or',
			filters: [{ columnName: 'id', condition: 'eq', value: 3 }],
		});
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

	it('paginates the pre-verify snapshot so a pathological insert output cannot delete a pre-existing row past the first page', async () => {
		// Build a table with 1500 rows — past the snapshot page size.
		// The insert node's output is `id=1234` (a row that already existed). If
		// pagination is broken the snapshot only contains ids 1..1000, and the
		// snapshot's defensive filter wouldn't protect id=1234 — the cleanup
		// would delete a pre-existing row.
		const bigTable: Array<Record<string, unknown>> = Array.from({ length: 1500 }, (_v, i) => ({
			id: i + 1,
		}));
		const { ctx, deleteRows, queryRows } = makeContext(
			makeBuildOutcome(),
			{
				executionId: 'exec-insert-past-page',
				status: 'success',
				data: {
					// Insert node's output references id=1234 — beyond the single-page cap.
					'Insert Lead': [{ id: 1234, name: 'Existing', stage: 'qualified' }],
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
				tableRows: { 'tbl-leads': bigTable },
			},
		);

		const result = await runTool(ctx, { workItemId: 'wi-1', workflowId: 'wf-1' });

		expect(result.success).toBe(true);
		// Must have made more than one snapshot query to cover a 1500-row table.
		const snapshotCalls = queryRows.mock.calls.filter(
			(c) => c[0] === 'tbl-leads' && typeof (c[1] as { offset?: number })?.offset === 'number',
		);
		expect(snapshotCalls.length).toBeGreaterThan(1);
		// And the pre-existing row must not have been deleted.
		expect(deleteRows).not.toHaveBeenCalled();
	});

	it('skips insert cleanup for a table when the pre-verify snapshot read fails', async () => {
		const { ctx, deleteRows } = makeContext(
			makeBuildOutcome(),
			{
				executionId: 'exec-snapshot-fail',
				status: 'success',
				data: {
					'Insert Lead': [{ id: 42, name: 'Existing', stage: 'qualified' }],
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
				tableRows: { 'tbl-leads': [{ id: 42 }] },
				snapshotErrors: { 'tbl-leads': new Error('DB unavailable') },
			},
		);

		const result = await runTool(ctx, { workItemId: 'wi-1', workflowId: 'wf-1' });

		expect(result.success).toBe(true);
		expect(deleteRows).not.toHaveBeenCalled();
	});

	it('does not delete rows for dataTable nodes that only read', async () => {
		const { ctx, deleteRows } = makeContext(
			makeBuildOutcome(),
			{
				executionId: 'exec-5',
				status: 'success',
				data: { 'Lookup Lead': [{ id: 1, name: 'Existing' }] },
			},
			{
				workflowNodes: [
					{
						name: 'Lookup Lead',
						type: 'n8n-nodes-base.dataTable',
						parameters: { operation: 'get', dataTableId: 'tbl-leads' },
					},
				],
				tableRows: { 'tbl-leads': [{ id: 1 }] },
			},
		);

		const result = await runTool(ctx, { workItemId: 'wi-1', workflowId: 'wf-1' });

		expect(result.success).toBe(true);
		expect(deleteRows).not.toHaveBeenCalled();
	});
});
