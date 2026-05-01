/**
 * Verify Built Workflow Tool
 *
 * Runs a built workflow using sidecar verification pin data from the build outcome.
 * The verification pin data is never persisted to the workflow — it only exists
 * for this execution.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { Logger } from '../../logger';
import type {
	InstanceAiDataTableService,
	InstanceAiWorkflowService,
	OrchestrationContext,
} from '../../types';

interface DataTableWriteNode {
	nodeName: string;
	dataTableId: string;
	/**
	 * Only `insert` is cleaned up post-verify. `upsert` is tracked but never
	 * cleaned up because its node output cannot distinguish a newly-created
	 * row from a match on an existing row (see cleanupInsertedRowsByNodeOutput).
	 * `update` never creates rows so cleanup is moot.
	 */
	operation: 'insert' | 'upsert' | 'update';
}

/**
 * Extract the data-table write nodes a workflow contains, keyed by node name so
 * we can look up each node's per-execution output and identify the exact row IDs
 * it created. Returning node-level records (instead of just dataTable IDs) is
 * what lets post-verify cleanup delete only rows *this* run inserted — rows from
 * concurrent writers never appear in these nodes' outputs, so they are safe.
 */
async function extractDataTableWriteNodes(
	workflowService: InstanceAiWorkflowService,
	workflowId: string,
): Promise<DataTableWriteNode[]> {
	try {
		const json = await workflowService.getAsWorkflowJSON(workflowId);
		const out: DataTableWriteNode[] = [];
		for (const node of json.nodes ?? []) {
			if (node.type !== 'n8n-nodes-base.dataTable') continue;
			const params = node.parameters as Record<string, unknown> | undefined;
			const operation = params?.operation;
			if (operation !== 'insert' && operation !== 'upsert' && operation !== 'update') continue;
			const ref = params?.dataTableId;
			let dataTableId: string | undefined;
			if (typeof ref === 'string' && ref.length > 0) {
				dataTableId = ref;
			} else if (
				ref &&
				typeof ref === 'object' &&
				'value' in ref &&
				typeof (ref as { value: unknown }).value === 'string'
			) {
				const value = (ref as { value: string }).value;
				if (value.length > 0) dataTableId = value;
			}
			if (!dataTableId || !node.name) continue;
			out.push({ nodeName: node.name, dataTableId, operation });
		}
		return out;
	} catch {
		return [];
	}
}

/**
 * Extract the numeric `id` values that a single node produced as output during
 * the verify execution. Handles the common n8n shapes: an array of row objects,
 * a `{ json: {...} }` wrapper, or a single row object.
 */
function extractRowIdsFromNodeOutput(nodeOutput: unknown): number[] {
	const ids: number[] = [];
	const visit = (value: unknown): void => {
		if (!value) return;
		if (Array.isArray(value)) {
			for (const item of value) visit(item);
			return;
		}
		if (typeof value !== 'object') return;
		const row = value as Record<string, unknown>;
		if (row.json !== undefined) {
			visit(row.json);
			return;
		}
		const id = row.id;
		if (typeof id === 'number' && Number.isFinite(id)) ids.push(id);
	};
	visit(nodeOutput);
	return ids;
}

/**
 * Per-table pre-verify snapshot. A `Set` is a complete list of row IDs that
 * existed before the run. `null` means the snapshot could not be built (empty
 * table, read error, or pagination cap hit) — cleanup skips any table with a
 * null snapshot. The snapshot guards insert-node cleanup against pathological
 * outputs (e.g. an insert node returning an existing row ID); upsert outputs
 * are not eligible for cleanup at all.
 */
type PreIdsMap = Map<string, Set<number> | null>;

/** Rows per page when snapshotting table contents. */
const SNAPSHOT_PAGE_SIZE = 1000;
/**
 * Hard cap on total rows we will snapshot per table. Snapshot is only a safety
 * check (`is this ID pre-existing?`) so on tables above this size we disable
 * cleanup rather than keep paging forever.
 */
const SNAPSHOT_MAX_ROWS = 100_000;

/**
 * Delete rows this verify execution inserted, identified by the node outputs of
 * the dataTable insert nodes the workflow contains. Rows inserted by concurrent
 * writers never appear in an insert node's output and are therefore safe.
 *
 * Upsert nodes are deliberately skipped: their node output cannot distinguish
 * a newly-created row from a match on an existing one. A concurrent writer
 * inserting a row between the snapshot and the upsert call could yield an ID
 * that looks "new" to the ID-diff check while actually belonging to the
 * concurrent writer — deleting it would destroy production data. Until the
 * upsert path exposes a `wasCreated` flag in the row return, we trade leaking
 * a few verify-created rows for guaranteed safety.
 *
 * When `preIdsByTable.get(dataTableId)` is `null` the snapshot could not be
 * built and cleanup is skipped for that table; without a reliable pre-existing
 * set we cannot distinguish a new insert from a row that pre-existed.
 */
