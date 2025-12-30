import pc from 'picocolors';

import type {
	EvaluationLifecycle,
	RunConfig,
	Feedback,
	ExampleResult,
	RunSummary,
} from './types.js';
import type { SimpleWorkflow } from '../../src/types/workflow.js';

/**
 * Truncate a string for display.
 */
function truncate(str: string, maxLen = 50): string {
	const cleaned = str.replace(/\s+/g, ' ').trim();
	return cleaned.length > maxLen ? cleaned.slice(0, maxLen) + '...' : cleaned;
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

	return {
		onStart(config: RunConfig): void {
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

			const prefix = pc.dim(`[${index}/${total}]`);
			const status = pc.yellow('RUNNING');
			const promptStr = pc.dim(`"${truncate(prompt)}"`);
			console.log(`${prefix} ${status} ${promptStr}`);
		},

		onWorkflowGenerated(workflow: SimpleWorkflow, durationMs: number): void {
			if (!verbose) return;

			const nodeCount = workflow.nodes?.length ?? 0;
			console.log(pc.dim(`    Generated: ${nodeCount} nodes in ${formatDuration(durationMs)}`));
		},

		onEvaluatorComplete(name: string, feedback: Feedback[]): void {
			if (!verbose) return;

			const avgScore =
				feedback.length > 0 ? feedback.reduce((sum, f) => sum + f.score, 0) / feedback.length : 0;

			const colorFn = scoreColor(avgScore);
			console.log(
				pc.dim(`    ${name}: `) +
					colorFn(formatScore(avgScore)) +
					pc.dim(` (${feedback.length} metrics)`),
			);

			// Show critical metrics (handle both prefixed and non-prefixed keys)
			const criticalFeedback = feedback.filter((f) => {
				const keyParts = f.key.split('.');
				const metricName = keyParts.length > 1 ? keyParts[1] : keyParts[0];
				return CRITICAL_METRICS.includes(metricName);
			});
			if (criticalFeedback.length > 0) {
				const metricsLine = criticalFeedback
					.map((f) => {
						const keyParts = f.key.split('.');
						const shortKey = keyParts.length > 1 ? keyParts[1] : keyParts[0];
						const color = scoreColor(f.score);
						return `${shortKey}: ${color(formatScore(f.score))}`;
					})
					.join(pc.dim(' | '));
				console.log(pc.dim('      ') + metricsLine);
			}

			// Show violations (feedback items with comments that indicate issues)
			const violations = feedback.filter(
				(f) => f.comment && f.score < 1.0 && !f.key.endsWith('.error'),
			);
			if (violations.length > 0) {
				console.log(pc.dim('      Violations:'));
				for (const v of violations.slice(0, 5)) {
					// Limit to 5 violations
					console.log(pc.dim(`        - [${v.key}] `) + pc.red(v.comment ?? ''));
				}
				if (violations.length > 5) {
					console.log(pc.dim(`        ... and ${violations.length - 5} more`));
				}
			}
		},

		onEvaluatorError(name: string, error: Error): void {
			console.error(pc.red(`    ERROR in ${name}: ${error.message}`));
		},

		onExampleComplete(index: number, result: ExampleResult): void {
			if (!verbose) return;

			const prefix = pc.dim(`[${index}]`);
			const status =
				result.status === 'pass'
					? pc.green('PASS')
					: result.status === 'fail'
						? pc.yellow('FAIL')
						: pc.red('ERROR');

			const avgScore =
				result.feedback.length > 0
					? result.feedback.reduce((sum, f) => sum + f.score, 0) / result.feedback.length
					: 0;

			console.log(
				`${prefix} ${status} ${formatScore(avgScore)} in ${formatDuration(result.durationMs)}`,
			);
		},

		onEnd(summary: RunSummary): void {
			console.log('\n' + pc.bold('═══════════════════ SUMMARY ═══════════════════'));
			console.log(
				`  Total: ${summary.totalExamples} | ` +
					`Pass: ${pc.green(String(summary.passed))} | ` +
					`Fail: ${pc.yellow(String(summary.failed))} | ` +
					`Error: ${pc.red(String(summary.errors))}`,
			);
			console.log(`  Pass rate: ${formatScore(summary.passed / summary.totalExamples)}`);
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
