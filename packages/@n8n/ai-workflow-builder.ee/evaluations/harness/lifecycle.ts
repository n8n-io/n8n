import pc from 'picocolors';

import type {
	EvaluationLifecycle,
	RunConfig,
	Feedback,
	ExampleResult,
	RunSummary,
} from './harness-types.js';
import type { EvalLogger } from './logger.js';
import { groupByEvaluator, selectScoringItems, calculateFiniteAverage } from './score-calculator';
import type { SimpleWorkflow } from '../../src/types/workflow.js';

/**
 * Truncate a string for display.
 */
function truncate(str: string, maxLen = 50): string {
	const cleaned = str.replace(/\s+/g, ' ').trim();
	return cleaned.length > maxLen ? cleaned.slice(0, maxLen) + '...' : cleaned;
}

function truncateForSingleLine(str: string, maxLen: number): string {
	return truncate(str.replace(/\n/g, ' '), maxLen);
}

function exampleLabel(mode: RunConfig['mode'] | undefined): 'call' | 'ex' {
	return mode === 'langsmith' ? 'call' : 'ex';
}

/**
 * Format a score as percentage.
 */
function formatScore(score: number): string {
	if (!Number.isFinite(score)) return 'N/A';
	return `${(score * 100).toFixed(0)}%`;
}

/**
 * Format duration in seconds.
 */