async function cleanupInsertedRowsByNodeOutput(
	dataTableService: InstanceAiDataTableService,
	writeNodes: DataTableWriteNode[],
	resultData: Record<string, unknown> | undefined,
	preIdsByTable: PreIdsMap,
	logger: Logger,
): Promise<number> {
	if (!resultData) return 0;
	/** per-table set of row IDs the workflow's own insert nodes produced */
	const createdIdsByTable = new Map<string, Set<number>>();
	for (const { nodeName, dataTableId, operation } of writeNodes) {
		if (operation !== 'insert') continue;
		const output = resultData[nodeName];
		if (!output) continue;
		const ids = extractRowIdsFromNodeOutput(output);
		if (ids.length === 0) continue;
		let bucket = createdIdsByTable.get(dataTableId);
		if (!bucket) {
			bucket = new Set();
			createdIdsByTable.set(dataTableId, bucket);
		}
		for (const id of ids) bucket.add(id);
	}
	let total = 0;
	for (const [dataTableId, ids] of createdIdsByTable) {
		const preIds = preIdsByTable.get(dataTableId);
		if (preIds === undefined || preIds === null) {
			logger.warn(
				'Skipping data-table cleanup: pre-verify snapshot unavailable. Rows left in place to avoid deleting existing data.',
				{ dataTableId, candidateIds: ids.size },
			);
			continue;
		}
		// Only delete IDs that did not exist before the run — upsert-matched rows stay.
		const toDelete = [...ids].filter((id) => !preIds.has(id));
		if (toDelete.length === 0) continue;
		try {
			await dataTableService.deleteRows(dataTableId, {
				type: 'or',
				filters: toDelete.map((id) => ({
					columnName: 'id',
					condition: 'eq' as const,
					value: id,
				})),
			});
			total += toDelete.length;
		} catch {
			// best-effort: failure on one table does not block others
		}
	}
	return total;
}

/**
 * Pre-verify snapshot of current row IDs per tracked table. Used as a defensive
 * filter for insert-node cleanup — any output ID present in the pre-snapshot
 * is left alone, never deleted. The delete set is still driven by node output,
 * not by a post-verify table-wide diff, so concurrent writers stay safe.
 *
 * The snapshot pages through the full table because the cap on `queryRows`
 * would otherwise leave existing rows past the first page unprotected. If
 * pagination fails mid-way or the table is bigger than `SNAPSHOT_MAX_ROWS`,
 * the entry is set to `null` so `cleanupInsertedRowsByNodeOutput` skips that
 * table rather than guess.
 */
async function snapshotRowIdsPerTable(
	dataTableService: InstanceAiDataTableService,
	dataTableIds: Iterable<string>,
	logger: Logger,
): Promise<PreIdsMap> {
	const out: PreIdsMap = new Map();
	for (const id of dataTableIds) {
		try {
			const bucket = new Set<number>();
			let offset = 0;
			let truncated = false;
			for (;;) {
				const { data } = await dataTableService.queryRows(id, {
					limit: SNAPSHOT_PAGE_SIZE,
					offset,
				});
				for (const row of data) {
					const rid = row.id;
					if (typeof rid === 'number') bucket.add(rid);
				}
				if (data.length < SNAPSHOT_PAGE_SIZE) break;
				offset += SNAPSHOT_PAGE_SIZE;
				if (offset >= SNAPSHOT_MAX_ROWS) {
					truncated = true;
					break;
				}
			}
			if (truncated) {
				logger.warn(
					'Data-table pre-verify snapshot exceeded row cap — cleanup disabled for this table',
					{ dataTableId: id, cap: SNAPSHOT_MAX_ROWS },
				);
				out.set(id, null);
			} else {
				out.set(id, bucket);
			}
		} catch (error) {
			logger.warn('Data-table pre-verify snapshot failed — cleanup disabled for this table', {
				dataTableId: id,
				error: error instanceof Error ? error.message : String(error),
			});
			out.set(id, null);
		}
	}
	return out;
}

export const verifyBuiltWorkflowInputSchema = z.object({
	workItemId: z.string().describe('The work item ID from the build (wi_XXXXXXXX)'),
	workflowId: z.string().describe('The workflow ID to verify'),
	inputData: z
		.record(z.unknown())
		.optional()
		.describe(
			"Input data for the workflow trigger. Shape MUST match the trigger's real-world output: " +
				'Form Trigger → flat field map like {name: "Alice", email: "a@b.c"} (do NOT wrap in formFields); ' +
				'Webhook → the body payload like {event: "signup", userId: "..."} (adapter wraps it under body); ' +
				'Chat Trigger → {chatInput: "user message"}; ' +
				'Schedule Trigger → omit inputData. ' +
				"If you wrap a form payload in {formFields: {...}} the adapter will reject the call — the builder's " +
				'downstream expressions reference $json.<field>, matching the flat production shape.',
		),
	timeout: z
		.number()
		.int()
		.min(1000)
		.max(600_000)
		.optional()
		.describe('Max wait time in milliseconds (default 300000)'),
});

