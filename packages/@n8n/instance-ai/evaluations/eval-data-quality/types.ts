import { z } from 'zod';

import type { DataTableRowOutput, WorkflowResponse } from '../clients/n8n-client';

export const DATA_TABLE_COLUMN_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/;
export const DATA_TABLE_COLUMN_NAME_MAX_LENGTH = 63;

const dataTableColumnNameSchema = z
	.string()
	.regex(DATA_TABLE_COLUMN_NAME_PATTERN)
	.max(DATA_TABLE_COLUMN_NAME_MAX_LENGTH);

const dataTableColumnTypeSchema = z.enum(['string', 'number', 'boolean', 'date']);

export const datasetColumnSchema = z.object({
	name: dataTableColumnNameSchema,
	type: dataTableColumnTypeSchema,
});
export type DatasetColumn = z.infer<typeof datasetColumnSchema>;

const semanticCriterionSchema = z.object({
	column: dataTableColumnNameSchema,
	criterion: z
		.string()
		.min(1)
		.describe('Plain-language requirement evaluated by the LLM judge for every row in the column.'),
	allowEmpty: z
		.boolean()
		.default(false)
		.describe('When true, empty cell values are not penalised and not sent to the judge.'),
});
export type SemanticCriterion = z.infer<typeof semanticCriterionSchema>;

export const datasetSidecarSchema = z.object({
	requestedRowCount: z
		.number()
		.int()
		.positive()
		.default(25)
		.describe('Row count to request from the eval-data tool. Mirrors the user-facing default.'),
	minRowCount: z
		.number()
		.int()
		.positive()
		.describe('Minimum number of rows the generated dataset must contain.'),
	columns: z
		.array(datasetColumnSchema)
		.nonempty()
		.describe('Columns the empty DataTable is created with — must match the workflow eval shape.'),
	inputColumns: z
		.array(dataTableColumnNameSchema)
		.nonempty()
		.describe('Columns the agent must populate. Empty cells in these columns are findings.'),
	expectedOutputColumns: z
		.array(dataTableColumnNameSchema)
		.default([])
		.describe('Columns that should also be populated when the workflow declares them.'),
	actualOutputColumns: z
		.array(dataTableColumnNameSchema)
		.default([])
		.describe(
			'Columns that must remain empty — populated only by eval runs, never by data generation.',
		),
	dataTableNodeName: z
		.string()
		.optional()
		.describe(
			'Name of the workflow node whose `dataTableId` parameter should be rewritten with the runtime DataTable id.',
		),
	targetAgentNodeName: z
		.string()
		.optional()
		.describe('Forwarded to the eval-data tool when the workflow has multiple AI agents.'),
	semanticCriteria: z
		.array(semanticCriterionSchema)
		.default([])
		.describe('LLM-judge criteria; one entry per column to assess.'),
});
export type DatasetSidecar = z.infer<typeof datasetSidecarSchema>;

export interface EvalDataQualityCase {
	slug: string;
	workflowPath: string;
	sidecarPath: string;
	workflow: WorkflowResponse;
	sidecar: DatasetSidecar;
}

export interface DatasetFinding {
	severity: 'error' | 'warning';
	code: string;
	message: string;
	column?: string;
	rowIndex?: number;
}

export interface DatasetVerifierInput {
	rows: DataTableRowOutput[];
	dataTableColumns: Array<{ name: string; type: string }>;
	sidecar: DatasetSidecar;
	requestedRowCount: number;
}

export interface SemanticJudgeFn {
	(input: {
		column: string;
		criterion: string;
		samples: Array<{ rowIndex: number; value: unknown }>;
	}): Promise<{
		failures: Array<{ rowIndex: number; reason: string }>;
	}>;
}

export interface DatasetVerifierOptions {
	judge?: SemanticJudgeFn;
}

export interface DatasetVerifierResult {
	passed: boolean;
	findings: DatasetFinding[];
	rowCount: number;
}

export interface ToolSelectionResult {
	evalDataToolCalled: boolean;
	findings: DatasetFinding[];
}

export interface EvalDataQualityCaseResult {
	caseSlug: string;
	workflowId?: string;
	dataTableId?: string;
	toolSelection: ToolSelectionResult;
	dataset: DatasetVerifierResult;
	passed: boolean;
	error?: string;
}

export interface EvalDataQualityRunResult {
	passed: boolean;
	results: EvalDataQualityCaseResult[];
}
