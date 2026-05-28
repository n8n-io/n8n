import type { TestRunRecord } from './evaluation.api';
import { type IconName } from '@n8n/design-system/components/N8nIcon/icons';
import type { IconColor } from '@n8n/design-system/types/icon';

import type { BaseTextKey } from '@n8n/i18n';
import type { MetricCategory } from './evaluation.utils';

// "AI root nodes" — langchain nodes that produce a final output worth
// evaluating. Sub-nodes (memory, tools, embeddings) are intentionally
// excluded: evaluating them in isolation makes no sense since their output
// is consumed by the root node, not by the workflow's terminal.
// Keep in sync with packages/@n8n/nodes-langchain/nodes/{agents,chains,vendors}/.
export const AI_ROOT_NODE_TYPES: readonly string[] = [
	'@n8n/n8n-nodes-langchain.agent',
	'@n8n/n8n-nodes-langchain.openAiAssistant',
	'@n8n/n8n-nodes-langchain.chainLlm',
	'@n8n/n8n-nodes-langchain.chainRetrievalQa',
	'@n8n/n8n-nodes-langchain.chainSummarization',
	'@n8n/n8n-nodes-langchain.informationExtractor',
	'@n8n/n8n-nodes-langchain.sentimentAnalysis',
	'@n8n/n8n-nodes-langchain.textClassifier',
	'@n8n/n8n-nodes-langchain.openAi',
	'@n8n/n8n-nodes-langchain.anthropic',
	'@n8n/n8n-nodes-langchain.googleGemini',
	'@n8n/n8n-nodes-langchain.ollama',
	'@n8n/n8n-nodes-langchain.alibabaCloud',
	'@n8n/n8n-nodes-langchain.miniMax',
	'@n8n/n8n-nodes-langchain.moonshot',
] as const;

const AI_ROOT_NODE_TYPE_SET = new Set<string>(AI_ROOT_NODE_TYPES);

export function isAiRootNodeType(type: string | undefined): boolean {
	return Boolean(type && AI_ROOT_NODE_TYPE_SET.has(type));
}

// Canned metric definitions surfaced by the Set Metrics operation of the
// Evaluation node. Keep this list in sync with
// `packages/nodes-base/nodes/Evaluation/Evaluation/Description.node.ts`.
export type CannedMetricKey =
	| 'correctness'
	| 'helpfulness'
	| 'stringSimilarity'
	| 'categorization'
	| 'toolsUsed';

export type CannedMetric = {
	key: CannedMetricKey;
	labelKey: BaseTextKey;
	descriptionKey: BaseTextKey;
	category: MetricCategory;
	icon: IconName;
	// Figma scorer cards use one tinted tile per metric. Background uses *-100,
	// icon uses *-800 from the same colour family.
	tileBg: string;
	tileFg: string;
};

// Subset of canned metrics that resolve to an `llm_judge` metric in the
// EvaluationConfig DTO. These require a per-metric provider/credential/model
// pick from the user; the others are computed without an LLM.
export const LLM_JUDGE_METRIC_KEYS = new Set<CannedMetricKey>(['correctness', 'helpfulness']);

// Maps a metric to the column on the dataset row that holds its ground-truth
// value. The Set Metrics operation reads these by *name* (expectedAnswer,
// expectedTools), so the dataset column name we create must match exactly.
// helpfulness has no entry — it scores the response without ground truth.
// Multiple metrics can share a column (correctness/stringSimilarity/categorization
// all read expectedAnswer), so the wizard dedupes by `name` when rendering.
export type ExpectedField = {
	name: string;
	labelKey: BaseTextKey;
};

export const CANNED_METRIC_EXPECTED_FIELDS: Partial<Record<CannedMetricKey, ExpectedField>> = {
	correctness: {
		name: 'expectedAnswer',
		labelKey: 'evaluations.wizardSidepanel.step2.expectedAnswer',
	},
	stringSimilarity: {
		name: 'expectedAnswer',
		labelKey: 'evaluations.wizardSidepanel.step2.expectedAnswer',
	},
	categorization: {
		name: 'expectedAnswer',
		labelKey: 'evaluations.wizardSidepanel.step2.expectedAnswer',
	},
	toolsUsed: { name: 'expectedTools', labelKey: 'evaluations.wizardSidepanel.step2.expectedTools' },
};

