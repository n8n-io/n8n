import { z } from 'zod';

import type { WorkflowResponse } from '../clients/n8n-client';

export type JsonObject = Record<string, unknown>;
export type DatasetRow = Record<string, string | number | boolean | null>;

export const DATA_TABLE_COLUMN_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/;
export const DATA_TABLE_COLUMN_NAME_MAX_LENGTH = 63;

const dataTableColumnNameSchema = z
	.string()
	.regex(DATA_TABLE_COLUMN_NAME_PATTERN)
	.max(DATA_TABLE_COLUMN_NAME_MAX_LENGTH);

const datasetCellValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const datasetRowSchema = z.record(dataTableColumnNameSchema, datasetCellValueSchema);
export const datasetRowsSchema = z.array(datasetRowSchema).nonempty();
export const expectedShapeSchema = z.record(z.string(), dataTableColumnNameSchema);

const metricSchema = z.enum([
	'correctness',
	'helpfulness',
	'stringSimilarity',
	'categorization',
	'toolsUsed',
	'customMetrics',
]);

export const topologyTargetExpectationSchema = z.object({
	nodeName: z.string(),
	mode: z.enum(['required', 'optional']).default('required'),
	inputColumns: z.array(dataTableColumnNameSchema).default([]),
	expectedShape: expectedShapeSchema.optional(),
	expectedOutputColumns: z.array(dataTableColumnNameSchema).default([]),
	actualOutputColumns: z.array(dataTableColumnNameSchema).default([]),
	sideEffectNodes: z.array(z.string()).default([]),
});

export const topologySidecarSchema = z.object({
	targets: z.array(topologyTargetExpectationSchema).default([]),
	excludeTargets: z.array(z.string()).default([]),
	metrics: z.array(metricSchema).default(['correctness']),
	allowNativeTestRunnerSmoke: z.boolean().default(false),
});

export type TopologyTargetExpectation = z.infer<typeof topologyTargetExpectationSchema>;
export type TopologySidecar = z.infer<typeof topologySidecarSchema>;

export interface EvalSetupTopologyCase {
	slug: string;
	workflowPath: string;
	datasetPath: string;
	sidecarPath?: string;
	workflow: WorkflowResponse;
	datasetRows: DatasetRow[];
	datasetColumns: string[];
	sidecar: TopologySidecar;
}

export interface TopologyFinding {
	severity: 'error' | 'warning';
	code: string;
	message: string;
	nodeName?: string;
}

export interface TopologyTargetResult {
	nodeName: string;
	passed: boolean;
	findings: TopologyFinding[];
}

export interface TopologyVerifierInput {
	originalWorkflow: WorkflowResponse;
	updatedWorkflow: WorkflowResponse;
	datasetColumns: string[];
	sidecar: TopologySidecar;
	expectedDataTableId?: string;
}

export interface TopologyVerifierResult {
	passed: boolean;
	findings: TopologyFinding[];
	targetResults: TopologyTargetResult[];
	targetNodeNames: string[];
}

export interface ToolSelectionResult {
	evalsToolCalled: boolean;
	evalSetupAgentCalled: boolean;
	findings: TopologyFinding[];
}

export interface EvalSetupTopologyCaseResult {
	caseSlug: string;
	workflowId?: string;
	dataTableId?: string;
	toolSelection: ToolSelectionResult;
	topology: TopologyVerifierResult;
	passed: boolean;
	error?: string;
}

export interface EvalSetupTopologyRunResult {
	passed: boolean;
	results: EvalSetupTopologyCaseResult[];
}

const workflowConnectionSchema = z.object({
	node: z.string(),
	type: z.string(),
	index: z.number(),
});

const workflowConnectionsSchema = z.record(
	z.string(),
	z.record(z.string(), z.array(z.union([z.array(workflowConnectionSchema), z.null()])).optional()),
);

export type WorkflowConnection = z.infer<typeof workflowConnectionSchema>;
export type WorkflowConnections = Record<
	string,
	Record<string, Array<WorkflowConnection[] | null> | undefined>
>;

export function toWorkflowConnections(
	connections: WorkflowResponse['connections'],
): WorkflowConnections {
	return workflowConnectionsSchema.parse(connections);
}
