/**
 * Artifact saving for v2 evaluation harness.
 *
 * Saves evaluation results to disk in JSON format for later analysis.
 */

import * as fs from 'fs';
import * as path from 'path';

import type { ExampleResult, Feedback, RunSummary } from './harness-types.js';
import type { SimpleWorkflow } from '../src/types/workflow.js';

/**
 * Interface for saving evaluation artifacts to disk.
 */
export interface ArtifactSaver {
	/** Save a single example result */
	saveExample(result: ExampleResult): void;
	/** Save the final summary */
	saveSummary(summary: RunSummary, results: ExampleResult[]): void;
}

/**
 * Options for creating an artifact saver.
 */
export interface ArtifactSaverOptions {
	/** Directory to save artifacts to */
	outputDir: string;
	/** Whether to log save operations */
	verbose?: boolean;
}

/**
 * Create an artifact saver for persisting evaluation results to disk.
 *
 * Directory structure:
 * ```
 * outputDir/
 * ├── example-001/
 * │   ├── prompt.txt
 * │   ├── workflow.json
 * │   └── feedback.json
 * ├── example-002/
 * │   └── ...
 * └── summary.json
 * ```
 *
 * @param options - Configuration options
 * @returns ArtifactSaver instance or null if outputDir is not provided
 */
export function createArtifactSaver(options: ArtifactSaverOptions): ArtifactSaver {
	const { outputDir, verbose = false } = options;

	// Create output directory if it doesn't exist
	fs.mkdirSync(outputDir, { recursive: true });

	const log = (message: string) => {
		if (verbose) {
			console.log(message);
		}
	};

	return {
		saveExample(result: ExampleResult): void {
			const exampleDir = path.join(outputDir, `example-${String(result.index).padStart(3, '0')}`);
			fs.mkdirSync(exampleDir, { recursive: true });

			// Save prompt
			fs.writeFileSync(path.join(exampleDir, 'prompt.txt'), result.prompt, 'utf-8');

			// Save workflow if available
			if (result.workflow) {
				const workflowForExport = formatWorkflowForExport(result.workflow);
				fs.writeFileSync(
					path.join(exampleDir, 'workflow.json'),
					JSON.stringify(workflowForExport, null, 2),
					'utf-8',
				);
			}

			// Save feedback
			const feedbackOutput = formatFeedbackForExport(result);
			fs.writeFileSync(
				path.join(exampleDir, 'feedback.json'),
				JSON.stringify(feedbackOutput, null, 2),
				'utf-8',
			);

			// Save error if present
			if (result.error) {
				fs.writeFileSync(path.join(exampleDir, 'error.txt'), result.error, 'utf-8');
			}

			log(`  📁 Saved example ${result.index} to ${exampleDir}`);
		},

		saveSummary(summary: RunSummary, results: ExampleResult[]): void {
			const summaryOutput = formatSummaryForExport(summary, results);
			fs.writeFileSync(
				path.join(outputDir, 'summary.json'),
				JSON.stringify(summaryOutput, null, 2),
				'utf-8',
			);

			log(`📁 Saved summary to ${path.join(outputDir, 'summary.json')}`);
		},
	};
}

/**
 * Format a workflow for export (n8n-importable format).
 */
function formatWorkflowForExport(workflow: SimpleWorkflow): object {
	return {
		name: workflow.name ?? 'Generated Workflow',
		nodes: workflow.nodes ?? [],
		connections: workflow.connections ?? {},
	};
}

/**
 * Format feedback for export.
 */
function formatFeedbackForExport(result: ExampleResult): object {
	// Group feedback by evaluator
	const byEvaluator: Record<string, Feedback[]> = {};
	for (const fb of result.feedback) {
		const [evaluator] = fb.key.split('.');
		if (!byEvaluator[evaluator]) {
			byEvaluator[evaluator] = [];
		}
		byEvaluator[evaluator].push(fb);
	}

	return {
		index: result.index,
		status: result.status,
		durationMs: result.durationMs,
		averageScore:
			result.feedback.length > 0
				? result.feedback.reduce((sum, f) => sum + f.score, 0) / result.feedback.length
				: 0,
		evaluators: Object.entries(byEvaluator).map(([name, feedback]) => ({
			name,
			feedback: feedback.map((f) => ({
				key: f.key,
				score: f.score,
				...(f.comment ? { comment: f.comment } : {}),
			})),
			averageScore: feedback.reduce((sum, f) => sum + f.score, 0) / feedback.length,
		})),
		allFeedback: result.feedback,
	};
}

/**
 * Format summary for export.
 */
function formatSummaryForExport(summary: RunSummary, results: ExampleResult[]): object {
	// Calculate per-evaluator statistics
	const evaluatorStats: Record<string, { scores: number[]; count: number }> = {};
	for (const result of results) {
		for (const fb of result.feedback) {
			const [evaluator] = fb.key.split('.');
			if (!evaluatorStats[evaluator]) {
				evaluatorStats[evaluator] = { scores: [], count: 0 };
			}
			evaluatorStats[evaluator].scores.push(fb.score);
			evaluatorStats[evaluator].count++;
		}
	}

	const evaluatorAverages: Record<string, number> = {};
	for (const [name, stats] of Object.entries(evaluatorStats)) {
		evaluatorAverages[name] = stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length;
	}

	return {
		timestamp: new Date().toISOString(),
		totalExamples: summary.totalExamples,
		passed: summary.passed,
		failed: summary.failed,
		errors: summary.errors,
		passRate: summary.totalExamples > 0 ? summary.passed / summary.totalExamples : 0,
		averageScore: summary.averageScore,
		totalDurationMs: summary.totalDurationMs,
		evaluatorAverages,
		results: results.map((r) => ({
			index: r.index,
			prompt: r.prompt.slice(0, 100) + (r.prompt.length > 100 ? '...' : ''),
			status: r.status,
			score:
				r.feedback.length > 0
					? r.feedback.reduce((sum, f) => sum + f.score, 0) / r.feedback.length
					: 0,
			durationMs: r.durationMs,
			...(r.error ? { error: r.error } : {}),
		})),
	};
}
