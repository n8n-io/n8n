/**
 * Markdown Report Generator
 *
 * Generates human-readable markdown reports from evaluation results.
 */

import { feedbackKey } from '../harness/feedback';
import type { ExampleResult, RunSummary } from '../harness/harness-types';
import {
	groupByEvaluator,
	selectScoringItems,
	calculateFiniteAverage,
} from '../harness/score-calculator';

/**
 * Violation severity levels.
 */
export type ViolationSeverity = 'critical' | 'major' | 'minor';

/**
 * Options for report generation.
 */
export interface ReportOptions {
	/** Include detailed per-test results (default: false) */
	includeDetails?: boolean;
	/** Include violation breakdown (default: true) */
	includeViolations?: boolean;
}

/**
 * Metrics calculated from evaluation results.
 */
export interface ReportMetrics {
	/** Average score per evaluator */
	evaluatorAverages: Record<string, number>;
	/** Count of violations by severity */
	violationCounts: { critical: number; major: number; minor: number };
}

/** Maximum prompt length before truncation */
const MAX_PROMPT_LENGTH = 80;

/**
 * Extract violation severity from a feedback comment.
 *
 * Looks for markers like [CRITICAL], [MAJOR], [MINOR] in the comment.
 *
 * @param comment - The feedback comment to parse
 * @returns The violation severity or null if not found
 */
export function extractViolationSeverity(comment?: string): ViolationSeverity | null {
	if (!comment) return null;

	const lowerComment = comment.toLowerCase();

	if (lowerComment.includes('[critical]')) return 'critical';
	if (lowerComment.includes('[major]')) return 'major';
	if (lowerComment.includes('[minor]')) return 'minor';

	return null;
}

/**
 * Format a number as a percentage string.
 */
function formatPercentage(value: number, decimals = 1): string {
	if (!Number.isFinite(value)) return 'N/A';
	return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Truncate a string to a maximum length with ellipsis.
 */
function truncate(str: string, maxLength: number): string {
	if (str.length <= maxLength) return str;
	return str.slice(0, maxLength - 3) + '...';
}

/**
 * Calculate report metrics from evaluation results.
 *
 * @param results - Array of example results
 * @returns Calculated metrics including evaluator averages and violation counts
 */
export function calculateReportMetrics(results: ExampleResult[]): ReportMetrics {
	const okResults = results.filter((r) => r.status !== 'error');

	// Calculate evaluator averages (per-example, then average; avoids key-count skew)
	const evaluatorScores: Record<string, number[]> = {};
	for (const result of okResults) {
		const grouped = groupByEvaluator(result.feedback);
		for (const [evaluator, items] of Object.entries(grouped)) {
			if (!evaluatorScores[evaluator]) evaluatorScores[evaluator] = [];
			evaluatorScores[evaluator].push(calculateFiniteAverage(selectScoringItems(items)));
		}
	}

	const evaluatorAverages: Record<string, number> = {};
	for (const [evaluator, scores] of Object.entries(evaluatorScores)) {
		evaluatorAverages[evaluator] = scores.reduce((sum, s) => sum + s, 0) / scores.length;
	}

	// Count violations by severity
	const violationCounts = { critical: 0, major: 0, minor: 0 };
	for (const result of okResults) {
		for (const feedback of result.feedback) {
			const severity = extractViolationSeverity(feedback.comment);
			if (severity) {
				violationCounts[severity]++;
			}
		}
	}

	return {
		evaluatorAverages,
		violationCounts,
	};
}

/**
 * Generate a markdown report from evaluation results.
 *
 * @param results - Array of example results
 * @param summary - Run summary with totals
 * @param options - Report generation options
 * @returns Formatted markdown string
 */
export function generateMarkdownReport(
	results: ExampleResult[],
	summary: RunSummary,
	options: ReportOptions = {},
): string {
	const { includeDetails = false, includeViolations = true } = options;

	const metrics = calculateReportMetrics(results);
	const passRate = summary.totalExamples > 0 ? summary.passed / summary.totalExamples : 0;

	let report = `# AI Workflow Builder Evaluation Report

## Summary
- Total Tests: ${summary.totalExamples}
- Passed: ${summary.passed} (${formatPercentage(passRate)})
- Failed: ${summary.failed}
- Errors: ${summary.errors}
- Average Score: ${formatPercentage(summary.averageScore)}
- Total Duration: ${(summary.totalDurationMs / 1000).toFixed(1)}s

`;

	// Evaluator Averages
	if (Object.keys(metrics.evaluatorAverages).length > 0) {
		report += `## Evaluator Averages
`;
		for (const [evaluator, avg] of Object.entries(metrics.evaluatorAverages)) {
			report += `- ${evaluator}: ${formatPercentage(avg)}
`;
		}
		report += '\n';
	}

	// Violations Summary
	if (includeViolations) {
		const { critical, major, minor } = metrics.violationCounts;
		report += `## Violations Summary
- Critical: ${critical}
- Major: ${major}
- Minor: ${minor}

`;
	}

	// Detailed Results
	if (includeDetails && results.length > 0) {
		report += `## Detailed Results

`;
		for (const result of results) {
			const promptPreview = truncate(result.prompt, MAX_PROMPT_LENGTH);
			const resultScore = result.score;

			report += `### Test ${result.index}: ${promptPreview}
- **Status**: ${result.status}
- **Score**: ${formatPercentage(resultScore)}
- **Duration**: ${result.durationMs}ms
`;

			if (result.error) {
				report += `- **Error**: ${result.error}
`;
			}

			if (result.feedback.length > 0) {
				report += `- **Feedback**:
`;
				for (const fb of result.feedback) {
					const scoreStr = formatPercentage(fb.score);
					const commentStr = fb.comment ? ` - ${fb.comment}` : '';
					report += `  - [${feedbackKey(fb)}] ${scoreStr}${commentStr}
`;
				}
			}

			report += '\n';
		}
	}

	return report;
}
