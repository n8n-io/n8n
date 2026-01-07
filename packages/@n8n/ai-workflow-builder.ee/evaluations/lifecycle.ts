import pc from 'picocolors';

import type {
	EvaluationLifecycle,
	RunConfig,
	Feedback,
	ExampleResult,
	RunSummary,
} from './harness-types.js';
import { groupByEvaluator, selectScoringItems } from './score-calculator';
import type { SimpleWorkflow } from '../src/types/workflow.js';

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

/**
 * Format a score as percentage.
 */
function formatScore(score: number): string {
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
		return withComments.filter((f) => /^judge\d+$/u.test(f.metric));
	}

	return withComments;
}

/**
 * Get color based on score.
 */
function scoreColor(score: number): (s: string) => string {
	if (score >= 0.9) return pc.green;
	if (score >= 0.7) return pc.yellow;
	return pc.red;
}

/**
 * Options for creating a console lifecycle.
 */
export interface ConsoleLifecycleOptions {
	verbose: boolean;
}

/**
 * Create a lifecycle that logs to console.
 * Verbose mode shows detailed progress, non-verbose shows summary only.
 */
export function createConsoleLifecycle(options: ConsoleLifecycleOptions): EvaluationLifecycle {
	const { verbose } = options;
	let runMode: RunConfig['mode'] | undefined;
	let evaluatorOrder: string[] = [];

	return {
		onStart(config: RunConfig): void {
			runMode = config.mode;
			evaluatorOrder = config.evaluators.map((e) => e.name);

			console.log(`\nStarting evaluation in ${pc.cyan(config.mode)} mode`);

			if (typeof config.dataset === 'string') {
				console.log(`Dataset: ${pc.dim(config.dataset)}`);
			} else {
				console.log(`Test cases: ${pc.dim(String(config.dataset.length))}`);
			}

			console.log(
				`Evaluators: ${pc.dim(config.evaluators.map((e) => e.name).join(', ') || 'none')}`,
			);
			console.log('');
		},

		onExampleStart(index: number, total: number, prompt: string): void {
			if (!verbose) return;

			const totalStr = total > 0 ? String(total) : '?';
			const prefix = pc.dim(`[ex ${index}/${totalStr}]`);
			const status = pc.yellow('START');
			const promptStr = pc.dim(`prompt="${truncateForSingleLine(prompt, 80)}"`);
			console.log(`${prefix} ${status} ${promptStr}`);
		},

		onWorkflowGenerated(workflow: SimpleWorkflow, durationMs: number): void {
			void workflow;
			void durationMs;
		},

		onEvaluatorComplete(name: string, feedback: Feedback[]): void {
			void name;
			void feedback;
		},

		onEvaluatorError(name: string, error: Error): void {
			console.error(pc.red(`    ERROR in ${name}: ${error.message}`));
		},

		onExampleComplete(index: number, result: ExampleResult): void {
			if (!verbose) return;

			const status =
				result.status === 'pass'
					? pc.green('PASS')
					: result.status === 'fail'
						? pc.yellow('FAIL')
						: pc.red('ERROR');

			const promptSnippet = truncateForSingleLine(result.prompt, 80);
			const nodeCount = result.workflow?.nodes?.length ?? 0;

			const gen = result.generationDurationMs;
			const evalMs = result.evaluationDurationMs;
			const genStr = typeof gen === 'number' ? formatDuration(gen) : '?';
			const evalStr = typeof evalMs === 'number' ? formatDuration(evalMs) : '?';

			const lines: string[] = [];
			lines.push(
				`${pc.dim(`[ex ${index}]`)} ${status} ${formatScore(result.score)} ${pc.dim(
					`prompt="${promptSnippet}"`,
				)}`,
			);
			lines.push(
				pc.dim(
					`  gen=${genStr} eval=${evalStr} total=${formatDuration(result.durationMs)} nodes=${nodeCount}`,
				),
			);

			if (result.error) {
				lines.push(pc.red(`  error: ${result.error}`));
				console.log(lines.join('\n'));
				return;
			}

			const grouped = groupByEvaluator(result.feedback);
			const orderedEvaluators = [
				...evaluatorOrder.filter((name) => name in grouped),
				...Object.keys(grouped).filter((name) => !evaluatorOrder.includes(name)),
			];

			for (const evaluatorName of orderedEvaluators) {
				const feedback = grouped[evaluatorName] ?? [];
				const scoringItems = selectScoringItems(feedback);
				const avgScore =
					scoringItems.length > 0
						? scoringItems.reduce((sum, f) => sum + f.score, 0) / scoringItems.length
						: 0;

				const colorFn = scoreColor(avgScore);
				lines.push(
					pc.dim(`  ${evaluatorName}: `) +
						colorFn(formatScore(avgScore)) +
						pc.dim(` (metrics=${feedback.length})`),
				);

				const displayMetrics = DISPLAY_METRICS_BY_EVALUATOR[evaluatorName] ?? CRITICAL_METRICS;
				const picked = feedback.filter((f) => displayMetrics.includes(f.metric));
				if (picked.length > 0) {
					const metricsLine = picked
						.map((f) => {
							const color = scoreColor(f.score);
							return `${f.metric}: ${color(formatMetricValue(evaluatorName, f.metric, f.score))}`;
						})
						.join(pc.dim(' | '));
					lines.push(pc.dim('    ') + metricsLine);
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
			}

			console.log(lines.join('\n'));
		},

		onEnd(summary: RunSummary): void {
			if (runMode === 'langsmith') {
				return;
			}

			console.log('\n' + pc.bold('═══════════════════ SUMMARY ═══════════════════'));
			console.log(
				`  Total: ${summary.totalExamples} | ` +
					`Pass: ${pc.green(String(summary.passed))} | ` +
					`Fail: ${pc.yellow(String(summary.failed))} | ` +
					`Error: ${pc.red(String(summary.errors))}`,
			);
			const passRate = summary.totalExamples > 0 ? summary.passed / summary.totalExamples : 0;
			console.log(`  Pass rate: ${formatScore(passRate)}`);
			console.log(`  Average score: ${formatScore(summary.averageScore)}`);
			console.log(`  Total time: ${formatDuration(summary.totalDurationMs)}`);
			console.log(pc.bold('═══════════════════════════════════════════════\n'));
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

/**
 * Merge multiple partial lifecycles into a single complete lifecycle.
 * All hooks will be called in order.
 */
export function mergeLifecycles(
	...lifecycles: Array<Partial<EvaluationLifecycle> | undefined>
): EvaluationLifecycle {
	const validLifecycles = lifecycles.filter(Boolean) as Array<Partial<EvaluationLifecycle>>;

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
