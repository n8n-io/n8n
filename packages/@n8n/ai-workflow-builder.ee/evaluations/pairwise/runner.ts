import { evaluate } from 'langsmith/evaluation';
import type { Example } from 'langsmith/schemas';
import pc from 'picocolors';

import { createPairwiseTarget, generateWorkflow } from './generator';
import { aggregateGenerations, runJudgePanel, type GenerationResult } from './judge-panel';
import { pairwiseLangsmithEvaluator } from './metrics-builder';
import type { BuilderFeatureFlags } from '../../src/workflow-builder-agent';
import { DEFAULTS } from '../constants';
import { setupTestEnvironment } from '../core/environment';
import { createArtifactSaver } from '../utils/artifact-saver';
import { formatHeader } from '../utils/evaluation-helpers';
import { createLogger, type EvalLogger } from '../utils/logger';

// ============================================================================
// Helpers
// ============================================================================

/** Extract notion_id from metadata if present */
function getNotionId(metadata: unknown): string | undefined {
	if (typeof metadata === 'object' && metadata !== null && 'notion_id' in metadata) {
		const id = (metadata as { notion_id: unknown }).notion_id;
		return typeof id === 'string' ? id : undefined;
	}
	return undefined;
}

/** Extract categories from metadata if present */
function getCategories(metadata: unknown): string[] | undefined {
	if (typeof metadata === 'object' && metadata !== null && 'categories' in metadata) {
		const categories = (metadata as { categories: unknown }).categories;
		return Array.isArray(categories)
			? categories.filter((c): c is string => typeof c === 'string')
			: undefined;
	}
	return undefined;
}

/** Filter examples by notion_id, technique, or limit count */
function filterExamples(
	allExamples: Example[],
	notionId: string | undefined,
	technique: string | undefined,
	maxExamples: number | undefined,
	log: EvalLogger,
): Example[] {
	if (notionId) {
		log.warn(`🔍 Filtering by notion_id: ${notionId}`);
		const filtered = allExamples.filter((e) => getNotionId(e.metadata) === notionId);

		if (filtered.length === 0) {
			const availableIds = allExamples.map((e) => getNotionId(e.metadata)).filter(Boolean);
			throw new Error(
				`No example found with notion_id: ${notionId}. Available: ${availableIds.join(', ')}`,
			);
		}

		log.success(`✅ Found ${filtered.length} example(s)`);
		log.verbose(`Metadata: ${JSON.stringify(filtered[0].metadata, null, 2)}`);
		return filtered;
	}

	if (technique) {
		log.warn(`🔍 Filtering by technique: ${technique}`);
		const filtered = allExamples.filter((e) => {
			const categories = getCategories(e.metadata);
			return categories?.includes(technique);
		});

		if (filtered.length === 0) {
			const availableTechniques = new Set<string>();
			for (const example of allExamples) {
				const categories = getCategories(example.metadata);
				if (categories) {
					for (const category of categories) {
						availableTechniques.add(category);
					}
				}
			}
			throw new Error(
				`No examples found with technique: ${technique}. Available techniques: ${Array.from(availableTechniques).sort().join(', ')}`,
			);
		}

		log.success(`✅ Found ${filtered.length} example(s) with technique "${technique}"`);
		log.verbose(`First example metadata: ${JSON.stringify(filtered[0].metadata, null, 2)}`);
		return filtered;
	}

	if (maxExamples && maxExamples > 0) {
		log.warn(`➔ Limiting to ${maxExamples} example(s)`);
		return allExamples.slice(0, maxExamples);
	}

	return allExamples;
}

/** Log enabled feature flags */
function logFeatureFlags(log: EvalLogger, featureFlags?: BuilderFeatureFlags): void {
	if (!featureFlags) return;
	const enabledFlags = Object.entries(featureFlags)
		.filter(([, v]) => v === true)
		.map(([k]) => k);
	if (enabledFlags.length > 0) {
		log.success(`➔ Feature flags enabled: ${enabledFlags.join(', ')}`);
	}
}

