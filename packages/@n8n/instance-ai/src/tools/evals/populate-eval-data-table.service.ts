import {
	analyzeEvalDataRequirements,
	resolveEvalDataTarget,
} from './eval-data-requirements.service';
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
	const referencedColumns = new Set([...extraColumns, ...rows.flatMap((row) => Object.keys(row))]);
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
	return rows
		.slice(0, PREVIEW_ROW_COUNT)
		.map((row) =>
			Object.fromEntries(
				Object.entries(row).map(([key, value]) => [key, truncateForPreview(value)]),
			),
		);
}

function withEmptyExpectedOutputColumns(
	rows: Array<Record<string, unknown>>,
	expectedOutputColumns: readonly string[],
): Array<Record<string, unknown>> {
	if (expectedOutputColumns.length === 0) return rows;
	return rows.map((row) => ({
		...row,
		...Object.fromEntries(expectedOutputColumns.map((column) => [column, ''])),
	}));
}

export async function populateEvalDataTable(
	context: InstanceAiContext,
	input: PopulateEvalDataTableInput,
): Promise<PopulateEvalDataTableResult> {
	const workflow = await context.workflowService.getAsWorkflowJSON(input.workflowId);
	const reqs = analyzeEvalDataRequirements(workflow, input.targetAgentNodeName);
	const target = resolveEvalDataTarget(reqs, input.targetAgentNodeName);
	if (!target) {
		return {
			status: 'skipped' as const,
			reason:
				reqs.reason ??
				(input.targetAgentNodeName
					? `No eval target for AI node "${input.targetAgentNodeName}".`
					: 'No eval target.'),
		};
	}

	const targetAiNodeName = target.targetAgentNodeName ?? target.targetNodeName;
	if (!targetAiNodeName) {
		return {
			status: 'skipped' as const,
			reason: 'No AI target node reachable from EvaluationTrigger.',
		};
	}

	const { rows: historyRows } = await extractRowsFromExecutionHistory(context, {
		workflow,
		workflowId: input.workflowId,
		agentNodeName: targetAiNodeName,
		inputColumns: target.inputColumns,
		expectedToActualPairs: target.expectedToActualPairs,
	});

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
			targetAgentNodeName: targetAiNodeName,
			...(historyRows.length > 0 ? { realExamples: historyRows } : {}),
			...(context.logger ? { logger: context.logger } : {}),
		});
		rowsToInsert = withEmptyExpectedOutputColumns(rowsToInsert, target.expectedOutputColumns);
		source = 'synthetic';
	}

	const dataTableOptions = input.projectId ? { projectId: input.projectId } : undefined;
	const extraColumns = source === 'synthetic' ? target.expectedOutputColumns : [];
	await ensureColumnsExist(
		context.dataTableService,
		target.dataTableId,
		rowsToInsert,
		extraColumns,
		dataTableOptions,
	);
	const insertResult = await context.dataTableService.insertRows(
		target.dataTableId,
		rowsToInsert,
		dataTableOptions,
	);

	let previewRows: Array<Record<string, unknown>>;
	try {
		const preview = await context.dataTableService.queryRows(target.dataTableId, {
			limit: PREVIEW_ROW_COUNT,
			...(insertResult.projectId ? { projectId: insertResult.projectId } : {}),
		});
		previewRows = buildPreviewRows(preview.data);
	} catch {
		previewRows = [];
	}

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