export function createVerifyBuiltWorkflowTool(context: OrchestrationContext) {
	return createTool({
		id: 'verify-built-workflow',
		description:
			'Run a built workflow that has mocked credentials, using sidecar verification pin data ' +
			'from the build outcome. Use this instead of `executions(action="run")` when the build had mocked credentials. ' +
			'CRITICAL: `inputData` shape depends on the trigger type — see the per-trigger guidance on the inputData field. ' +
			'Passing the wrong shape (e.g. wrapping form fields under `formFields`) produces null downstream values that ' +
			'look like an expression bug but are not — do not patch the workflow, re-run verify with the correct shape.',
		inputSchema: verifyBuiltWorkflowInputSchema,
		outputSchema: z.object({
			executionId: z.string().optional(),
			success: z.boolean(),
			status: z.enum(['running', 'success', 'error', 'waiting', 'unknown']).optional(),
			data: z.record(z.unknown()).optional(),
			error: z.string().optional(),
		}),
		execute: async (input: z.infer<typeof verifyBuiltWorkflowInputSchema>) => {
			if (!context.workflowTaskService || !context.domainContext) {
				return { success: false, error: 'Verification support not available.' };
			}

			const buildOutcome = await context.workflowTaskService.getBuildOutcome(input.workItemId);
			if (!buildOutcome) {
				return {
					success: false,
					error: `No build outcome found for work item ${input.workItemId}.`,
				};
			}

			// Pre-verify: enumerate the dataTable write nodes in the workflow and
			// snapshot current row IDs for each insert-touched table. The delete
			// set comes from each insert node's own output after verify (so
			// concurrent writers stay invisible to cleanup); the snapshot is a
			// defensive filter so any ID that pre-existed cannot be deleted.
			// Upsert outputs are deliberately never cleaned — see
			// `cleanupInsertedRowsByNodeOutput` for the rationale.
			const writeNodes = await extractDataTableWriteNodes(
				context.domainContext.workflowService,
				input.workflowId,
			);
			const preSnapshots = await snapshotRowIdsPerTable(
				context.domainContext.dataTableService,
				new Set(writeNodes.map((n) => n.dataTableId)),
				context.logger,
			);

			const result = await context.domainContext.executionService.run(
				input.workflowId,
				input.inputData,
				{
					timeout: input.timeout,
					pinData: buildOutcome.verificationPinData as Record<string, unknown[]> | undefined,
				},
			);

			// Treat `waiting` as success when the workflow produced output and recorded
			// no error. `waiting` is a terminal-ish state for several legitimate flows:
			// Form Trigger workflows that end on a form-respond / completion page, Wait
			// nodes, and HITL prompts. Considering it a failure caused builders to
			// falsely retry verified form workflows and prevented checkpoints from
			// reusing builder evidence. Only treat `waiting` with no output rows AND
			// no error as indeterminate (falls through to failure).
			const hasOutput = result.data ? Object.keys(result.data).length > 0 : false;
			const success =
				result.status === 'success' || (result.status === 'waiting' && !result.error && hasOutput);

			// Post-verify cleanup: delete only rows this run's own dataTable insert
			// nodes emitted as output, and only those whose IDs were not present in
			// the pre-verify snapshot (protects upsert-updated rows from deletion).
			const cleanedRows = await cleanupInsertedRowsByNodeOutput(
				context.domainContext.dataTableService,
				writeNodes,
				result.data,
				preSnapshots,
				context.logger,
			);

			// Persist a structured verification record onto the build outcome so the
			// checkpoint follow-up turn can reuse it instead of re-running verify.
			// Best-effort: swallow storage errors so they don't mask the verify result.
			try {
				const nodesExecuted = result.data ? Object.keys(result.data) : undefined;
				await context.workflowTaskService.updateBuildOutcome(input.workItemId, {
					verification: {
						attempted: true,
						success,
						executionId: result.executionId || undefined,
						status: result.status,
						failureSignature: success ? undefined : result.error,
						evidence: {
							nodesExecuted: nodesExecuted && nodesExecuted.length > 0 ? nodesExecuted : undefined,
							errorMessage: success ? undefined : result.error,
						},
						verifiedAt: new Date().toISOString(),
					},
				});
			} catch {
				// intentional: verification record persistence is advisory
			}

			if (cleanedRows > 0) {
				context.logger.debug?.('verify-built-workflow: cleaned up inserted rows', {
					workItemId: input.workItemId,
					workflowId: input.workflowId,
					cleanedRows,
				});
			}

			return {
				executionId: result.executionId || undefined,
				success,
				status: result.status,
				data: result.data,
				error: result.error,
			};
		},
	});
}
