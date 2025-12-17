import * as fs from 'fs';
import * as path from 'path';

import type { EvalLogger } from './logger';
import type { GenerationResult, MultiGenerationAggregation } from '../pairwise/judge-panel';

export interface ArtifactSaver {
	savePrompt(promptId: string, prompt: string, criteria: { dos: string; donts: string }): void;
	saveGeneration(promptId: string, genIndex: number, result: GenerationResult): void;
	saveSummary(results: Array<{ promptId: string; aggregation: MultiGenerationAggregation }>): void;
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Creates an artifact saver for persisting evaluation results to disk.
 * @param outputDir - Directory to save artifacts to
 * @param log - Logger instance for verbose output
 * @returns ArtifactSaver instance or null if outputDir is not provided
 */
export function createArtifactSaver(
	outputDir: string | undefined,
	log: EvalLogger,
): ArtifactSaver | null {
	if (!outputDir) return null;

	// Create output directory if it doesn't exist
	fs.mkdirSync(outputDir, { recursive: true });

	return {
		savePrompt(promptId: string, prompt: string, criteria: { dos: string; donts: string }): void {
			const promptDir = path.join(outputDir, `prompt-${promptId}`);
			fs.mkdirSync(promptDir, { recursive: true });

			// Save prompt text
			fs.writeFileSync(path.join(promptDir, 'prompt.txt'), prompt, 'utf-8');

			// Save criteria
			fs.writeFileSync(
				path.join(promptDir, 'criteria.json'),
				JSON.stringify(criteria, null, 2),
				'utf-8',
			);

			log.verbose(`  📁 Saved prompt artifacts to ${promptDir}`);
		},

		saveGeneration(promptId: string, genIndex: number, result: GenerationResult): void {
			const genDir = path.join(outputDir, `prompt-${promptId}`, `gen-${genIndex + 1}`);
			fs.mkdirSync(genDir, { recursive: true });

			// Save workflow as importable n8n JSON
			const workflowForExport = {
				name: result.workflow.name ?? `Generated Workflow - Gen ${genIndex + 1}`,
				nodes: result.workflow.nodes ?? [],
				connections: result.workflow.connections ?? {},
			};
			fs.writeFileSync(
				path.join(genDir, 'workflow.json'),
				JSON.stringify(workflowForExport, null, 2),
				'utf-8',
			);

			// Save evaluation results
			const evalResult = {
				generationIndex: genIndex + 1,
				majorityPass: result.majorityPass,
				primaryPasses: result.primaryPasses,
				numJudges: result.judgeResults.length,
				diagnosticScore: result.avgDiagnosticScore,
				judges: result.judgeResults.map((jr, i) => ({
					judgeIndex: i + 1,
					primaryPass: jr.primaryPass,
					diagnosticScore: jr.diagnosticScore,
					violations: jr.violations,
					passes: jr.passes,
				})),
			};
			fs.writeFileSync(
				path.join(genDir, 'evaluation.json'),
				JSON.stringify(evalResult, null, 2),
				'utf-8',
			);

			log.verbose(`  📁 Saved gen-${genIndex + 1} artifacts to ${genDir}`);
		},

		saveSummary(
			results: Array<{ promptId: string; aggregation: MultiGenerationAggregation }>,
		): void {
			const summary = {
				timestamp: new Date().toISOString(),
				totalPrompts: results.length,
				results: results.map((r) => ({
					promptId: r.promptId,
					generationCorrectness: r.aggregation.generationCorrectness,
					aggregatedDiagnosticScore: r.aggregation.aggregatedDiagnosticScore,
					passingGenerations: r.aggregation.passingGenerations,
					totalGenerations: r.aggregation.totalGenerations,
				})),
				averageGenerationCorrectness:
					results.reduce((sum, r) => sum + r.aggregation.generationCorrectness, 0) / results.length,
				averageDiagnosticScore:
					results.reduce((sum, r) => sum + r.aggregation.aggregatedDiagnosticScore, 0) /
					results.length,
			};
			fs.writeFileSync(
				path.join(outputDir, 'summary.json'),
				JSON.stringify(summary, null, 2),
				'utf-8',
			);

			log.info(`📁 Saved summary to ${path.join(outputDir, 'summary.json')}`);
		},
	};
}
