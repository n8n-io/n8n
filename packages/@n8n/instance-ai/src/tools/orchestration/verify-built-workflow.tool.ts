/**
 * Verify Built Workflow Tool
 *
 * Runs a built workflow using sidecar verification pin data from the build outcome.
 * The verification pin data is never persisted to the workflow — it only exists
 * for this execution.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type {
	InstanceAiDataTableService,
	InstanceAiWorkflowService,
	OrchestrationContext,
} from '../../types';

interface DataTableWriteNode {
	nodeName: string;
	dataTableId: string;
	/** Only `insert` and `upsert` may create new rows; `update` is tracked but never cleaned up. */
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
 * Delete rows this verify execution inserted, identified by the node outputs of
 * the dataTable insert/upsert nodes the workflow contains. Rows that appear in a
 * node's output but were present pre-verify are treated as updates (upsert hits
 * on an existing row) and NOT deleted. Rows inserted by concurrent writers never
 * appear in any node's output and are therefore safe from this cleanup.
 */
async function cleanupInsertedRowsByNodeOutput(
	dataTableService: InstanceAiDataTableService,
	writeNodes: DataTableWriteNode[],
	resultData: Record<string, unknown> | undefined,
	preIdsByTable: Map<string, Set<number>>,
): Promise<number> {
	if (!resultData) return 0;
	/** per-table set of row IDs the workflow's own insert/upsert nodes produced */
	const createdIdsByTable = new Map<string, Set<number>>();
	for (const { nodeName, dataTableId, operation } of writeNodes) {
		if (operation === 'update') continue;
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
		const preIds = preIdsByTable.get(dataTableId) ?? new Set<number>();
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
 * Cheap pre-verify snapshot of current row IDs per tracked table. Used only to
 * distinguish insert from upsert-of-existing on the cleanup side — NOT to build
 * the delete set. This keeps cleanup safe against concurrent writers.
 */
async function snapshotRowIdsPerTable(
	dataTableService: InstanceAiDataTableService,
	dataTableIds: Iterable<string>,
): Promise<Map<string, Set<number>>> {
	const out = new Map<string, Set<number>>();
	for (const id of dataTableIds) {
		try {
			const { data } = await dataTableService.queryRows(id, { limit: 1000 });
			const bucket = new Set<number>();
			for (const row of data) {
				const rid = row.id;
				if (typeof rid === 'number') bucket.add(rid);
			}
			out.set(id, bucket);
		} catch {
			out.set(id, new Set());
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
			// snapshot current row IDs for each referenced table. The snapshot is
			// NOT used to compute the delete set — it only disambiguates inserts
			// from upsert-matched-existing rows. The delete set comes from each
			// insert/upsert node's own output after verify, so concurrent writers
			// (whose rows never appear in the workflow's node outputs) are safe.
			const writeNodes = await extractDataTableWriteNodes(
				context.domainContext.workflowService,
				input.workflowId,
			);
			const preSnapshots = await snapshotRowIdsPerTable(
				context.domainContext.dataTableService,
				new Set(writeNodes.map((n) => n.dataTableId)),
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
