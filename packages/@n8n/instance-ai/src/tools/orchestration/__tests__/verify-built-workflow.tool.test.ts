import type {
	InstanceAiDataTableService,
	InstanceAiWorkflowService,
	OrchestrationContext,
	WorkflowTaskService,
} from '../../../types';
import type { WorkflowBuildOutcome } from '../../../workflow-loop/workflow-loop-state';
import { createVerifyBuiltWorkflowTool } from '../verify-built-workflow.tool';

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

function makeContext(
	outcome: WorkflowBuildOutcome | undefined,
	runResult: ExecutionRunResult,
	overrides: {
		workflowNodes?: Array<{ type: string; parameters?: Record<string, unknown> }>;
		tableRows?: Record<string, Array<Record<string, unknown>>>;
		queriesAfterRun?: Record<string, Array<Record<string, unknown>>>;
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
	const queryRowsCalls: string[] = [];
	const queryRows = jest.fn(
		async (
			dataTableId: string,
			_opts?: { limit?: number; offset?: number },
		): Promise<QueryRowsResult> => {
			// First call returns tableRows (pre-verify), subsequent return queriesAfterRun (post-verify).
			const callIndex = queryRowsCalls.filter((id) => id === dataTableId).length;
			queryRowsCalls.push(dataTableId);
			const rows: Array<Record<string, unknown>> =
				callIndex === 0
					? (overrides.tableRows?.[dataTableId] ?? [])
					: (overrides.queriesAfterRun?.[dataTableId] ?? overrides.tableRows?.[dataTableId] ?? []);
			await Promise.resolve();
			return { count: rows.length, data: rows };
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
	input: { workItemId: string; workflowId: string; inputData?: Record<string, unknown> },
) {
	const tool = createVerifyBuiltWorkflowTool(ctx as unknown as OrchestrationContext);
	// createTool's execute signature wraps the user function; invoke directly via internal handler
	const handler = (
		tool as unknown as {
			execute: (input: {
				workItemId: string;
				workflowId: string;
				inputData?: Record<string, unknown>;
			}) => Promise<{
				success: boolean;
				error?: string;
				executionId?: string;
				status?: string;
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

	it('cleans up rows inserted by the verification run in tracked data tables', async () => {
		const { ctx, deleteRows } = makeContext(
			makeBuildOutcome(),
			{ executionId: 'exec-4', status: 'success' },
			{
				workflowNodes: [
					{
						type: 'n8n-nodes-base.dataTable',
						parameters: { operation: 'insert', dataTableId: 'tbl-leads' },
					},
				],
				tableRows: { 'tbl-leads': [{ id: 1 }, { id: 2 }] },
				queriesAfterRun: { 'tbl-leads': [{ id: 1 }, { id: 2 }, { id: 3 }] },
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

	it('does not delete rows for dataTable nodes that only read', async () => {
		const { ctx, deleteRows } = makeContext(
			makeBuildOutcome(),
			{ executionId: 'exec-5', status: 'success' },
			{
				workflowNodes: [
					{
						type: 'n8n-nodes-base.dataTable',
						parameters: { operation: 'get', dataTableId: 'tbl-leads' },
					},
				],
				tableRows: { 'tbl-leads': [{ id: 1 }] },
				queriesAfterRun: { 'tbl-leads': [{ id: 1 }] },
			},
		);

		const result = await runTool(ctx, { workItemId: 'wi-1', workflowId: 'wf-1' });

		expect(result.success).toBe(true);
		expect(deleteRows).not.toHaveBeenCalled();
	});
});
