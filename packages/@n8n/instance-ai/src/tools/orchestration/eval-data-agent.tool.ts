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
	options: { projectId?: string } | undefined,
): Promise<void> {
	const referencedColumns = new Set<string>();
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

const outputSchema = z.object({
	status: z.enum(['imported', 'generated', 'skipped']),
	rowCount: z.number().optional(),
	source: z.enum(['history', 'synthetic']).optional(),
	reason: z.string().optional(),
});

export function createEvalDataAgentTool(context: OrchestrationContext) {
	return createTool({
		id: 'eval-data',
		description:
			'Populate an eval DataTable for a workflow that already has its eval setup wired. ' +
			'First scans the workflow execution history for real rows; if fewer than 10 valid rows ' +
			'are available, generates 10 synthetic rows instead. Inserts at most 25 rows total. ' +
			'Synchronous — no sub-agent, no HITL.',
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
				rowsToInsert = await generateSampleRows({
					workflow,
					columns: [...target.inputColumns, ...target.expectedOutputColumns],
					rowCount: GENERATE_ROW_COUNT,
				});
				source = 'synthetic';
			}
			log(
				'info',
				`rows-prepared source=${source} count=${rowsToInsert.length} firstRowKeys=${j(rowsToInsert[0] ? Object.keys(rowsToInsert[0]) : [])}`,
			);

			const dataTableOptions = input.projectId ? { projectId: input.projectId } : undefined;

			try {
				await ensureColumnsExist(
					domain.dataTableService,
					target.dataTableId,
					rowsToInsert,
					dataTableOptions,
				);
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				log('error', `ensureColumnsExist-failed error=${j(message)}`);
				throw err;
			}

			try {
				const result = await domain.dataTableService.insertRows(
					target.dataTableId,
					rowsToInsert,
					dataTableOptions,
				);
				log('info', `insertRows-ok result=${j(result)}`);
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				log('error', `insertRows-failed error=${j(message)}`);
				throw err;
			}

			log('info', `done source=${source} rowCount=${rowsToInsert.length}`);
			return {
				status: source === 'history' ? ('imported' as const) : ('generated' as const),
				rowCount: rowsToInsert.length,
				source,
			};
		},
	});
}
