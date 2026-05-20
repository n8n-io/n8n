import { analyzeEvalDataRequirements } from './eval-data-requirements.service';
import { extractRowsFromExecutionHistory } from './extract-rows-from-history.service';
import { generateSampleRows } from './generate-sample-rows.service';
import type { InstanceAiContext, InstanceAiDataTableService } from '../../types';

const HISTORY_THRESHOLD = 10;
const GENERATE_ROW_COUNT = 10;
const PREVIEW_ROW_COUNT = 3;
const PREVIEW_VALUE_MAX_LEN = 80;

export interface PopulateEvalDataTableInput {
	workflowId: string;
	projectId?: string;
	targetAgentNodeName?: string;
}

export interface PopulatedEvalDataTableSummary {
	id: string;
	name: string;
	projectId?: string;
	rowCount: number;
	inputColumns: string[];
	expectedOutputColumns: string[];
	previewRows: Array<Record<string, unknown>>;
}

export interface PopulateEvalDataTableResult {
	status: 'imported' | 'generated' | 'skipped';
	rowCount?: number;
	source?: 'history' | 'synthetic';
	reason?: string;
	expectedOutputsNeedUserReview?: boolean;
	expectedOutputColumns?: string[];
	table?: PopulatedEvalDataTableSummary;
}

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

export async function populateEvalDataTable(
	context: InstanceAiContext,
	input: PopulateEvalDataTableInput,
): Promise<PopulateEvalDataTableResult> {
	const log = (level: 'info' | 'warn' | 'error', msg: string) => {
		context.logger?.[level]?.(`[eval-data] ${msg}`);
	};
	const j = (v: unknown) => JSON.stringify(v);

	log('info', `start workflowId=${input.workflowId} projectId=${j(input.projectId)}`);

	const workflow = await context.workflowService.getAsWorkflowJSON(input.workflowId);
	const reqs = analyzeEvalDataRequirements(workflow, input.targetAgentNodeName);
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

	const { rows: historyRows } = await extractRowsFromExecutionHistory(context, {
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
			columns: target.inputColumns,
			rowCount: GENERATE_ROW_COUNT,
			targetAgentNodeName: target.targetAgentNodeName,
			...(historyRows.length > 0 ? { realExamples: historyRows } : {}),
		});
		source = 'synthetic';
	}
	log(
		'info',
		`rows-prepared source=${source} count=${rowsToInsert.length} firstRowKeys=${j(rowsToInsert[0] ? Object.keys(rowsToInsert[0]) : [])}`,
	);

	const dataTableOptions = input.projectId ? { projectId: input.projectId } : undefined;
	const extraColumns = source === 'synthetic' ? target.expectedOutputColumns : [];

	try {
		await ensureColumnsExist(
			context.dataTableService,
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

	let insertResult: Awaited<ReturnType<typeof context.dataTableService.insertRows>>;
	try {
		insertResult = await context.dataTableService.insertRows(
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

	let previewRows: Array<Record<string, unknown>> = [];
	try {
		const preview = await context.dataTableService.queryRows(target.dataTableId, {
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
}
