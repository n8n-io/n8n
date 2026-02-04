/**
 * Artifact saving for v2 evaluation harness.
 *
 * Saves evaluation results to disk in JSON format for later analysis.
 */

import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { feedbackKey } from './feedback';
import type { ExampleResult, Feedback, RunSummary } from './harness-types.js';
import type { EvalLogger } from './logger.js';
import { selectScoringItems, calculateFiniteAverage } from './score-calculator';
import type { SimpleWorkflow } from '../../src/types/workflow.js';

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
	/** Logger for optional save logs */
	logger: EvalLogger;
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
	const { outputDir, logger } = options;

	// Create output directory if it doesn't exist
	fs.mkdirSync(outputDir, { recursive: true });

	return {
		saveExample(result: ExampleResult): void {
			const exampleDir = path.join(outputDir, getExampleDirName(result));
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

			logger.verbose(`Saved example ${result.index} to ${exampleDir}`);
		},

		saveSummary(summary: RunSummary, results: ExampleResult[]): void {
			const summaryOutput = formatSummaryForExport(summary, results);
			fs.writeFileSync(
				path.join(outputDir, 'summary.json'),
				JSON.stringify(summaryOutput, null, 2),
				'utf-8',
			);

			logger.verbose(`Saved summary to ${path.join(outputDir, 'summary.json')}`);
		},
	};
}

function getExampleDirName(result: ExampleResult): string {
	const index = String(result.index).padStart(3, '0');
	const id = shortId(`${result.prompt}\n${result.index}`);
	return `example-${index}-${id}`;
}

function shortId(input: string): string {
	// Small deterministic id to avoid collisions when example folders are written concurrently
	// and to keep folder names stable across reruns with the same prompts.
	return createHash('md5').update(input).digest('hex').slice(0, 8);
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
		const evaluator = fb.evaluator;
		if (!byEvaluator[evaluator]) {
			byEvaluator[evaluator] = [];
		}
		byEvaluator[evaluator].push(fb);
	}

	return {
		index: result.index,
		status: result.status,
		durationMs: result.durationMs,
		generationDurationMs: result.generationDurationMs,
		evaluationDurationMs: result.evaluationDurationMs,
		generationInputTokens: result.generationInputTokens,
		generationOutputTokens: result.generationOutputTokens,
		score: result.score,
		// Include subgraph metrics if available
		...(result.subgraphMetrics && {
			subgraphMetrics: {
				nodeCount: result.subgraphMetrics.nodeCount,
				discoveryDurationMs: result.subgraphMetrics.discoveryDurationMs,
				builderDurationMs: result.subgraphMetrics.builderDurationMs,
				responderDurationMs: result.subgraphMetrics.responderDurationMs,
			},
		}),
		evaluators: Object.entries(byEvaluator).map(([name, items]) => ({
			name,
			feedback: items.map((f) => ({
				key: feedbackKey(f),
				metric: f.metric,
				score: f.score,
				kind: f.kind,
				...(f.comment ? { comment: f.comment } : {}),
			})),
			averageScore: calculateFiniteAverage(selectScoringItems(items)),
		})),
		allFeedback: result.feedback,
	};
}

/**
 * Format summary for export.
 */
function formatSummaryForExport(summary: RunSummary, results: ExampleResult[]): object {
	const resultsSorted = [...results].sort((a, b) => a.index - b.index);

	// Calculate per-evaluator statistics
	const evaluatorStats: Record<string, { scores: number[] }> = {};
	for (const result of resultsSorted) {
		const byEvaluator: Record<string, Feedback[]> = {};
		for (const fb of result.feedback) {
			const evaluator = fb.evaluator;
			if (!byEvaluator[evaluator]) byEvaluator[evaluator] = [];
			byEvaluator[evaluator].push(fb);
		}
		for (const [evaluator, items] of Object.entries(byEvaluator)) {
			if (!evaluatorStats[evaluator]) {
				evaluatorStats[evaluator] = { scores: [] };
			}
			const scoringItems = selectScoringItems(items);
			const avg = calculateFiniteAverage(scoringItems);
			evaluatorStats[evaluator].scores.push(avg);
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
		results: resultsSorted.map((r) => ({
			index: r.index,
			prompt: r.prompt.slice(0, 100) + (r.prompt.length > 100 ? '...' : ''),
			status: r.status,
			score: r.score,
			durationMs: r.durationMs,
			generationDurationMs: r.generationDurationMs,
			generationInputTokens: r.generationInputTokens,
			generationOutputTokens: r.generationOutputTokens,
			...(r.subgraphMetrics && {
				nodeCount: r.subgraphMetrics.nodeCount,
				discoveryDurationMs: r.subgraphMetrics.discoveryDurationMs,
				builderDurationMs: r.subgraphMetrics.builderDurationMs,
				responderDurationMs: r.subgraphMetrics.responderDurationMs,
			}),
			...(r.error ? { error: r.error } : {}),
		})),
	};
}