/** Log configuration for pairwise evaluation */
function logPairwiseConfig(
	log: EvalLogger,
	options: {
		experimentName: string;
		numGenerations: number;
		numJudges: number;
		repetitions: number;
		concurrency: number;
	},
): void {
	const { experimentName, numGenerations, numJudges, repetitions, concurrency } = options;
	log.info(`➔ Experiment: ${experimentName}`);
	log.info(
		`➔ Config: ${numGenerations} gen(s) × ${numJudges} judges × ${repetitions} reps (concurrency: ${concurrency})${log.isVerbose ? ' (verbose)' : ''}`,
	);
	if (numGenerations > 1) {
		log.verbose('   Generation Correctness: (# passing gens) / total gens');
		log.verbose('   Aggregated Diagnostic: average across all generations');
	} else {
		log.verbose('   Primary: ALL criteria must pass → majority vote');
		log.verbose('   Secondary: Average diagnostic score');
	}
}

/** Validate common pairwise evaluation inputs */
function validatePairwiseInputs(numJudges: number, numGenerations: number): void {
	if (numJudges < 1) {
		throw new Error('numJudges must be at least 1');
	}
	if (numGenerations < 1) {
		throw new Error('numGenerations must be at least 1');
	}
}

/** Display results for local pairwise evaluation */
function displayLocalResults(
	log: EvalLogger,
	options: {
		generationResults: GenerationResult[];
		numJudges: number;
		numGenerations: number;
		totalTime: number;
		verbose: boolean;
	},
): void {
	const { generationResults, numJudges, numGenerations, totalTime, verbose } = options;

	// Defensive check - should never happen due to validation, but prevents runtime errors
	if (generationResults.length === 0) {
		log.error('No generation results to display');
		return;
	}

	const aggregation = aggregateGenerations(generationResults);

	// Display aggregated result
	if (numGenerations > 1) {
		log.info(
			`\n📊 Generation Correctness: ${aggregation.passingGenerations}/${aggregation.totalGenerations} → ` +
				`${aggregation.generationCorrectness >= 0.5 ? pc.green(aggregation.generationCorrectness.toFixed(2)) : pc.red(aggregation.generationCorrectness.toFixed(2))}`,
		);
		log.info(
			`   Aggregated Diagnostic: ${(aggregation.aggregatedDiagnosticScore * 100).toFixed(0)}%`,
		);
	} else {
		// Single generation - show original format
		const firstGen = generationResults[0];
		log.info(
			`\n📊 Result: ${firstGen.primaryPasses}/${numJudges} judges → ` +
				`${firstGen.majorityPass ? pc.green('PASS') : pc.red('FAIL')} ` +
				`(${(firstGen.avgDiagnosticScore * 100).toFixed(0)}%)`,
		);
	}
	log.dim(`   Timing: ${totalTime.toFixed(1)}s total`);

	// Per-generation breakdown (verbose or multi-gen)
	if (verbose && numGenerations > 1) {
		log.info(pc.dim('\nPer-generation breakdown:'));
		generationResults.forEach((g, i) => {
			log.info(
				pc.dim(
					`  Gen ${i + 1}: ${g.majorityPass ? 'PASS' : 'FAIL'} ` +
						`(${g.primaryPasses}/${numJudges} judges, ${(g.avgDiagnosticScore * 100).toFixed(0)}%)`,
				),
			);
		});
	}

	// Show violations if any (from first generation for simplicity)
	const allViolations = generationResults[0].judgeResults.flatMap((r, i) =>
		r.violations.map((v) => ({ judge: i + 1, rule: v.rule, justification: v.justification })),
	);
	if (allViolations.length > 0) {
		log.info(pc.yellow('\nViolations (Gen 1):'));
		for (const v of allViolations) {
			log.info(pc.dim(`  [Judge ${v.judge}] ${v.rule}: ${v.justification}`));
		}
	}

	// Show workflow summary
	if (verbose && generationResults[0].workflow.nodes) {
		log.info(pc.dim('\nWorkflow nodes (Gen 1):'));
		for (const node of generationResults[0].workflow.nodes) {
			log.info(pc.dim(`  - ${node.name} (${node.type})`));
		}
	}
}

