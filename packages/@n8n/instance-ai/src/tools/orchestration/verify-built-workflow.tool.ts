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

/** Max rows we'll snapshot for cleanup. Skip cleanup for tables larger than this. */
const ROW_TRACKING_CAP = 1000;

/**
 * Extract the data-table IDs a workflow writes to by scanning its nodes for the
 * `n8n-nodes-base.dataTable` type with a row-write operation. Used to narrow the
 * pre/post verify snapshot to only the tables the workflow might mutate.
 */
async function extractWrittenDataTableIds(
	workflowService: InstanceAiWorkflowService,
	workflowId: string,
): Promise<string[]> {
	try {
		const json = await workflowService.getAsWorkflowJSON(workflowId);
		const ids = new Set<string>();
		for (const node of json.nodes ?? []) {
			if (node.type !== 'n8n-nodes-base.dataTable') continue;
			const params = node.parameters as Record<string, unknown> | undefined;
			const operation = params?.operation;
			if (operation !== 'insert' && operation !== 'upsert' && operation !== 'update') continue;
			const ref = params?.dataTableId;
			if (typeof ref === 'string' && ref.length > 0) {
				ids.add(ref);
				continue;
			}
			if (
				ref &&
				typeof ref === 'object' &&
				'value' in ref &&
				typeof (ref as { value: unknown }).value === 'string'
			) {
				const value = (ref as { value: string }).value;
				if (value.length > 0) ids.add(value);
			}
		}
		return [...ids];
	} catch {
		return [];
	}
}

/** Snapshot the current row IDs for a table. Returns null when the table exceeds ROW_TRACKING_CAP. */
async function snapshotRowIds(
	dataTableService: InstanceAiDataTableService,
	dataTableId: string,
): Promise<Set<number> | null> {
	try {
		const { count, data } = await dataTableService.queryRows(dataTableId, {
			limit: ROW_TRACKING_CAP,
		});
		if (count > ROW_TRACKING_CAP) return null;
		const ids = new Set<number>();
		for (const row of data) {
			const id = row.id;
			if (typeof id === 'number') ids.add(id);
		}
		return ids;
	} catch {
		return null;
	}
}

/**
 * Delete rows whose IDs appear after `preIds` — i.e. rows the verification run
 * inserted. Best-effort, bounded to `ROW_TRACKING_CAP` new rows.
 */
async function cleanupInsertedRows(
	dataTableService: InstanceAiDataTableService,
	dataTableId: string,
	preIds: Set<number>,
): Promise<number> {
	try {
		const { count, data } = await dataTableService.queryRows(dataTableId, {
			limit: ROW_TRACKING_CAP + preIds.size,
		});
		if (count > ROW_TRACKING_CAP + preIds.size) return 0;
		const newIds: number[] = [];
		for (const row of data) {
			const id = row.id;
			if (typeof id === 'number' && !preIds.has(id)) newIds.push(id);
		}
		if (newIds.length === 0) return 0;
		await dataTableService.deleteRows(dataTableId, {
			type: 'or',
			filters: newIds.map((id) => ({
				columnName: 'id',
				condition: 'eq' as const,
				value: id,
			})),
		});
		return newIds.length;
	} catch {
		return 0;
	}
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

			// Pre-verify: snapshot row IDs for data tables the workflow writes to, so we can
			// clean up any rows inserted during verification. Best-effort; errors are swallowed.
			const dataTableIds = await extractWrittenDataTableIds(
				context.domainContext.workflowService,
				input.workflowId,
			);
			const preSnapshots = new Map<string, Set<number>>();
			for (const id of dataTableIds) {
				const snap = await snapshotRowIds(context.domainContext.dataTableService, id);
				if (snap) preSnapshots.set(id, snap);
			}

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

			// Post-verify cleanup: remove rows the verification run inserted into
			// tracked data tables. Best-effort; no-op when snapshots are missing.
			let cleanedRows = 0;
			for (const [id, preIds] of preSnapshots) {
				cleanedRows += await cleanupInsertedRows(
					context.domainContext.dataTableService,
					id,
					preIds,
				);
			}

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
