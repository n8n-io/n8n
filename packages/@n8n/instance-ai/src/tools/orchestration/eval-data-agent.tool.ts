import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiDataTableService, OrchestrationContext } from '../../types';
import { analyzeEvalDataRequirements } from '../evals/eval-data-requirements.service';
import { extractRowsFromExecutionHistory } from '../evals/extract-rows-from-history.service';
import { generateSampleRows } from '../evals/generate-sample-rows.service';

const HISTORY_THRESHOLD = 10;
const GENERATE_ROW_COUNT = 10;

async function ensureColumnsExist(
	dataTableService: InstanceAiDataTableService,
	dataTableId: string,
	rows: Array<Record<string, unknown>>,
	extraColumns: readonly string[],
	options: { projectId?: string } | undefined,
): Promise<void> {
	const referencedColumns = new Set<string>(extraColumns);
	for (const row of rows) {
		for (const key of Object.keys(row)) referencedColumns.add(key);
	}
	if (referencedColumns.size === 0) return;

	const schema = await dataTableService.getSchema(dataTableId, options);
	const existing = new Set(schema.map((c) => c.name));
	const missing = [...referencedColumns].filter((name) => !existing.has(name));

	for (const name of missing) {
		await dataTableService.addColumn(dataTableId, { name, type: 'string' }, options);
	}
}

const evalDataInputSchema = z.object({
	workflowId: z.string().describe('ID of the workflow whose eval DataTable should be populated'),
	projectId: z.string().optional(),
});

const PREVIEW_ROW_COUNT = 3;
const PREVIEW_VALUE_MAX_LEN = 80;

const tableSummarySchema = z.object({
	id: z.string(),
	name: z.string(),
	projectId: z.string().optional(),
	rowCount: z.number(),
	inputColumns: z.array(z.string()),
	expectedOutputColumns: z.array(z.string()),
	previewRows: z.array(z.record(z.string(), z.unknown())),
});

const outputSchema = z.object({
	status: z.enum(['imported', 'generated', 'skipped']),
	rowCount: z.number().optional(),
	source: z.enum(['history', 'synthetic']).optional(),
	reason: z.string().optional(),
	/**
	 * True when synthetic rows were inserted with empty expected-output columns.
	 * The agent must tell the user to fill those columns in before running the
	 * evaluation, so the eval measures correctness instead of self-consistency
	 * with the generator's own guess at the right answer.
	 */
	expectedOutputsNeedUserReview: z.boolean().optional(),
	expectedOutputColumns: z.array(z.string()).optional(),
	/**
	 * Snapshot of the populated DataTable so the agent can show the user what
	 * was generated alongside the metric setup, without making them dig through
	 * the data-tables UI to verify. Includes the table id (for deep-linking) and
	 * a short row preview. Only present on success paths.
	 */
	table: tableSummarySchema.optional(),
});

function truncateForPreview(value: unknown): unknown {
	if (typeof value !== 'string') return value;
	return value.length > PREVIEW_VALUE_MAX_LEN ? `${value.slice(0, PREVIEW_VALUE_MAX_LEN)}…` : value;
}

function buildPreviewRows(rows: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
	return rows.slice(0, PREVIEW_ROW_COUNT).map((row) => {
		const truncated: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(row)) {
			truncated[key] = truncateForPreview(value);
		}
		return truncated;
	});
}