export function getExpectedFieldsForMetrics(
	selectedMetricKeys: readonly CannedMetricKey[],
): ExpectedField[] {
	const seen = new Set<string>();
	const fields: ExpectedField[] = [];
	for (const key of selectedMetricKeys) {
		const field = CANNED_METRIC_EXPECTED_FIELDS[key];
		if (!field || seen.has(field.name)) continue;
		seen.add(field.name);
		fields.push(field);
	}
	return fields;
}

export const CANNED_METRICS: readonly CannedMetric[] = [
	{
		key: 'correctness',
		labelKey: 'evaluations.wizardSidepanel.metric.correctness.label',
		descriptionKey: 'evaluations.wizardSidepanel.metric.correctness.description',
		category: 'aiBased',
		icon: 'badge-check',
		tileBg: 'var(--color--green--tint-3, #e9f7ef)',
		tileFg: 'var(--color--green--shade-1, #1a8d4a)',
	},
	{
		key: 'helpfulness',
		labelKey: 'evaluations.wizardSidepanel.metric.helpfulness.label',
		descriptionKey: 'evaluations.wizardSidepanel.metric.helpfulness.description',
		category: 'aiBased',
		icon: 'thumbs-up',
		tileBg: 'var(--color--blue--tint-3, #e6f1fb)',
		tileFg: 'var(--color--blue--shade-1, #1a73e8)',
	},
	{
		key: 'stringSimilarity',
		labelKey: 'evaluations.wizardSidepanel.metric.stringSimilarity.label',
		descriptionKey: 'evaluations.wizardSidepanel.metric.stringSimilarity.description',
		category: 'stringSimilarity',
		icon: 'case-upper',
		tileBg: 'var(--color--purple--tint-3, #f0eafb)',
		tileFg: 'var(--color--purple--shade-1, #6b3fc4)',
	},
	{
		key: 'categorization',
		labelKey: 'evaluations.wizardSidepanel.metric.categorization.label',
		descriptionKey: 'evaluations.wizardSidepanel.metric.categorization.description',
		category: 'categorization',
		icon: 'tags',
		tileBg: 'var(--color--yellow--tint-3, #fdf3df)',
		tileFg: 'var(--color--yellow--shade-1, #c98a04)',
	},
	{
		key: 'toolsUsed',
		labelKey: 'evaluations.wizardSidepanel.metric.toolsUsed.label',
		descriptionKey: 'evaluations.wizardSidepanel.metric.toolsUsed.description',
		category: 'toolsUsed',
		icon: 'wrench',
		tileBg: 'var(--color--teal--tint-3, #e0f5f2)',
		tileFg: 'var(--color--teal--shade-1, #128172)',
	},
] as const;

const TEST_CASE_EXECUTION_ERROR_CODE = {
	MOCKED_NODE_NOT_FOUND: 'MOCKED_NODE_NOT_FOUND',
	FAILED_TO_EXECUTE_WORKFLOW: 'FAILED_TO_EXECUTE_WORKFLOW',
	INVALID_METRICS: 'INVALID_METRICS',
	UNKNOWN_ERROR: 'UNKNOWN_ERROR',
	NO_METRICS_COLLECTED: 'NO_METRICS_COLLECTED',
} as const;

export type TestCaseExecutionErrorCodes =
	(typeof TEST_CASE_EXECUTION_ERROR_CODE)[keyof typeof TEST_CASE_EXECUTION_ERROR_CODE];

