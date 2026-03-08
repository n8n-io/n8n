import { writeFileSync } from 'node:fs';

import type { ExampleResult, Feedback } from './harness-types';

/**
 * Fixed columns that appear first in the CSV (in order).
 */
const FIXED_COLUMNS = [
	'prompt',
	'overall_score',
	'status',
	'gen_latency_ms',
	'gen_input_tokens',
	'gen_output_tokens',
	'node_count',
	'discovery_latency_ms',
	'builder_latency_ms',
	'responder_latency_ms',
] as const;

/**
 * LLM Judge metrics to include (in order).
 * Each metric gets a score column and a _detail column.
 */
const LLM_JUDGE_METRICS = [
	'functionality',
	'connections',
	'expressions',
	'nodeConfiguration',
	'efficiency',
	'dataFlow',
	'maintainability',
	'bestPractices',
] as const;

/**
 * Pairwise evaluator metrics.
 */
const PAIRWISE_METRICS = [
	'pairwise_primary',
	'pairwise_diagnostic',
	'pairwise_judges_passed',
	'pairwise_total_passes',
	'pairwise_total_violations',
] as const;

type EvaluationSuite = 'llm-judge' | 'pairwise' | 'unknown';

/**
 * Escape a value for CSV output.
 * Wraps in quotes if contains comma, quote, or newline.
 */
