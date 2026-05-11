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
import { createRemediation, terminalRemediationFromState } from '../../workflow-loop/remediation';
import type {
	RemediationMetadata,
	WorkflowBuildOutcome,
} from '../../workflow-loop/workflow-loop-state';

const DEFAULT_NODE_PREVIEW_CHARS = 600;

function stringifyForToolOutput(value: unknown): string {
	if (typeof value === 'string') return value;
	try {
		return JSON.stringify(value) ?? String(value);
	} catch {
		return String(value);
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function unwrapUntrustedData(value: string): unknown {
	const match = /^<untrusted_data\b[^>]*>\n([\s\S]*)\n<\/untrusted_data>$/i.exec(value);
	if (!match) return value;
	const content = match[1];
	if (content === undefined) return value;

	try {
		const parsed: unknown = JSON.parse(content);
		return parsed;
	} catch {
		return value;
	}
}

function outputForInspection(nodeOutput: unknown): unknown {
	return typeof nodeOutput === 'string' ? unwrapUntrustedData(nodeOutput) : nodeOutput;
}

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
		const inspected = outputForInspection(value);
		if (!inspected) return;
		if (Array.isArray(inspected)) {
			for (const item of inspected) visit(item);
			return;
		}
		if (!isRecord(inspected)) return;
		const row = inspected;
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

function getCountFromMetadata(value: unknown): number | undefined {
	if (!isRecord(value)) return undefined;

	for (const key of ['totalItems', '_itemCount']) {
		const count = value[key];
		if (typeof count === 'number' && Number.isFinite(count) && count >= 0) {
			return count;
		}
	}

	return undefined;
}

function countOutputItems(nodeOutput: unknown): number | undefined {
	const output = outputForInspection(nodeOutput);
	if (Array.isArray(output)) return output.length;
	const metadataCount = getCountFromMetadata(output);
	if (metadataCount !== undefined) return metadataCount;
	if (output === undefined || output === null) return 0;
	return 1;
}

function previewValue(value: unknown, maxChars: number): { preview: string; truncated: boolean } {
	const serialized = stringifyForToolOutput(value);
	if (maxChars <= 0) {
		return { preview: '', truncated: serialized.length > 0 };
	}
	if (serialized.length <= maxChars) {
		return { preview: serialized, truncated: false };
	}
	return { preview: `${serialized.slice(0, maxChars)}...`, truncated: true };
}

function buildNodePreviews(
	resultData: Record<string, unknown> | undefined,
	maxChars: number,
): Array<{
	nodeName: string;
	itemCount?: number;
	preview: string;
	truncated: boolean;
	chars: number;
}> {
	if (!resultData) return [];

	return Object.entries(resultData).map(([nodeName, nodeOutput]) => {
		const serialized = stringifyForToolOutput(nodeOutput);
		const preview = previewValue(nodeOutput, maxChars);
		return {
			nodeName,
			itemCount: countOutputItems(nodeOutput),
			preview: preview.preview,
			truncated: preview.truncated,
			chars: serialized.length,
		};
	});
}

function countProducedOutputRows(
	resultData: Record<string, unknown> | undefined,
): number | undefined {
	if (!resultData) return undefined;
	let count = 0;
	for (const nodeOutput of Object.values(resultData)) {
		const itemCount = countOutputItems(nodeOutput);
		if (itemCount !== undefined) count += itemCount;
	}
	return count;
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
	includeData: z
		.boolean()
		.optional()
		.describe('Set true only when you need the full execution data payload. Default false.'),
	maxDataChars: z
		.number()
		.int()
		.min(0)
		.max(20_000)
		.optional()
		.describe('Max characters per node preview in the compact response (default 600).'),
});

const remediationOutputSchema = z
	.object({
		category: z.enum(['code_fixable', 'needs_setup', 'blocked']),
		shouldEdit: z.boolean(),
		guidance: z.string(),
		reason: z.string().optional(),
		remainingSubmitFixes: z.number().int().min(0).optional(),
		attemptCount: z.number().int().min(0).optional(),
	})
	.optional();

function classifyVerificationFailure(
	error: string | undefined,
	status: string | undefined,
	buildOutcome: WorkflowBuildOutcome,
): RemediationMetadata {
	if (buildOutcome.hasUnresolvedPlaceholders) {
		return createRemediation({
			category: 'needs_setup',
			shouldEdit: false,
			reason: 'mocked_credentials_or_placeholders',
			guidance:
				'Workflow submitted successfully, but verification is blocked by unresolved setup values. Stop code edits and route to workflows(action="setup").',
		});
	}

	if (status === 'waiting') {
		return createRemediation({
			category: 'needs_setup',
			shouldEdit: false,
			reason: 'execution_waiting',
			guidance:
				'Workflow verification is waiting for user action or setup. Stop code edits and ask the user to complete setup.',
		});
	}

	const normalized = (error ?? '').toLowerCase();
	const mockedCredentialTypeCount = buildOutcome.mockedCredentialTypes?.length ?? 0;
	const mockedNodeCount = buildOutcome.mockedNodeNames?.length ?? 0;
	const hasMockedCredentialContext = Boolean(mockedCredentialTypeCount > 0 || mockedNodeCount > 0);
	if (
		normalized.includes('credential') ||
		normalized.includes('unauthorized') ||
		normalized.includes('forbidden') ||
		normalized.includes('401') ||
		normalized.includes('403') ||
		normalized.includes('free tier') ||
		normalized.includes('quota')
	) {
		return createRemediation({
			category: 'needs_setup',
			shouldEdit: false,
			reason: hasMockedCredentialContext
				? 'mocked_credentials_or_placeholders'
				: 'credential_or_setup_failure',
			guidance: hasMockedCredentialContext
				? 'Workflow submitted successfully, but verification is blocked by mocked credentials. Stop code edits and route to workflows(action="setup").'
				: 'Workflow submitted successfully, but verification requires credential or account setup. Stop code edits and route to workflows(action="setup").',
		});
	}

	if (
		normalized.includes('429') ||
		normalized.includes('rate limit') ||
		normalized.includes('502') ||
		normalized.includes('bad gateway') ||
		normalized.includes('timed out')
	) {
		return createRemediation({
			category: 'blocked',
			shouldEdit: false,
			reason: 'external_service_or_timeout',
			guidance:
				'Workflow submitted successfully, but verification is blocked by an external service or timeout. Stop code edits and explain the blocker to the user.',
		});
	}

	return createRemediation({
		category: 'code_fixable',
		shouldEdit: true,
		reason: 'runtime_failure',
		guidance:
			'Verification found a workflow runtime failure. Diagnose it and apply one batched workflow-code repair if the guard allows it.',
	});
}

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
			nodesExecuted: z.array(z.string()).optional(),
			nodePreviews: z
				.array(
					z.object({
						nodeName: z.string(),
						itemCount: z.number().optional(),
						preview: z.string(),
						truncated: z.boolean(),
						chars: z.number(),
					}),
				)
				.optional(),
			data: z.record(z.unknown()).optional(),
			error: z.string().optional(),
			remediation: remediationOutputSchema,
			guidance: z.string().optional(),
		}),
		execute: async (input: z.infer<typeof verifyBuiltWorkflowInputSchema>) => {
			if (!context.workflowTaskService || !context.domainContext) {
				const remediation = createRemediation({
					category: 'blocked',
					shouldEdit: false,
					reason: 'verification_support_unavailable',
					guidance:
						'Verification support is not available. Stop code edits and explain the blocker.',
				});
				return { success: false, error: 'Verification support not available.', remediation };
			}

			const stateBefore = await context.workflowTaskService.getWorkflowLoopState(input.workItemId);
			const terminalRemediation =
				stateBefore?.lastRemediation && !stateBefore.lastRemediation.shouldEdit
					? terminalRemediationFromState(stateBefore, context.runId)
					: undefined;
			if (terminalRemediation) {
				return {
					success: false,
					error: terminalRemediation.guidance,
					remediation: terminalRemediation,
					guidance: terminalRemediation.guidance,
				};
			}

			const buildOutcome = await context.workflowTaskService.getBuildOutcome(input.workItemId);
			if (!buildOutcome) {
				const remediation = createRemediation({
					category: 'blocked',
					shouldEdit: false,
					reason: 'missing_build_outcome',
					guidance: `No build outcome found for work item ${input.workItemId}. Stop code edits and explain the blocker.`,
				});
				return {
					success: false,
					error: `No build outcome found for work item ${input.workItemId}.`,
					remediation,
					guidance: remediation.guidance,
				};
			}

			if (!buildOutcome.workflowId) {
				return {
					success: false,
					error: `Build outcome ${input.workItemId} does not include a workflow ID.`,
				};
			}

			if (buildOutcome.workflowId !== input.workflowId) {
				return {
					success: false,
					error:
						`Build outcome ${input.workItemId} belongs to workflow ${buildOutcome.workflowId}, ` +
						`but verification was requested for workflow ${input.workflowId}.`,
				};
			}

			const workflowId = buildOutcome.workflowId;

			// Pre-verify: enumerate the dataTable write nodes in the workflow and
			// snapshot current row IDs for each insert-touched table. The delete
			// set comes from each insert node's own output after verify (so
			// concurrent writers stay invisible to cleanup); the snapshot is a
			// defensive filter so any ID that pre-existed cannot be deleted.
			// Upsert outputs are deliberately never cleaned — see
			// `cleanupInsertedRowsByNodeOutput` for the rationale.
			const writeNodes = await extractDataTableWriteNodes(
				context.domainContext.workflowService,
				workflowId,
			);
			const preSnapshots = await snapshotRowIdsPerTable(
				context.domainContext.dataTableService,
				new Set(writeNodes.map((n) => n.dataTableId)),
				context.logger,
			);

			const result = await context.domainContext.executionService.run(workflowId, input.inputData, {
				timeout: input.timeout,
				pinData: buildOutcome.verificationPinData as Record<string, unknown[]> | undefined,
			});

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

			const failureRemediation = success
				? undefined
				: classifyVerificationFailure(result.error, result.status, buildOutcome);
			const budgetRemediation =
				failureRemediation?.shouldEdit === true
					? terminalRemediationFromState(stateBefore, context.runId)
					: undefined;
			const remediation = budgetRemediation ?? failureRemediation;

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
							producedOutputRows: countProducedOutputRows(result.data),
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
					workflowId,
					cleanedRows,
				});
			}

			if (remediation && !remediation.shouldEdit) {
				try {
					await context.workflowTaskService.reportVerificationVerdict({
						workItemId: input.workItemId,
						runId: context.runId,
						workflowId,
						executionId: result.executionId || undefined,
						verdict:
							remediation.category === 'needs_setup' ? 'needs_user_input' : 'failed_terminal',
						failureSignature: remediation.reason,
						diagnosis: remediation.guidance,
						remediation,
						summary: remediation.guidance,
					});
				} catch (error) {
					context.logger.warn('verify-built-workflow: failed to persist terminal verdict', {
						workItemId: input.workItemId,
						workflowId,
						error: error instanceof Error ? error.message : String(error),
					});
				}
				try {
					context.trackTelemetry?.('Builder remediation guard fired', {
						thread_id: context.threadId,
						run_id: context.runId,
						work_item_id: input.workItemId,
						workflow_id: workflowId,
						category: remediation.category,
						attempt_count: remediation.attemptCount,
						reason: remediation.reason,
					});
				} catch (error) {
					context.logger.warn('verify-built-workflow: failed to emit remediation telemetry', {
						workItemId: input.workItemId,
						workflowId,
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}

			const maxDataChars = input.maxDataChars ?? DEFAULT_NODE_PREVIEW_CHARS;
			const nodesExecuted = result.data ? Object.keys(result.data) : undefined;
			return {
				executionId: result.executionId || undefined,
				success,
				status: result.status,
				nodesExecuted,
				nodePreviews: buildNodePreviews(result.data, maxDataChars),
				...(input.includeData ? { data: result.data } : {}),
				error: result.error,
				remediation,
				guidance: remediation?.guidance,
			};
		},
	});
}
