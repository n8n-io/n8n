import pc from 'picocolors';

import type { EvalLogger } from '../utils/logger.js';
import { createLogger } from '../utils/logger.js';

/**
 * Status of an evaluation example.
 */
export type ExampleStatus = 'pending' | 'generating' | 'evaluating' | 'complete' | 'error';

/**
 * Score breakdown for an evaluation result.
 */
export interface ScoreBreakdown {
	overall: number;
	functionality?: number;
	connections?: number;
	expressions?: number;
	nodeConfiguration?: number;
	// Pairwise-specific
	diagnostic?: number;
	primaryPass?: boolean;
}

/**
 * Result of a single example evaluation.
 */
export interface ExampleResult {
	index: number;
	prompt: string;
	status: 'pass' | 'fail' | 'error';
	scores: ScoreBreakdown;
	violations?: Array<{ category: string; message: string }>;
	error?: string;
	durationMs: number;
}

/**
 * Progress state for a single example.
 */
interface ExampleProgress {
	index: number;
	total: number;
	prompt: string;
	status: ExampleStatus;
	result?: ExampleResult;
	startTime: number;
}

/**
 * Truncate a prompt for display.
 */
function truncatePrompt(prompt: string, maxLen = 50): string {
	const cleaned = prompt.replace(/\s+/g, ' ').trim();
	return cleaned.length > maxLen ? cleaned.slice(0, maxLen) + '...' : cleaned;
}

/**
 * Format a score as percentage.
 */
function formatScore(score: number | undefined): string {
	if (score === undefined) return '-';
	return `${(score * 100).toFixed(0)}%`;
}

/**
 * Format duration in seconds.
 */