function formatDuration(ms: number): string {
	return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Critical metrics to always show in verbose mode.
 */
const CRITICAL_METRICS = [
	'functionality',
	'connections',
	'expressions',
	'nodeConfiguration',
	'overallScore',
	'overall', // programmatic uses 'overall' not 'overallScore'
	'trigger',
];

const DISPLAY_METRICS_BY_EVALUATOR: Record<string, string[]> = {
	'llm-judge': ['functionality', 'connections', 'expressions', 'nodeConfiguration', 'overallScore'],
	programmatic: ['overall', 'connections', 'trigger'],
	pairwise: [
		'pairwise_primary',
		'pairwise_diagnostic',
		'pairwise_judges_passed',
		'pairwise_total_passes',
		'pairwise_total_violations',
		'pairwise_generation_correctness',
		'pairwise_aggregated_diagnostic',
		'pairwise_generations_passed',
		'pairwise_total_judge_calls',
	],
};

const PAIRWISE_COUNT_METRICS = new Set([
	'pairwise_judges_passed',
	'pairwise_total_passes',
	'pairwise_total_violations',
	'pairwise_generations_passed',
	'pairwise_total_judge_calls',
]);

function formatMetricValue(evaluator: string, metric: string, score: number): string {
	if (evaluator === 'pairwise' && PAIRWISE_COUNT_METRICS.has(metric)) {
		if (!Number.isFinite(score)) return 'N/A';
		return Number.isInteger(score) ? String(score) : score.toFixed(0);
	}
	return formatScore(score);
}

function hasSeverityMarker(comment: string): boolean {
	const lower = comment.toLowerCase();
	return lower.includes('[critical]') || lower.includes('[major]') || lower.includes('[minor]');
}

function extractIssuesForLogs(evaluator: string, feedback: Feedback[]): Feedback[] {
	const withComments = feedback.filter(
		(f) => typeof f.comment === 'string' && f.comment.trim().length > 0 && f.metric !== 'error',
	);

	if (evaluator === 'llm-judge') {
		return withComments.filter((f) => (f.comment ? hasSeverityMarker(f.comment) : false));
	}

	if (evaluator === 'pairwise') {
		const isJudgeMetric = (metric: string) =>
			/^judge\d+$/u.test(metric) || /^gen\d+\.judge\d+$/u.test(metric);

		return withComments.filter((f) => {
			if (isJudgeMetric(f.metric)) return true;

			// Only show high-level status summaries when not fully passing.
			if (f.metric === 'pairwise_primary' && f.score < 1) return true;
			if (f.metric === 'pairwise_generation_correctness' && f.score < 1) return true;

			return false;
		});
	}

	return withComments;
}

function formatExampleHeaderLines(args: {
	mode: RunConfig['mode'] | undefined;
	index: number;
	status: string;
	score: number;
	prompt: string;
	durationMs: number;
	generationDurationMs?: number;
	evaluationDurationMs?: number;
	nodeCount: number;
}): string[] {
	const {
		mode,
		index,
		status,
		score,
		prompt,
		durationMs,
		generationDurationMs,
		evaluationDurationMs,
		nodeCount,
	} = args;

	const promptSnippet = truncateForSingleLine(prompt, 80);
	const genStr =
		typeof generationDurationMs === 'number' ? formatDuration(generationDurationMs) : '?';
	const evalStr =
		typeof evaluationDurationMs === 'number' ? formatDuration(evaluationDurationMs) : '?';

	return [
		`${pc.dim(`[${exampleLabel(mode)} ${index}]`)} ${status} ${formatScore(score)} ${pc.dim(
			`prompt="${promptSnippet}"`,
		)}`,
		pc.dim(
			`  gen=${genStr} eval=${evalStr} total=${formatDuration(durationMs)} nodes=${nodeCount}`,
		),
	];
}

function splitEvaluatorFeedback(feedback: Feedback[]): {
	errors: Feedback[];
	nonErrorFeedback: Feedback[];
} {
	return {
		errors: feedback.filter((f) => f.metric === 'error'),
		nonErrorFeedback: feedback.filter((f) => f.metric !== 'error'),
	};
}

function formatEvaluatorLines(args: {
	evaluatorName: string;
	feedback: Feedback[];
}): string[] {
	const { evaluatorName, feedback } = args;

	const { errors, nonErrorFeedback } = splitEvaluatorFeedback(feedback);

	const scoringItems = selectScoringItems(feedback);
	const avgScore = calculateFiniteAverage(scoringItems);

	const colorFn = scoreColor(avgScore);

	const lines: string[] = [];
	lines.push(
		pc.dim(`  ${evaluatorName}: `) +
			colorFn(formatScore(avgScore)) +
			pc.dim(
				errors.length > 0
					? ` (metrics=${nonErrorFeedback.length}, errors=${errors.length})`
					: ` (metrics=${feedback.length})`,
			),
	);

	const displayMetrics = DISPLAY_METRICS_BY_EVALUATOR[evaluatorName] ?? CRITICAL_METRICS;
	const picked = nonErrorFeedback.filter((f) => displayMetrics.includes(f.metric));
	if (picked.length > 0) {
		const metricsLine = picked
			.map((f) => {
				const color = scoreColor(f.score);
				return `${f.metric}: ${color(formatMetricValue(evaluatorName, f.metric, f.score))}`;
			})
			.join(pc.dim(' | '));
		lines.push(pc.dim('    ') + metricsLine);
	}

	if (errors.length > 0) {
		const topErrors = errors.slice(0, 2);
		lines.push(pc.dim(`    errors(top=${topErrors.length}):`));
		for (const errorItem of topErrors) {
			const comment = truncateForSingleLine(errorItem.comment ?? '', 240);
			lines.push(pc.dim('      - ') + pc.red(comment));
		}
		if (errors.length > topErrors.length) {
			lines.push(pc.dim(`      ... and ${errors.length - topErrors.length} more`));
		}
	}

	const issues = extractIssuesForLogs(evaluatorName, feedback);
	if (issues.length > 0) {
		const top = issues.slice(0, 3);
		lines.push(pc.dim(`    issues(top=${top.length}):`));
		for (const issue of top) {
			const comment = truncateForSingleLine(issue.comment ?? '', 320);
			lines.push(pc.dim(`      - [${issue.metric}] `) + pc.red(comment));
		}
		if (issues.length > top.length) {
			lines.push(pc.dim(`      ... and ${issues.length - top.length} more`));
		}
	}

	return lines;
}

/**
 * Get color based on score.
 */
function scoreColor(score: number): (s: string) => string {
	if (score >= 0.9) return pc.green;
	if (score >= 0.7) return pc.yellow;
	return pc.red;
}

function formatExampleStatus(status: ExampleResult['status']): string {
	switch (status) {
		case 'pass':
			return pc.green('PASS');
		case 'fail':
			return pc.yellow('FAIL');
		case 'error':
			return pc.red('ERROR');
	}
}

/**
 * Options for creating a console lifecycle.
 */
export interface ConsoleLifecycleOptions {
	verbose: boolean;
	logger: EvalLogger;
}

/**
 * Create a lifecycle that logs to console.
 * Verbose mode shows detailed progress, non-verbose shows summary only.
 */
export function createConsoleLifecycle(options: ConsoleLifecycleOptions): EvaluationLifecycle {
	const { verbose, logger } = options;
	let runMode: RunConfig['mode'] | undefined;
	let evaluatorOrder: string[] = [];

	return {
		onStart(config: RunConfig): void {
			runMode = config.mode;
			evaluatorOrder = config.evaluators.map((e) => e.name);

			logger.info(`\nStarting evaluation in ${pc.cyan(config.mode)} mode`);

			if (typeof config.dataset === 'string') {
				logger.info(`Dataset: ${pc.dim(config.dataset)}`);
			} else {
				logger.info(`Test cases: ${pc.dim(String(config.dataset.length))}`);
			}

			logger.info(
				`Evaluators: ${pc.dim(config.evaluators.map((e) => e.name).join(', ') || 'none')}`,
			);
			logger.info('');
		},

		onExampleStart(index: number, total: number, prompt: string): void {
			if (!verbose) return;

			const totalStr = total > 0 ? String(total) : '?';
			const prefix = pc.dim(`[${exampleLabel(runMode)} ${index}/${totalStr}]`);
			const status = pc.yellow('START');
			const promptStr = pc.dim(`prompt="${truncateForSingleLine(prompt, 80)}"`);
			logger.info(`${prefix} ${status} ${promptStr}`);
		},

		onWorkflowGenerated: () => {},

		onEvaluatorComplete: () => {},

		onEvaluatorError(name: string, error: Error): void {
			if (!verbose) return;
			logger.error(`    ERROR in ${name}: ${error.message}`);
		},

		onExampleComplete(index: number, result: ExampleResult): void {
			if (!verbose) return;

			const status = formatExampleStatus(result.status);

			const nodeCount = result.workflow?.nodes?.length ?? 0;
			const lines: string[] = formatExampleHeaderLines({
				mode: runMode,
				index,
				status,
				score: result.score,
				prompt: result.prompt,
				durationMs: result.durationMs,
				generationDurationMs: result.generationDurationMs,
				evaluationDurationMs: result.evaluationDurationMs,
				nodeCount,
			});

			if (result.error) {
				lines.push(pc.red(`  error: ${result.error}`));
				logger.info(lines.join('\n'));
				return;
			}

			const grouped = groupByEvaluator(result.feedback);
			const orderedEvaluators = [
				...evaluatorOrder.filter((name) => name in grouped),
				...Object.keys(grouped).filter((name) => !evaluatorOrder.includes(name)),
			];

			for (const evaluatorName of orderedEvaluators) {
				const feedback = grouped[evaluatorName] ?? [];
				lines.push(...formatEvaluatorLines({ evaluatorName, feedback }));
			}

			logger.info(lines.join('\n'));
		},

		onEnd(summary: RunSummary): void {
			if (runMode === 'langsmith') {
				return;
			}

			logger.info('\n' + pc.bold('═══════════════════ SUMMARY ═══════════════════'));
			logger.info(
				`  Total: ${summary.totalExamples} | ` +
					`Pass: ${pc.green(String(summary.passed))} | ` +
					`Fail: ${pc.yellow(String(summary.failed))} | ` +
					`Error: ${pc.red(String(summary.errors))}`,
			);
			const passRate = summary.totalExamples > 0 ? summary.passed / summary.totalExamples : 0;
			logger.info(`  Pass rate: ${formatScore(passRate)}`);
			logger.info(`  Average score: ${formatScore(summary.averageScore)}`);
			logger.info(`  Total time: ${formatDuration(summary.totalDurationMs)}`);
			logger.info(pc.bold('═══════════════════════════════════════════════\n'));
		},
	};
}

/**
 * Create a quiet lifecycle that does nothing.
 * Useful for testing or when no output is desired.
 */
export function createQuietLifecycle(): EvaluationLifecycle {
	return {
		onStart: () => {},
		onExampleStart: () => {},
		onWorkflowGenerated: () => {},
		onEvaluatorComplete: () => {},
		onEvaluatorError: () => {},
		onExampleComplete: () => {},
		onEnd: () => {},
	};
}

/** Type predicate for filtering undefined values */
function isDefined<T>(value: T | undefined): value is T {
	return value !== undefined;
}

/**
 * Merge multiple partial lifecycles into a single complete lifecycle.
 * All hooks will be called in order.
 */
export function mergeLifecycles(
	...lifecycles: Array<Partial<EvaluationLifecycle> | undefined>
): EvaluationLifecycle {
	const validLifecycles = lifecycles.filter(isDefined);

	return {
		onStart(config: RunConfig): void {
			for (const lc of validLifecycles) {
				lc.onStart?.(config);
			}
		},

		onExampleStart(index: number, total: number, prompt: string): void {
			for (const lc of validLifecycles) {
				lc.onExampleStart?.(index, total, prompt);
			}
		},

		onWorkflowGenerated(workflow: SimpleWorkflow, durationMs: number): void {
			for (const lc of validLifecycles) {
				lc.onWorkflowGenerated?.(workflow, durationMs);
			}
		},

		onEvaluatorComplete(name: string, feedback: Feedback[]): void {
			for (const lc of validLifecycles) {
				lc.onEvaluatorComplete?.(name, feedback);
			}
		},

		onEvaluatorError(name: string, error: Error): void {
			for (const lc of validLifecycles) {
				lc.onEvaluatorError?.(name, error);
			}
		},

		onExampleComplete(index: number, result: ExampleResult): void {
			for (const lc of validLifecycles) {
				lc.onExampleComplete?.(index, result);
			}
		},

		onEnd(summary: RunSummary): void {
			for (const lc of validLifecycles) {
				lc.onEnd?.(summary);
			}
		},
	};
}
