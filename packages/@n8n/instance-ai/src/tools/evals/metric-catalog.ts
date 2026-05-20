import type { WorkflowJSON } from '@n8n/workflow-sdk';

export const DEFAULT_EXPECTED_OUTPUT_COLUMN = 'expected_output';
export const EXPECTED_TOOLS_COLUMN = 'expected_tools';
export const DEFAULT_ACTUAL_OUTPUT_COLUMN = 'actual_output';

export const METRIC_IDS = ['correctness', 'tool_use', 'helpfulness'] as const;
export type MetricId = (typeof METRIC_IDS)[number];
export type EvaluationNodeMetric = 'correctness' | 'toolsUsed' | 'helpfulness';

export interface MetricProposal {
	id: string;
	name: string;
	kind: string;
	cannedMetricKey?: string;
	description: string;
	prompt?: string;
	defaultEnabled: boolean;
}

export interface MetricCatalogEntry extends MetricProposal {
	id: MetricId;
	kind: 'llm-judge' | 'built-in';
	cannedMetricKey: MetricId;
	evaluationMetric: EvaluationNodeMetric;
	datasetColumns: readonly string[];
	needsModelConnection: boolean;
}

export const METRIC_CATALOG = {
	correctness: {
		id: 'correctness',
		name: 'Correctness',
		kind: 'llm-judge',
		cannedMetricKey: 'correctness',
		description: 'Judge whether the workflow output matches the expected ground-truth response.',
		prompt:
			'Given the input and expected output, rate from 0 to 1 how correct the actual output is.',
		defaultEnabled: true,
		evaluationMetric: 'correctness',
		datasetColumns: [DEFAULT_EXPECTED_OUTPUT_COLUMN],
		needsModelConnection: true,
	},
	tool_use: {
		id: 'tool_use',
		name: 'Tool use',
		kind: 'built-in',
		cannedMetricKey: 'tool_use',
		description: 'Judge whether the agent selected and used the correct tools for the input.',
		defaultEnabled: false,
		evaluationMetric: 'toolsUsed',
		datasetColumns: [EXPECTED_TOOLS_COLUMN],
		needsModelConnection: false,
	},
	helpfulness: {
		id: 'helpfulness',
		name: 'Helpfulness',
		kind: 'llm-judge',
		cannedMetricKey: 'helpfulness',
		description: 'Judge whether the agent response is helpful to the user.',
		prompt: 'Rate from 0 to 1 how helpful the response is to the user query.',
		defaultEnabled: false,
		evaluationMetric: 'helpfulness',
		datasetColumns: [],
		needsModelConnection: true,
	},
} satisfies Record<MetricId, MetricCatalogEntry>;

function isMetricId(id: string): id is MetricId {
	return (METRIC_IDS as readonly string[]).includes(id);
}

export function getMetricsByIds(ids: string[]): MetricCatalogEntry[] {
	return ids.filter(isMetricId).map((id) => METRIC_CATALOG[id]);
}

export function getMetricDatasetColumns(metrics: MetricCatalogEntry[]): string[] {
	const columns = new Set<string>();
	for (const metric of metrics) {
		for (const column of metric.datasetColumns) {
			columns.add(column);
		}
	}
	return [...columns];
}

export function proposeDefaultMetricIds(
	_workflow: WorkflowJSON,
	_agentNodeName: string,
): MetricId[] {
	return ['correctness'];
}