const TEST_RUN_ERROR_CODES = {
	TEST_CASES_NOT_FOUND: 'TEST_CASES_NOT_FOUND',
	INTERRUPTED: 'INTERRUPTED',
	UNKNOWN_ERROR: 'UNKNOWN_ERROR',
	EVALUATION_TRIGGER_NOT_FOUND: 'EVALUATION_TRIGGER_NOT_FOUND',
	EVALUATION_TRIGGER_NOT_CONFIGURED: 'EVALUATION_TRIGGER_NOT_CONFIGURED',
	EVALUATION_TRIGGER_DISABLED: 'EVALUATION_TRIGGER_DISABLED',
	EVALUATION_CONFIG_NOT_FOUND: 'EVALUATION_CONFIG_NOT_FOUND',
	SET_OUTPUTS_NODE_NOT_CONFIGURED: 'SET_OUTPUTS_NODE_NOT_CONFIGURED',
	SET_METRICS_NODE_NOT_FOUND: 'SET_METRICS_NODE_NOT_FOUND',
	SET_METRICS_NODE_NOT_CONFIGURED: 'SET_METRICS_NODE_NOT_CONFIGURED',
	CANT_FETCH_TEST_CASES: 'CANT_FETCH_TEST_CASES',
	PARTIAL_CASES_FAILED: 'PARTIAL_CASES_FAILED',
} as const;

export type TestRunErrorCode = (typeof TEST_RUN_ERROR_CODES)[keyof typeof TEST_RUN_ERROR_CODES];
const testCaseErrorDictionary: Partial<Record<TestCaseExecutionErrorCodes, BaseTextKey>> = {
	MOCKED_NODE_NOT_FOUND: 'evaluation.runDetail.error.mockedNodeMissing',
	FAILED_TO_EXECUTE_WORKFLOW: 'evaluation.runDetail.error.executionFailed',
	INVALID_METRICS: 'evaluation.runDetail.error.invalidMetrics',
	UNKNOWN_ERROR: 'evaluation.runDetail.error.unknownError',
	NO_METRICS_COLLECTED: 'evaluation.runDetail.error.noMetricsCollected',
} as const;

const testRunErrorDictionary: Partial<Record<TestRunErrorCode, BaseTextKey>> = {
	TEST_CASES_NOT_FOUND: 'evaluation.listRuns.error.testCasesNotFound',
	INTERRUPTED: 'evaluation.listRuns.error.executionInterrupted',
	UNKNOWN_ERROR: 'evaluation.listRuns.error.unknownError',
	EVALUATION_TRIGGER_NOT_FOUND: 'evaluation.listRuns.error.evaluationTriggerNotFound',
	EVALUATION_TRIGGER_NOT_CONFIGURED: 'evaluation.listRuns.error.evaluationTriggerNotConfigured',
	EVALUATION_TRIGGER_DISABLED: 'evaluation.listRuns.error.evaluationTriggerDisabled',
	EVALUATION_CONFIG_NOT_FOUND: 'evaluation.listRuns.error.evaluationConfigNotFound',
	SET_OUTPUTS_NODE_NOT_CONFIGURED: 'evaluation.listRuns.error.setOutputsNodeNotConfigured',
	SET_METRICS_NODE_NOT_FOUND: 'evaluation.listRuns.error.setMetricsNodeNotFound',
	SET_METRICS_NODE_NOT_CONFIGURED: 'evaluation.listRuns.error.setMetricsNodeNotConfigured',
	CANT_FETCH_TEST_CASES: 'evaluation.listRuns.error.cantFetchTestCases',
	PARTIAL_CASES_FAILED: 'evaluation.runDetail.error.partialCasesFailed',
} as const;

export const getErrorBaseKey = (errorCode?: string): string => {
	return (
		testCaseErrorDictionary[errorCode as TestCaseExecutionErrorCodes] ??
		testRunErrorDictionary[errorCode as TestRunErrorCode] ??
		''
	);
};

export const statusDictionary: Record<
	TestRunRecord['status'],
	{ icon: IconName; color: IconColor }
> = {
	new: {
		icon: 'status-new',
		color: 'foreground-xdark',
	},
	running: {
		icon: 'spinner',
		color: 'secondary',
	},
	completed: {
		icon: 'status-completed',
		color: 'success',
	},
	error: {
		icon: 'triangle-alert',
		color: 'danger',
	},
	cancelled: {
		icon: 'status-canceled',
		color: 'foreground-xdark',
	},
	warning: {
		icon: 'status-warning',
		color: 'warning',
	},
	success: {
		icon: 'status-completed',
		color: 'success',
	},
};