function escapeCsvValue(value: string | number | undefined): string {
	if (value === undefined || value === null) return '';
	const str = String(value);
	if (str.includes(',') || str.includes('"') || str.includes('\n')) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

/**
 * Detect the evaluation suite from feedback.
 */
function detectSuite(feedback: Feedback[]): EvaluationSuite {
	if (feedback.some((f) => f.evaluator === 'llm-judge')) {
		return 'llm-judge';
	}
	if (feedback.some((f) => f.evaluator === 'pairwise')) {
		return 'pairwise';
	}
	return 'unknown';
}

/**
 * Extract the detail text from feedback for a given evaluator and metric.
 */
function extractMetricDetail(feedback: Feedback[], evaluator: string, metric: string): string {
	const item = feedback.find((f) => f.evaluator === evaluator && f.metric === metric && f.comment);
	return item?.comment ?? '';
}

/**
 * Extract the score for a given evaluator and metric.
 */
function extractMetricScore(
	feedback: Feedback[],
	evaluator: string,
	metric: string,
): number | undefined {
	const item = feedback.find((f) => f.evaluator === evaluator && f.metric === metric);
	return item?.score;
}

/**
 * Get the number of judges used in pairwise evaluation.
 */
function getJudgeCount(feedback: Feedback[]): number {
	const judgeMetrics = feedback.filter(
		(f) => f.evaluator === 'pairwise' && f.metric.startsWith('judge'),
	);
	return judgeMetrics.length;
}

/**
 * Build CSV row for LLM Judge suite.
 */
function buildLlmJudgeRow(result: ExampleResult): string[] {
	const row: string[] = [];

	// Fixed columns
	row.push(escapeCsvValue(result.prompt));
	row.push(escapeCsvValue(result.score));
	row.push(escapeCsvValue(result.status));
	row.push(escapeCsvValue(result.generationDurationMs));
	row.push(escapeCsvValue(result.generationInputTokens));
	row.push(escapeCsvValue(result.generationOutputTokens));
	row.push(escapeCsvValue(result.subgraphMetrics?.nodeCount));
	row.push(escapeCsvValue(result.subgraphMetrics?.discoveryDurationMs));
	row.push(escapeCsvValue(result.subgraphMetrics?.builderDurationMs));
	row.push(escapeCsvValue(result.subgraphMetrics?.responderDurationMs));

	// LLM Judge metric columns (score + detail pairs)
	for (const metric of LLM_JUDGE_METRICS) {
		row.push(escapeCsvValue(extractMetricScore(result.feedback, 'llm-judge', metric)));
		row.push(escapeCsvValue(extractMetricDetail(result.feedback, 'llm-judge', metric)));
	}

	return row;
}

/**
 * Build CSV row for Pairwise suite.
 */
function buildPairwiseRow(result: ExampleResult, judgeCount: number): string[] {
	const row: string[] = [];

	// Fixed columns
	row.push(escapeCsvValue(result.prompt));
	row.push(escapeCsvValue(result.score));
	row.push(escapeCsvValue(result.status));
	row.push(escapeCsvValue(result.generationDurationMs));
	row.push(escapeCsvValue(result.generationInputTokens));
	row.push(escapeCsvValue(result.generationOutputTokens));
	row.push(escapeCsvValue(result.subgraphMetrics?.nodeCount));
	row.push(escapeCsvValue(result.subgraphMetrics?.discoveryDurationMs));
	row.push(escapeCsvValue(result.subgraphMetrics?.builderDurationMs));
	row.push(escapeCsvValue(result.subgraphMetrics?.responderDurationMs));

	// Pairwise metrics (scores only, no detail)
	for (const metric of PAIRWISE_METRICS) {
		row.push(escapeCsvValue(extractMetricScore(result.feedback, 'pairwise', metric)));
	}

	// Individual judge results (score + violation detail)
	for (let i = 1; i <= judgeCount; i++) {
		const judgeMetric = `judge${i}`;
		row.push(escapeCsvValue(extractMetricScore(result.feedback, 'pairwise', judgeMetric)));
		row.push(escapeCsvValue(extractMetricDetail(result.feedback, 'pairwise', judgeMetric)));
	}

	return row;
}

/**
 * Build CSV header for LLM Judge suite.
 */
function buildLlmJudgeHeader(): string[] {
	const header: string[] = [...FIXED_COLUMNS];

	for (const metric of LLM_JUDGE_METRICS) {
		header.push(metric);
		header.push(`${metric}_detail`);
	}

	return header;
}

/**
 * Build CSV header for Pairwise suite.
 */
function buildPairwiseHeader(judgeCount: number): string[] {
	const header: string[] = [...FIXED_COLUMNS];

	// Pairwise metrics
	for (const metric of PAIRWISE_METRICS) {
		header.push(metric);
	}

	// Individual judge columns
	for (let i = 1; i <= judgeCount; i++) {
		header.push(`judge${i}`);
		header.push(`judge${i}_detail`);
	}

	return header;
}

export interface WriteResultsCsvOptions {
	/** Explicitly specify the evaluation suite. If not provided, auto-detects from feedback. */
	suite?: 'llm-judge' | 'pairwise';
}

/**
 * Write evaluation results to a CSV file.
 * Results are sorted by prompt for consistent ordering across runs.
 * Automatically detects evaluation suite (llm-judge or pairwise) and formats accordingly,
 * unless explicitly specified via options.
 */
export function writeResultsCsv(
	results: ExampleResult[],
	outputPath: string,
	options?: WriteResultsCsvOptions,
): void {
	if (results.length === 0) {
		writeFileSync(outputPath, '', 'utf-8');
		return;
	}

	// Sort by prompt for consistent ordering
	const sorted = [...results].sort((a, b) => a.prompt.localeCompare(b.prompt));

	// Use explicit suite if provided, otherwise detect from feedback
	let suite: EvaluationSuite;
	if (options?.suite) {
		suite = options.suite;
	} else {
		// Detect suite from first result with feedback (excluding runner errors)
		const firstWithFeedback = sorted.find((r) =>
			r.feedback.some((f) => f.evaluator !== 'runner' && f.evaluator !== 'programmatic'),
		);
		suite = firstWithFeedback ? detectSuite(firstWithFeedback.feedback) : 'unknown';
	}

	const lines: string[] = [];

	if (suite === 'pairwise') {
		// Determine max judge count across all results
		const judgeCount = Math.max(...sorted.map((r) => getJudgeCount(r.feedback)), 0);

		// Header
		lines.push(buildPairwiseHeader(judgeCount).join(','));

		// Data rows
		for (const result of sorted) {
			lines.push(buildPairwiseRow(result, judgeCount).join(','));
		}
	} else {
		// Default to LLM Judge format (also handles unknown)
		// Header
		lines.push(buildLlmJudgeHeader().join(','));

		// Data rows
		for (const result of sorted) {
			lines.push(buildLlmJudgeRow(result).join(','));
		}
	}

	// Write file (overwrites if exists)
	writeFileSync(outputPath, lines.join('\n') + '\n', 'utf-8');
}