// ============================================================================
// Public API - LangSmith Evaluation
// ============================================================================

export interface PairwiseEvaluationOptions {
	repetitions?: number;
	notionId?: string;
	technique?: string;
	numJudges?: number;
	numGenerations?: number;
	verbose?: boolean;
	experimentName?: string;
	concurrency?: number;
	maxExamples?: number;
	featureFlags?: BuilderFeatureFlags;
}

/**
 * Runs pairwise evaluation using LangSmith.
 * Generates workflows from dataset prompts and evaluates them against do/don't criteria.
 */
export async function runPairwiseLangsmithEvaluation(
	options: PairwiseEvaluationOptions = {},
): Promise<void> {
	const {
		repetitions = DEFAULTS.REPETITIONS,
		notionId,
		technique,
		numJudges = DEFAULTS.NUM_JUDGES,
		numGenerations = DEFAULTS.NUM_GENERATIONS,
		verbose = false,
		experimentName = DEFAULTS.EXPERIMENT_NAME,
		concurrency = DEFAULTS.CONCURRENCY,
		maxExamples,
		featureFlags,
	} = options;
	const log = createLogger(verbose);

	console.log(formatHeader('AI Workflow Builder Pairwise Evaluation', 70));
	logPairwiseConfig(log, { experimentName, numGenerations, numJudges, repetitions, concurrency });

	logFeatureFlags(log, featureFlags);

	try {
		validatePairwiseInputs(numJudges, numGenerations);

		if (!process.env.LANGSMITH_API_KEY) {
			throw new Error('LANGSMITH_API_KEY environment variable not set');
		}

		// Ensure LANGSMITH_TRACING is enabled
		if (!process.env.LANGSMITH_TRACING) {
			process.env.LANGSMITH_TRACING = 'true';
			log.verbose('➔ Enabled LANGSMITH_TRACING=true');
		}

		const { parsedNodeTypes, llm, lsClient } = await setupTestEnvironment();

		if (!lsClient) {
			throw new Error('Langsmith client not initialized');
		}

		const datasetName = process.env.LANGSMITH_DATASET_NAME ?? DEFAULTS.DATASET_NAME;
		log.info(`➔ Dataset: ${datasetName}`);

		// Verify dataset exists
		let datasetId: string;
		try {
			const dataset = await lsClient.readDataset({ datasetName });
			datasetId = dataset.id;
		} catch {
			throw new Error(`Dataset "${datasetName}" not found`);
		}

		// Fetch and filter examples
		const allExamples: Example[] = [];
		log.verbose('➔ Fetching examples from dataset...');
		for await (const example of lsClient.listExamples({ datasetId })) {
			allExamples.push(example);
		}
		log.verbose(`📊 Total examples in dataset: ${allExamples.length}`);

		const data = filterExamples(allExamples, notionId, technique, maxExamples, log);
		log.info(`➔ Running ${data.length} example(s) × ${repetitions} rep(s)`);

		// Create target (does all work) and evaluator (extracts pre-computed metrics)
		const target = createPairwiseTarget({
			parsedNodeTypes,
			llm,
			numJudges,
			numGenerations,
			featureFlags,
			experimentName,
		});
		const evaluator = pairwiseLangsmithEvaluator;

		const evalStartTime = Date.now();

		// Determine run type for metadata
		let runType: 'full' | 'by-category' | 'by-id';
		let filterValue: string | undefined;
		if (notionId) {
			runType = 'by-id';
			filterValue = notionId;
		} else if (technique) {
			runType = 'by-category';
			filterValue = technique;
		} else {
			runType = 'full';
		}

		// Run evaluation using LangSmith's built-in features
		await evaluate(target, {
			data,
			evaluators: [evaluator],
			maxConcurrency: concurrency,
			experimentPrefix: experimentName,
			numRepetitions: repetitions,
			metadata: {
				numJudges,
				numGenerations,
				repetitions,
				concurrency,
				scoringMethod: numGenerations > 1 ? 'hierarchical-multi-generation' : 'hierarchical',
				runType,
				...(filterValue && { filterValue }),
			},
		});

		const totalEvalTime = Date.now() - evalStartTime;

		log.success('\n✓ Pairwise evaluation completed');
		log.dim(`   Total time: ${(totalEvalTime / 1000).toFixed(1)}s`);
		log.dim('   View results in LangSmith dashboard');
	} catch (error) {
		log.error(
			`✗ Pairwise evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exit(1);
	}
}

// ============================================================================
// Public API - Local Evaluation
// ============================================================================

export interface LocalPairwiseOptions {
	prompt: string;
	criteria: { dos: string; donts: string };
	numJudges?: number;
	numGenerations?: number;
	verbose?: boolean;
	outputDir?: string;
	featureFlags?: BuilderFeatureFlags;
}

/**
 * Runs a single pairwise evaluation locally without LangSmith.
 * Useful for testing prompts and criteria before running full dataset evaluation.
 */
export async function runLocalPairwiseEvaluation(options: LocalPairwiseOptions): Promise<void> {
	const {
		prompt,
		criteria,
		numJudges = DEFAULTS.NUM_JUDGES,
		numGenerations = DEFAULTS.NUM_GENERATIONS,
		verbose = false,
		outputDir,
		featureFlags,
	} = options;
	const log = createLogger(verbose);

	console.log(formatHeader('Local Pairwise Evaluation', 50));
	log.info(`➔ Generations: ${numGenerations}, Judges: ${numJudges}`);
	if (outputDir) {
		log.info(`➔ Output directory: ${outputDir}`);
	}
	log.verbose(`➔ Prompt: ${prompt.slice(0, 80)}${prompt.length > 80 ? '...' : ''}`);
	log.verbose(`➔ Dos: ${criteria.dos.slice(0, 60)}${criteria.dos.length > 60 ? '...' : ''}`);
	if (criteria.donts) {
		log.verbose(
			`➔ Donts: ${criteria.donts.slice(0, 60)}${criteria.donts.length > 60 ? '...' : ''}`,
		);
	}

	const startTime = Date.now();

	try {
		validatePairwiseInputs(numJudges, numGenerations);

		const { parsedNodeTypes, llm } = await setupTestEnvironment();

		// Create artifact saver if output directory is configured
		const artifactSaver = createArtifactSaver(outputDir, log);
		const promptId = 'local';

		// Save prompt artifacts
		artifactSaver?.savePrompt(promptId, prompt, criteria);

		log.info(`➔ Running ${numGenerations} generation(s)...`);

		// Run all generations in parallel
		const generationResults: GenerationResult[] = await Promise.all(
			Array.from({ length: numGenerations }, async (_, genIndex) => {
				const genStartTime = Date.now();

				// Generate workflow
				const workflow = await generateWorkflow(parsedNodeTypes, llm, prompt, featureFlags);
				const genTime = (Date.now() - genStartTime) / 1000;

				log.verbose(
					`  Gen ${genIndex + 1}: Workflow done (${workflow?.nodes?.length ?? 0} nodes) [${genTime.toFixed(1)}s]`,
				);

				// Run judge panel
				const panelResult = await runJudgePanel(llm, workflow, criteria, numJudges);

				log.verbose(
					`  Gen ${genIndex + 1}: ${panelResult.majorityPass ? '✓ PASS' : '✗ FAIL'} (${panelResult.primaryPasses}/${numJudges} judges, ${(panelResult.avgDiagnosticScore * 100).toFixed(0)}%)`,
				);

				return { workflow, ...panelResult };
			}),
		);

		// Save generation artifacts
		if (artifactSaver) {
			for (let i = 0; i < generationResults.length; i++) {
				artifactSaver.saveGeneration(promptId, i, generationResults[i]);
			}
		}

		const totalTime = (Date.now() - startTime) / 1000;
		displayLocalResults(log, { generationResults, numJudges, numGenerations, totalTime, verbose });
	} catch (error) {
		log.error(
			`✗ Local evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exit(1);
	}
}