function formatDuration(ms: number): string {
	return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Ordered progress reporter that buffers and displays results in order.
 *
 * When running evaluations in parallel, results may complete out of order.
 * This reporter buffers results and displays them in sequence, so the output
 * is easier to follow while still benefiting from parallel execution.
 */
export class OrderedProgressReporter {
	private buffer: Map<number, ExampleProgress> = new Map();
	private nextToDisplay: number = 1;
	private displayedCount: number = 0;
	private total: number = 0;
	private logger: EvalLogger;
	private verbose: boolean;
	private allResults: ExampleResult[] = [];

	constructor(options: { verbose: boolean; total?: number }) {
		this.verbose = options.verbose;
		this.total = options.total ?? 0;
		this.logger = createLogger(options.verbose);
	}

	/**
	 * Set the total number of examples (if not known at construction).
	 */
	setTotal(total: number): void {
		this.total = total;
	}

	/**
	 * Report that an example has started.
	 */
	reportStart(index: number, prompt: string): void {
		const progress: ExampleProgress = {
			index,
			total: this.total,
			prompt,
			status: 'generating',
			startTime: Date.now(),
		};
		this.buffer.set(index, progress);

		// In verbose mode, show generating status immediately
		if (this.verbose && index === this.nextToDisplay) {
			this.displayGenerating(progress);
		}
	}

	/**
	 * Report that an example is now evaluating (workflow generated).
	 */
	reportEvaluating(index: number): void {
		const progress = this.buffer.get(index);
		if (!progress) return;

		progress.status = 'evaluating';

		// In verbose mode, update status
		if (this.verbose && index === this.nextToDisplay) {
			this.displayEvaluating(progress);
		}
	}

	/**
	 * Report that an example has completed.
	 */
	reportComplete(index: number, result: Omit<ExampleResult, 'index' | 'durationMs'>): void {
		const progress = this.buffer.get(index);
		if (!progress) {
			// Handle case where reportStart wasn't called
			this.buffer.set(index, {
				index,
				total: this.total,
				prompt: result.prompt,
				status: 'complete',
				startTime: Date.now(),
				result: { ...result, index, durationMs: 0 },
			});
		} else {
			const durationMs = Date.now() - progress.startTime;
			progress.status = 'complete';
			progress.result = { ...result, index, durationMs };
		}

		this.allResults.push(this.buffer.get(index)!.result!);
		this.flushBuffer();
	}

	/**
	 * Report that an example has errored.
	 */
	reportError(index: number, prompt: string, error: string): void {
		const progress = this.buffer.get(index);
		const durationMs = progress ? Date.now() - progress.startTime : 0;

		const result: ExampleResult = {
			index,
			prompt,
			status: 'error',
			scores: { overall: 0 },
			error,
			durationMs,
		};

		if (progress) {
			progress.status = 'error';
			progress.result = result;
		} else {
			this.buffer.set(index, {
				index,
				total: this.total,
				prompt,
				status: 'error',
				startTime: Date.now(),
				result,
			});
		}

		this.allResults.push(result);
		this.flushBuffer();
	}

	/**
	 * Get all collected results.
	 */
	getResults(): ExampleResult[] {
		return this.allResults;
	}

	/**
	 * Display generating status.
	 */
	private displayGenerating(progress: ExampleProgress): void {
		const prefix = pc.dim(`[${progress.index}/${this.total}]`);
		const status = pc.yellow('GENERATING');
		const prompt = pc.dim(`"${truncatePrompt(progress.prompt)}"`);
		this.logger.verbose(`${prefix} ${status} ${prompt}`);
	}

	/**
	 * Display evaluating status.
	 */
	private displayEvaluating(progress: ExampleProgress): void {
		const prefix = pc.dim(`[${progress.index}/${this.total}]`);
		const status = pc.blue('EVALUATING');
		this.logger.verbose(`${prefix} ${status}...`);
	}

	/**
	 * Flush buffer and display results in order.
	 */
	private flushBuffer(): void {
		while (this.buffer.has(this.nextToDisplay)) {
			const progress = this.buffer.get(this.nextToDisplay)!;

			if (progress.status === 'complete' || progress.status === 'error') {
				this.displayResult(progress);
				this.buffer.delete(this.nextToDisplay);
				this.displayedCount++;
				this.nextToDisplay++;
			} else {
				// Not ready yet, stop flushing
				break;
			}
		}
	}

	/**
	 * Display a completed result.
	 */
	private displayResult(progress: ExampleProgress): void {
		const result = progress.result!;
		const prefix = pc.dim(`[${progress.index}/${this.total}]`);

		if (result.status === 'error') {
			const status = pc.red('ERROR');
			const prompt = pc.dim(`"${truncatePrompt(result.prompt)}"`);
			this.logger.verbose(`${prefix} ${status} ${prompt}`);
			this.logger.verbose(pc.dim(`      ${result.error}`));
			return;
		}

		const passed = result.status === 'pass';
		const status = passed ? pc.green('PASS') : pc.yellow('FAIL');
		const checkmark = passed ? pc.green('✓') : pc.red('✗');

		// Build score string
		const scores = result.scores;
		const overallStr = formatScore(scores.overall);
		const detailScores: string[] = [];

		if (scores.functionality !== undefined) {
			detailScores.push(`func:${formatScore(scores.functionality)}`);
		}
		if (scores.connections !== undefined) {
			detailScores.push(`conn:${formatScore(scores.connections)}`);
		}
		if (scores.expressions !== undefined) {
			detailScores.push(`expr:${formatScore(scores.expressions)}`);
		}
		if (scores.nodeConfiguration !== undefined) {
			detailScores.push(`cfg:${formatScore(scores.nodeConfiguration)}`);
		}
		if (scores.diagnostic !== undefined) {
			detailScores.push(`diag:${formatScore(scores.diagnostic)}`);
		}

		const detailStr = detailScores.length > 0 ? ` | ${detailScores.join(', ')}` : '';
		const durationStr = pc.dim(`(${formatDuration(result.durationMs)})`);

		this.logger.verbose(
			`${prefix} ${checkmark} ${status} (overall: ${overallStr}${detailStr}) ${durationStr}`,
		);

		// Show violations if any and failed
		if (!passed && result.violations && result.violations.length > 0) {
			const maxViolations = 3;
			const violations = result.violations.slice(0, maxViolations);
			for (const violation of violations) {
				const cat = pc.dim(`[${violation.category}]`);
				this.logger.verbose(`      ${cat} ${truncatePrompt(violation.message, 60)}`);
			}
			if (result.violations.length > maxViolations) {
				this.logger.verbose(
					pc.dim(`      ... and ${result.violations.length - maxViolations} more`),
				);
			}
		}
	}

	/**
	 * Display summary statistics.
	 */
	displaySummary(): void {
		if (this.allResults.length === 0) {
			this.logger.info('No results to summarize.');
			return;
		}

		const passCount = this.allResults.filter((r) => r.status === 'pass').length;
		const failCount = this.allResults.filter((r) => r.status === 'fail').length;
		const errorCount = this.allResults.filter((r) => r.status === 'error').length;
		const total = this.allResults.length;

		const avgOverall = this.allResults.reduce((sum, r) => sum + r.scores.overall, 0) / total;
		const avgDuration = this.allResults.reduce((sum, r) => sum + r.durationMs, 0) / total;

		this.logger.verbose('');
		this.logger.info('═══════════════════ SUMMARY ═══════════════════');
		this.logger.info(
			`  Total: ${total} | Pass: ${pc.green(String(passCount))} | Fail: ${pc.yellow(String(failCount))} | Error: ${pc.red(String(errorCount))}`,
		);
		this.logger.info(`  Pass rate: ${((passCount / total) * 100).toFixed(1)}%`);
		this.logger.info(`  Average score: ${formatScore(avgOverall)}`);
		this.logger.info(`  Average duration: ${formatDuration(avgDuration)}`);

		// Category averages (if available)
		const categoryScores: Record<string, number[]> = {};
		for (const result of this.allResults) {
			const scores = result.scores;
			if (scores.functionality !== undefined) {
				(categoryScores.functionality ??= []).push(scores.functionality);
			}
			if (scores.connections !== undefined) {
				(categoryScores.connections ??= []).push(scores.connections);
			}
			if (scores.expressions !== undefined) {
				(categoryScores.expressions ??= []).push(scores.expressions);
			}
			if (scores.nodeConfiguration !== undefined) {
				(categoryScores.nodeConfiguration ??= []).push(scores.nodeConfiguration);
			}
		}

		if (Object.keys(categoryScores).length > 0) {
			this.logger.verbose('');
			this.logger.verbose('  Category averages:');
			for (const [category, values] of Object.entries(categoryScores)) {
				const avg = values.reduce((a, b) => a + b, 0) / values.length;
				this.logger.verbose(`    ${category}: ${formatScore(avg)}`);
			}
		}

		this.logger.info('═══════════════════════════════════════════════');
	}

	/**
	 * Display configuration information.
	 */
	displayConfig(config: {
		experimentName: string;
		datasetName: string;
		repetitions: number;
		concurrency: number;
		exampleCount: number;
		modelName?: string;
	}): void {
		this.logger.info(`➔ Experiment: ${config.experimentName}`);
		this.logger.info(`➔ Dataset: ${config.datasetName}`);

		if (config.exampleCount > 0) {
			this.logger.verbose(`➔ Examples: ${config.exampleCount}`);
			const totalRuns = config.exampleCount * config.repetitions;
			this.logger.verbose(
				`➔ Total runs: ${totalRuns} (${config.exampleCount} examples × ${config.repetitions} reps)`,
			);
		}

		this.logger.verbose(`➔ Concurrency: ${config.concurrency} parallel evaluations`);

		if (config.modelName) {
			this.logger.verbose(`➔ Model: ${config.modelName}`);
		}

		if (config.repetitions > 1) {
			this.logger.warn(`➔ Each example will be run ${config.repetitions} times`);
		}
	}
}

/**
 * Create a progress reporter for an evaluation run.
 */
export function createProgressReporter(options: {
	verbose: boolean;
	total?: number;
}): OrderedProgressReporter {
	return new OrderedProgressReporter(options);
}
