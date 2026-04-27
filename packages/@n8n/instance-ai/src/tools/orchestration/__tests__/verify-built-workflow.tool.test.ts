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
