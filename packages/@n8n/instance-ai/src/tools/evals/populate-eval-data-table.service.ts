import {
	analyzeEvalDataRequirements,
	resolveEvalDataTarget,
} from './eval-data-requirements.service';
import { extractRowsFromExecutionHistory } from './extract-rows-from-history.service';
import { generateSampleRows } from './generate-sample-rows.service';
import type { Logger } from '../../logger';
import type { InstanceAiContext, InstanceAiDataTableService } from '../../types';

const HISTORY_THRESHOLD = 10;
const GENERATE_ROW_COUNT = 10;
const PREVIEW_ROW_COUNT = 3;

type PopulateEvalDataTableInput = {
	workflowId: string;
	projectId?: string;
	targetAgentNodeName?: string;
};

type ScopedLog = (
	level: 'info' | 'warn' | 'error',
	message: string,
	meta?: Record<string, unknown>,
) => void;

function createScopedLog(logger: Logger | undefined): ScopedLog {
	return (level, message, meta) => {
		logger?.[level]?.(`[populate-eval-data-table] ${message}`, meta);
	};
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
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
	return value.length > 80 ? `${value.slice(0, 80)}…` : value;
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
	return rows.map((row) => ({
		...row,
		...Object.fromEntries(expectedOutputColumns.map((column) => [column, ''])),
	}));
}

export async function populateEvalDataTable(
	context: InstanceAiContext,
	input: PopulateEvalDataTableInput,
) {
	const log = createScopedLog(context.logger);
	log('info', 'start', {
		workflowId: input.workflowId,
		projectId: input.projectId,
		targetAgentNodeName: input.targetAgentNodeName,
	});

	const workflow = await context.workflowService.getAsWorkflowJSON(input.workflowId);
	const reqs = analyzeEvalDataRequirements(workflow, input.targetAgentNodeName);
	const target = resolveEvalDataTarget(reqs, input.targetAgentNodeName);
	if (!target) {
		log('warn', 'skip:no-target', { reason: reqs.reason });
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
		log('warn', 'skip:no-agent');
		return {
			status: 'skipped' as const,
			reason: 'No AI target node reachable from EvaluationTrigger.',
		};
	}

	log('info', 'target-resolved', {
		dataTableId: target.dataTableId,
		targetAiNodeName,
		inputColumns: target.inputColumns,
		expectedOutputColumns: target.expectedOutputColumns,
		expectedToActualPairs: target.expectedToActualPairs,
	});

	const { rows: historyRows } = await extractRowsFromExecutionHistory(context, {
		workflow,
		workflowId: input.workflowId,
		agentNodeName: targetAiNodeName,
		inputColumns: target.inputColumns,
		expectedToActualPairs: target.expectedToActualPairs,
	});
	log('info', 'history-extracted', { count: historyRows.length });

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
	log('info', 'rows-prepared', {
		source,
		count: rowsToInsert.length,
		firstRowKeys: rowsToInsert[0] ? Object.keys(rowsToInsert[0]) : [],
	});

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
		log('error', 'ensureColumnsExist-failed', { error: errorMessage(error) });
		throw error;
	}

	let insertResult: Awaited<ReturnType<typeof context.dataTableService.insertRows>>;
	try {
		insertResult = await context.dataTableService.insertRows(
			target.dataTableId,
			rowsToInsert,
			dataTableOptions,
		);
		log('info', 'insertRows-ok', {
			insertedCount: insertResult.insertedCount,
			dataTableId: insertResult.dataTableId,
		});
	} catch (error) {
		log('error', 'insertRows-failed', { error: errorMessage(error) });
		throw error;
	}

	let previewRows: Array<Record<string, unknown>>;
	try {
		const preview = await context.dataTableService.queryRows(target.dataTableId, {
			limit: PREVIEW_ROW_COUNT,
			...(insertResult.projectId ? { projectId: insertResult.projectId } : {}),
		});
		previewRows = buildPreviewRows(preview.data);
	} catch (error) {
		log('warn', 'preview-query-failed', { error: errorMessage(error) });
		previewRows = [];
	}

	log('info', 'done', { source, rowCount: rowsToInsert.length });

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