export function createEvalDataAgentTool(context: OrchestrationContext) {
	return createTool({
		id: 'eval-data',
		description:
			'Populate an eval DataTable for a workflow that already has its eval setup wired. ' +
			'First scans the workflow execution history for real rows (these include real expected ' +
			'outputs); if fewer than 10 valid rows are available, generates synthetic rows with INPUT ' +
			'columns only — expected-output columns are left empty so the user can fill them in with ' +
			'the correct answers. We never auto-fill expected outputs with model-generated guesses, ' +
			'because that would measure self-consistency rather than correctness. ' +
			'Inserts at most 25 rows total. Synchronous — no sub-agent, no HITL.',
		inputSchema: evalDataInputSchema,
		outputSchema,
		execute: async (input: z.infer<typeof evalDataInputSchema>) => {
			const domain = context.domainContext;
			if (!domain) {
				return { status: 'skipped' as const, reason: 'Domain context unavailable.' };
			}

			const log = (level: 'info' | 'warn' | 'error', msg: string) => {
				domain.logger?.[level]?.(`[eval-data] ${msg}`);
			};
			const j = (v: unknown) => JSON.stringify(v);

			log('info', `start workflowId=${input.workflowId} projectId=${j(input.projectId)}`);

			const workflow = await domain.workflowService.getAsWorkflowJSON(input.workflowId);
			const reqs = analyzeEvalDataRequirements(workflow);
			const target = reqs.targets[0];
			if (!target) {
				log('warn', `skip:no-target reason=${j(reqs.reason)}`);
				return { status: 'skipped' as const, reason: reqs.reason ?? 'No eval target.' };
			}
			log(
				'info',
				`target dataTableId=${target.dataTableId} agent=${j(target.targetAgentNodeName)} inputColumns=${j(target.inputColumns)} expectedOutputColumns=${j(target.expectedOutputColumns)} pairs=${j(target.expectedToActualPairs)}`,
			);
			if (!target.targetAgentNodeName) {
				log('warn', 'skip:no-agent');
				return {
					status: 'skipped' as const,
					reason: 'No agent node reachable from EvaluationTrigger.',
				};
			}

			const { rows: historyRows } = await extractRowsFromExecutionHistory(domain, {
				workflow,
				workflowId: input.workflowId,
				agentNodeName: target.targetAgentNodeName,
				inputColumns: target.inputColumns,
				expectedToActualPairs: target.expectedToActualPairs,
			});
			log('info', `history-extracted count=${historyRows.length}`);

			let rowsToInsert: Array<Record<string, unknown>>;
			let source: 'history' | 'synthetic';

			if (historyRows.length >= HISTORY_THRESHOLD) {
				rowsToInsert = historyRows;
				source = 'history';
			} else {
				// Generate inputs only. Expected-output columns stay empty so the
				// user fills in the correct answers — generating both inputs and
				// expected outputs with the same model only measures the model's
				// self-consistency, not whether the workflow is doing the right
				// thing.
				//
				// Few-shot seed: when ANY history rows exist (just not enough to
				// hit the threshold), pass them to the generator as flavour
				// reference. The generator's prompt is explicit that they are
				// not seeds to paraphrase — the LLM uses them to pick up the
				// real domain, tone and shape of inputs and then produces new
				// ones in the same setting. Without this, generation runs blind
				// on the agent's static system prompt only, which for generic
				// prompts ("you are a helpful assistant") produces equally
				// generic inputs even when real traffic is highly domain-specific.
				rowsToInsert = await generateSampleRows({
					workflow,
					columns: target.inputColumns,
					rowCount: GENERATE_ROW_COUNT,
					...(historyRows.length > 0 ? { realExamples: historyRows } : {}),
				});
				source = 'synthetic';
			}
			log(
				'info',
				`rows-prepared source=${source} count=${rowsToInsert.length} firstRowKeys=${j(rowsToInsert[0] ? Object.keys(rowsToInsert[0]) : [])}`,
			);

			const dataTableOptions = input.projectId ? { projectId: input.projectId } : undefined;

			// On the synthetic path we leave expected-output columns empty, so the
			// rows never reference them. Still make sure those columns exist in
			// the table so the user has somewhere to type the correct answer.
			const extraColumns = source === 'synthetic' ? target.expectedOutputColumns : [];

			try {
				await ensureColumnsExist(
					domain.dataTableService,
					target.dataTableId,
					rowsToInsert,
					extraColumns,
					dataTableOptions,
				);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				log('error', `ensureColumnsExist-failed error=${j(message)}`);
				throw error;
			}

			let insertResult: Awaited<ReturnType<typeof domain.dataTableService.insertRows>>;
			try {
				insertResult = await domain.dataTableService.insertRows(
					target.dataTableId,
					rowsToInsert,
					dataTableOptions,
				);
				log('info', `insertRows-ok result=${j(insertResult)}`);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				log('error', `insertRows-failed error=${j(message)}`);
				throw error;
			}

			// Fetch a tiny preview so the agent can recap WHAT was generated, not
			// just that something was. Treat failures here as non-fatal — the
			// insert already succeeded; a missing preview is a UX gap, not a bug.
			let previewRows: Array<Record<string, unknown>> = [];
			try {
				const preview = await domain.dataTableService.queryRows(target.dataTableId, {
					limit: PREVIEW_ROW_COUNT,
					...(insertResult.projectId ? { projectId: insertResult.projectId } : {}),
				});
				previewRows = buildPreviewRows(preview.data);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				log('warn', `preview-query-failed error=${j(message)}`);
			}

			log('info', `done source=${source} rowCount=${rowsToInsert.length}`);
			const needsReview = source === 'synthetic' && target.expectedOutputColumns.length > 0;
			const table = {
				id: target.dataTableId,
				name: insertResult.tableName,
				...(insertResult.projectId ? { projectId: insertResult.projectId } : {}),
				rowCount: rowsToInsert.length,
				inputColumns: target.inputColumns,
				expectedOutputColumns: target.expectedOutputColumns,
				previewRows,
			};
			return {
				status: source === 'history' ? ('imported' as const) : ('generated' as const),
				rowCount: rowsToInsert.length,
				source,
				...(needsReview
					? {
							expectedOutputsNeedUserReview: true as const,
							expectedOutputColumns: target.expectedOutputColumns,
						}
					: {}),
				table,
			};
		},
	});
}
