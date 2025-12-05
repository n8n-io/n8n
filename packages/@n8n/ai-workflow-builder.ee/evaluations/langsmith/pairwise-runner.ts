import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import * as fs from 'fs';
import { evaluate } from 'langsmith/evaluation';
import type { EvaluationResult as LangsmithEvaluationResult } from 'langsmith/evaluation';
import type { Run, Example } from 'langsmith/schemas';
import type { INodeTypeDescription } from 'n8n-workflow';
import * as path from 'path';
import pc from 'picocolors';

import type { SimpleWorkflow } from '../../src/types/workflow';
import type { BuilderFeatureFlags } from '../../src/workflow-builder-agent';
import {
	evaluateWorkflowPairwise,
	type PairwiseEvaluationResult,
} from '../chains/pairwise-evaluator';
import { setupTestEnvironment, createAgent } from '../core/environment';
import { generateRunId, isWorkflowStateValues } from '../types/langsmith';
import { consumeGenerator, formatHeader, getChatPayload } from '../utils/evaluation-helpers';
import { createLogger, type EvalLogger } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

interface PairwiseDatasetInput {
	evals: {
		dos: string;
		donts: string;
	};
	prompt: string;
}

interface GenerationResult {
	workflow: SimpleWorkflow;
	judgeResults: PairwiseEvaluationResult[];
	primaryPasses: number;
	majorityPass: boolean;
	avgDiagnosticScore: number;
}

interface MultiGenerationAggregation {
	/** Generation correctness: (# passing generations) / total generations */
	generationCorrectness: number;
	/** Average diagnostic score across all generations */
	aggregatedDiagnosticScore: number;
	/** Number of generations that passed majority vote */
	passingGenerations: number;
	/** Total number of generations run */
	totalGenerations: number;
	/** Detailed results for each generation */
	generationDetails: GenerationResult[];
}

interface PairwiseGeneratorOutput {
	workflow: SimpleWorkflow;
	evalCriteria: PairwiseDatasetInput['evals'];
	prompt: string;
	evaluationResults: LangsmithEvaluationResult[];
	/** Multi-generation aggregation data (present when numGenerations > 1) */
	multiGenerationAggregation?: MultiGenerationAggregation;
}

function isPairwiseGeneratorOutput(outputs: unknown): outputs is PairwiseGeneratorOutput {
	if (!outputs || typeof outputs !== 'object') return false;

	const obj = outputs as Record<string, unknown>;

	if (!obj.workflow || typeof obj.workflow !== 'object') return false;
	if (!obj.evalCriteria || typeof obj.evalCriteria !== 'object') return false;
	if (!obj.evaluationResults || !Array.isArray(obj.evaluationResults)) return false;

	return true;
}

// ============================================================================
// Helpers
// ============================================================================

const DEFAULT_NUM_JUDGES = 3;
const DEFAULT_NUM_GENERATIONS = 1;
const DEFAULT_EXPERIMENT_NAME = 'pairwise-evals';

// ============================================================================
// Artifact Saver
// ============================================================================

interface ArtifactSaver {
	savePrompt(promptId: string, prompt: string, criteria: { dos: string; donts: string }): void;
	saveGeneration(promptId: string, genIndex: number, result: GenerationResult): void;
	saveSummary(results: Array<{ promptId: string; aggregation: MultiGenerationAggregation }>): void;
}

/** Creates an artifact saver if outputDir is provided, otherwise returns null */
function createArtifactSaver(outputDir: string | undefined, log: EvalLogger): ArtifactSaver | null {
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

/** Calculate minimum judges needed for majority (e.g., 2 for 3 judges, 3 for 5 judges) */
function getMajorityThreshold(numJudges: number): number {
	return Math.ceil(numJudges / 2);
}

/** Extract notion_id from metadata if present */
function getNotionId(metadata: unknown): string | undefined {
	if (typeof metadata === 'object' && metadata !== null && 'notion_id' in metadata) {
		const id = (metadata as { notion_id: unknown }).notion_id;
		return typeof id === 'string' ? id : undefined;
	}
	return undefined;
}

/** Build LangSmith-compatible evaluation results from judge panel output */
function buildLangsmithResults(
	judgeResults: PairwiseEvaluationResult[],
	numJudges: number,
	primaryPasses: number,
	majorityPass: boolean,
	avgDiagnosticScore: number,
): LangsmithEvaluationResult[] {
	const allViolations = judgeResults.flatMap((r, i) =>
		r.violations.map((v) => `[Judge ${i + 1}] ${v.rule}: ${v.justification}`),
	);
	const allPasses = judgeResults.flatMap((r, i) =>
		r.passes.map((p) => `[Judge ${i + 1}] ${p.rule}`),
	);

	const comment = [
		`Majority vote: ${primaryPasses}/${numJudges} judges passed`,
		allViolations.length > 0 ? `\nViolations:\n${allViolations.join('\n')}` : '',
		allPasses.length > 0 ? `\nPasses:\n${allPasses.join('\n')}` : '',
	]
		.filter(Boolean)
		.join('');

	return [
		{ key: 'pairwise_primary', score: majorityPass ? 1 : 0, comment },
		{
			key: 'pairwise_diagnostic',
			score: avgDiagnosticScore,
			comment: `Average diagnostic score across ${numJudges} judges`,
		},
		{
			key: 'pairwise_judges_passed',
			score: primaryPasses,
			comment: `${primaryPasses} of ${numJudges} judges returned primaryPass=true`,
		},
		{
			key: 'pairwise_total_violations',
			score: judgeResults.reduce((sum, r) => sum + r.violations.length, 0),
		},
		{
			key: 'pairwise_total_passes',
			score: judgeResults.reduce((sum, r) => sum + r.passes.length, 0),
		},
	];
}

/** Build LangSmith-compatible evaluation results for multi-generation aggregation */
function buildMultiGenerationLangsmithResults(
	aggregation: MultiGenerationAggregation,
	numJudges: number,
): LangsmithEvaluationResult[] {
	const { generationCorrectness, aggregatedDiagnosticScore, passingGenerations, totalGenerations } =
		aggregation;

	// Build detailed comment with per-generation breakdown
	const genBreakdown = aggregation.generationDetails
		.map(
			(g, i) =>
				`Gen ${i + 1}: ${g.majorityPass ? 'PASS' : 'FAIL'} (${g.primaryPasses}/${numJudges} judges, ${(g.avgDiagnosticScore * 100).toFixed(0)}%)`,
		)
		.join('\n');

	const comment = [
		`Generation Correctness: ${passingGenerations}/${totalGenerations} generations passed`,
		`\nPer-generation breakdown:\n${genBreakdown}`,
	].join('');

	// Use first generation for backward-compatible metrics
	const firstGen = aggregation.generationDetails[0];

	// Aggregate counts across all generations
	const totalJudgesPassed = aggregation.generationDetails.reduce(
		(sum, g) => sum + g.primaryPasses,
		0,
	);
	const totalViolations = aggregation.generationDetails.reduce(
		(sum, g) => sum + g.judgeResults.reduce((jSum, r) => jSum + r.violations.length, 0),
		0,
	);
	const totalPasses = aggregation.generationDetails.reduce(
		(sum, g) => sum + g.judgeResults.reduce((jSum, r) => jSum + r.passes.length, 0),
		0,
	);

	return [
		// Primary aggregated metrics (new)
		{
			key: 'pairwise_generation_correctness',
			score: generationCorrectness,
			comment: `${passingGenerations} of ${totalGenerations} generations passed majority vote`,
		},
		{
			key: 'pairwise_aggregated_diagnostic',
			score: aggregatedDiagnosticScore,
			comment: `Average diagnostic score across ${totalGenerations} generations`,
		},
		// Legacy metrics (backward compat, use first generation)
		{
			key: 'pairwise_primary',
			score: firstGen.majorityPass ? 1 : 0,
			comment: `First generation: ${firstGen.primaryPasses}/${numJudges} judges passed`,
		},
		{
			key: 'pairwise_diagnostic',
			score: firstGen.avgDiagnosticScore,
			comment: 'First generation diagnostic score',
		},
		// Summary metrics
		{
			key: 'pairwise_generations_passed',
			score: passingGenerations,
			comment,
		},
		{
			key: 'pairwise_total_judge_calls',
			score: totalGenerations * numJudges,
			comment: `${totalGenerations} generations x ${numJudges} judges`,
		},
		// Aggregated detail metrics (across all generations)
		{
			key: 'pairwise_judges_passed',
			score: totalJudgesPassed,
			comment: `${totalJudgesPassed} of ${totalGenerations * numJudges} total judge calls passed`,
		},
		{
			key: 'pairwise_total_violations',
			score: totalViolations,
			comment: `Total violations across all ${totalGenerations} generations`,
		},
		{
			key: 'pairwise_total_passes',
			score: totalPasses,
			comment: `Total criteria passes across all ${totalGenerations} generations`,
		},
	];
}

/** Run a single generation and its judge panel */
async function runSingleGeneration(
	parsedNodeTypes: INodeTypeDescription[],
	llm: BaseChatModel,
	numJudges: number,
	inputs: PairwiseDatasetInput,
	generationIndex: number,
	log: EvalLogger,
	featureFlags?: BuilderFeatureFlags,
	tracer?: LangChainTracer,
): Promise<GenerationResult> {
	const startTime = Date.now();
	const runId = generateRunId();

	// Create dedicated agent for this generation
	const agent = createAgent(parsedNodeTypes, llm, tracer, featureFlags);

	// Generate workflow
	await consumeGenerator(
		agent.chat(getChatPayload(inputs.prompt, runId, featureFlags), `pairwise-gen-${generationIndex}`),
	);

	const state = await agent.getState(runId, `pairwise-gen-${generationIndex}`);

	if (!state.values || !isWorkflowStateValues(state.values)) {
		throw new Error(`Invalid workflow state for generation ${generationIndex + 1}`);
	}

	const workflow = state.values.workflowJSON;
	const genTime = (Date.now() - startTime) / 1000;

	log.verbose(
		`  Gen ${generationIndex + 1}: Workflow done (${workflow?.nodes?.length ?? 0} nodes) [${genTime.toFixed(1)}s]`,
	);

	// Run judges for this generation in parallel
	const judgeResults = await Promise.all(
		Array.from({ length: numJudges }, async () => {
			return await evaluateWorkflowPairwise(llm, {
				workflowJSON: workflow,
				evalCriteria: inputs.evals,
			});
		}),
	);

	// Aggregate judge results for this generation
	const primaryPasses = judgeResults.filter((r) => r.primaryPass).length;
	const majorityPass = primaryPasses >= getMajorityThreshold(numJudges);
	const avgDiagnosticScore =
		judgeResults.reduce((sum, r) => sum + r.diagnosticScore, 0) / numJudges;

	// Log per-generation judge results
	const totalViolations = judgeResults.reduce((sum, r) => sum + r.violations.length, 0);
	log.verbose(
		`  Gen ${generationIndex + 1}: ${primaryPasses}/${numJudges} judges → ` +
			`${majorityPass ? '✓ PASS' : '✗ FAIL'} (diag=${(avgDiagnosticScore * 100).toFixed(0)}%` +
			`${totalViolations > 0 ? `, ${totalViolations} violations` : ''})`,
	);

	return {
		workflow,
		judgeResults,
		primaryPasses,
		majorityPass,
		avgDiagnosticScore,
	};
}

// ============================================================================
// Workflow Generator (for LangSmith)
// ============================================================================

// Counter to track generations across repetitions
let generationCounter = 0;

/** Creates a generator function that produces workflows and runs judge evaluation */
function createPairwiseWorkflowGenerator(
	parsedNodeTypes: INodeTypeDescription[],
	llm: BaseChatModel,
	numJudges: number,
	numGenerations: number,
	log: EvalLogger,
	artifactSaver: ArtifactSaver | null,
	featureFlags?: BuilderFeatureFlags,
	tracer?: LangChainTracer,
) {
	return async (inputs: PairwiseDatasetInput) => {
		const startTime = Date.now();
		generationCounter++;
		const currentEvalNumber = generationCounter;
		const promptId = String(currentEvalNumber);
		const promptPreview = inputs.prompt.slice(0, 60).replace(/\n/g, ' ');

		log.verbose(
			`\n🔄 [#${currentEvalNumber}] "${promptPreview}${inputs.prompt.length > 60 ? '...' : ''}"`,
		);
		log.verbose(`   Running ${numGenerations} generation(s) x ${numJudges} judges...`);

		// Save prompt artifacts if output dir is configured
		artifactSaver?.savePrompt(promptId, inputs.prompt, inputs.evals);

		// Run all generations in parallel
		const generationResults = await Promise.all(
			Array.from({ length: numGenerations }, async (_, i) => {
				return await runSingleGeneration(parsedNodeTypes, llm, numJudges, inputs, i, log, featureFlags, tracer);
			}),
		);

		// Save generation artifacts
		if (artifactSaver) {
			for (let i = 0; i < generationResults.length; i++) {
				artifactSaver.saveGeneration(promptId, i, generationResults[i]);
			}
		}

		// Aggregate across generations
		const passingGenerations = generationResults.filter((g) => g.majorityPass).length;
		const generationCorrectness = passingGenerations / numGenerations;
		const aggregatedDiagnosticScore =
			generationResults.reduce((sum, g) => sum + g.avgDiagnosticScore, 0) / numGenerations;

		const totalTime = (Date.now() - startTime) / 1000;

		// Log aggregated result
		console.log(
			pc.dim(
				`  📊 [#${currentEvalNumber}] ${passingGenerations}/${numGenerations} gens → ` +
					`${generationCorrectness >= 0.5 ? pc.green('PASS') : pc.red('FAIL')} ` +
					`(gen_corr=${generationCorrectness.toFixed(2)}, diag=${(aggregatedDiagnosticScore * 100).toFixed(0)}%) ` +
					`[${totalTime.toFixed(1)}s]`,
			),
		);

		// Build aggregation object
		const multiGenerationAggregation: MultiGenerationAggregation = {
			generationCorrectness,
			aggregatedDiagnosticScore,
			passingGenerations,
			totalGenerations: numGenerations,
			generationDetails: generationResults,
		};

		// Choose appropriate results builder based on numGenerations
		const evaluationResults =
			numGenerations > 1
				? buildMultiGenerationLangsmithResults(multiGenerationAggregation, numJudges)
				: buildLangsmithResults(
						generationResults[0].judgeResults,
						numJudges,
						generationResults[0].primaryPasses,
						generationResults[0].majorityPass,
						generationResults[0].avgDiagnosticScore,
					);

		return {
			workflow: generationResults[0].workflow,
			evalCriteria: inputs.evals,
			prompt: inputs.prompt,
			evaluationResults,
			multiGenerationAggregation: numGenerations > 1 ? multiGenerationAggregation : undefined,
		};
	};
}

// ============================================================================
// LangSmith Evaluator
// ============================================================================

/**
 * Simple evaluator that extracts pre-computed results from the generator output.
 * The actual judge evaluation is done in createPairwiseWorkflowGenerator for better parallelism.
 */
function createPairwiseLangsmithEvaluator() {
	return async (rootRun: Run, _example?: Example): Promise<LangsmithEvaluationResult[]> => {
		const outputs = rootRun.outputs;

		if (!isPairwiseGeneratorOutput(outputs)) {
			return [
				{
					key: 'pairwise_primary',
					score: 0,
					comment: 'Invalid output - missing evaluation results',
				},
				{ key: 'pairwise_diagnostic', score: 0 },
			];
		}

		// Just pass through the pre-computed results from the generator
		return outputs.evaluationResults;
	};
}

/** Filter examples by notion_id or limit count */
function filterExamples(
	allExamples: Example[],
	notionId: string | undefined,
	maxExamples: number | undefined,
	log: EvalLogger,
): Example[] {
	if (notionId) {
		log.warn(`🔍 Filtering by notion_id: ${notionId}`);
		const filtered = allExamples.filter((e) => getNotionId(e.metadata) === notionId);

		if (filtered.length === 0) {
			log.error(`❌ No example found with notion_id: ${notionId}`);
			const availableIds = allExamples.map((e) => getNotionId(e.metadata)).filter(Boolean);
			log.dim(`Available: ${availableIds.join(', ')}`);
			process.exit(1);
		}

		log.success(`✅ Found ${filtered.length} example(s)`);
		log.verbose(`Metadata: ${JSON.stringify(filtered[0].metadata, null, 2)}`);
		return filtered;
	}

	if (maxExamples && maxExamples > 0) {
		log.warn(`➔ Limiting to ${maxExamples} example(s)`);
		return allExamples.slice(0, maxExamples);
	}

	return allExamples;
}

/** Create repeated data array for LangSmith evaluation */
function createRepeatedData(data: Example[], repetitions: number): Example[] {
	const repeatedData: Example[] = [];
	for (let i = 0; i < repetitions; i++) {
		repeatedData.push(...data);
	}
	return repeatedData;
}

// ============================================================================
// Public API
// ============================================================================

export interface PairwiseEvaluationOptions {
	repetitions?: number;
	notionId?: string;
	numJudges?: number;
	numGenerations?: number;
	verbose?: boolean;
	experimentName?: string;
	outputDir?: string;
	concurrency?: number;
	maxExamples?: number;
	featureFlags?: BuilderFeatureFlags;
}

/** Log enabled feature flags */
function logFeatureFlags(featureFlags?: BuilderFeatureFlags): void {
	if (!featureFlags) return;
	const enabledFlags = Object.entries(featureFlags)
		.filter(([, v]) => v === true)
		.map(([k]) => k);
	if (enabledFlags.length > 0) {
		console.log(pc.green(`➔ Feature flags enabled: ${enabledFlags.join(', ')}`));
	}
}

/** Log configuration for pairwise evaluation */
function logPairwiseConfig(
	log: EvalLogger,
	experimentName: string,
	numGenerations: number,
	numJudges: number,
	repetitions: number,
	concurrency: number,
	verbose: boolean,
): void {
	log.info(`➔ Experiment: ${experimentName}`);
	log.info(
		`➔ Config: ${numGenerations} gen(s) × ${numJudges} judges × ${repetitions} reps (concurrency: ${concurrency})${verbose ? ' (verbose)' : ''}`,
	);
	if (numGenerations > 1) {
		log.verbose('   Generation Correctness: (# passing gens) / total gens');
		log.verbose('   Aggregated Diagnostic: average across all generations');
	} else {
		log.verbose('   Primary: ALL criteria must pass → majority vote');
		log.verbose('   Secondary: Average diagnostic score');
	}
}

/**
 * Runs pairwise evaluation using LangSmith.
 * Generates workflows from dataset prompts and evaluates them against do/don't criteria.
 */
export async function runPairwiseLangsmithEvaluation(
	options: PairwiseEvaluationOptions = {},
): Promise<void> {
	const {
		repetitions = 1,
		notionId,
		numJudges = DEFAULT_NUM_JUDGES,
		numGenerations = DEFAULT_NUM_GENERATIONS,
		verbose = false,
		experimentName = DEFAULT_EXPERIMENT_NAME,
		outputDir,
		concurrency = 5,
		maxExamples,
		featureFlags,
	} = options;
	const log = createLogger(verbose);

	console.log(formatHeader('AI Workflow Builder Pairwise Evaluation', 70));
	logPairwiseConfig(
		log,
		experimentName,
		numGenerations,
		numJudges,
		repetitions,
		concurrency,
		verbose,
	);

	if (outputDir) {
		log.info(`➔ Output directory: ${outputDir}`);
	}

	logFeatureFlags(featureFlags);

	if (!process.env.LANGSMITH_API_KEY) {
		log.error('✗ LANGSMITH_API_KEY environment variable not set');
		process.exit(1);
	}

	// Reset counter for this run
	generationCounter = 0;

	try {
		const { parsedNodeTypes, llm, tracer, lsClient } = await setupTestEnvironment();

		if (!lsClient) {
			throw new Error('Langsmith client not initialized');
		}

		const datasetName = process.env.LANGSMITH_DATASET_NAME ?? 'notion-pairwise-workflows';
		log.info(`➔ Dataset: ${datasetName}`);

		// Verify dataset exists and get dataset info
		let datasetId: string;
		try {
			const dataset = await lsClient.readDataset({ datasetName });
			datasetId = dataset.id;
		} catch (error) {
			log.error(`✗ Dataset "${datasetName}" not found`);
			process.exit(1);
		}

		// Fetch all examples from dataset for filtering/inspection
		const allExamples: Example[] = [];
		log.verbose('➔ Fetching examples from dataset...');
		for await (const example of lsClient.listExamples({ datasetId })) {
			// Log first example structure for debugging (verbose only)
			if (allExamples.length === 0) {
				log.verbose(
					`📊 First example: ${JSON.stringify(
						{
							id: example.id,
							metadata: example.metadata,
							inputsKeys: Object.keys(example.inputs ?? {}),
						},
						null,
						2,
					)}`,
				);
			}
			allExamples.push(example);
		}
		log.verbose(`📊 Total examples in dataset: ${allExamples.length}`);

		// Filter examples based on notionId or maxExamples
		const data = filterExamples(allExamples, notionId, maxExamples, log);

		// Create artifact saver if output directory is configured
		const artifactSaver = createArtifactSaver(outputDir, log);

		// NOTE: LangSmith's numRepetitions doesn't work when passing Example[] array directly
		// (it only works with dataset names). We manually duplicate examples to work around this.
		const repeatedData = createRepeatedData(data, repetitions);

		log.info(`➔ Running ${data.length} × ${repetitions} = ${repeatedData.length} generations`);

		const generateWorkflow = createPairwiseWorkflowGenerator(
			parsedNodeTypes,
			llm,
			numJudges,
			numGenerations,
			log,
			artifactSaver,
			featureFlags,
			tracer,
		);
		const evaluator = createPairwiseLangsmithEvaluator();

		const evalStartTime = Date.now();

		await evaluate(generateWorkflow, {
			data: repeatedData,
			evaluators: [evaluator],
			maxConcurrency: concurrency,
			experimentPrefix: experimentName,
			// numRepetitions not used - we manually duplicate examples above
			metadata: {
				numJudges,
				numGenerations,
				repetitions,
				concurrency,
				scoringMethod: numGenerations > 1 ? 'hierarchical-multi-generation' : 'hierarchical',
			},
		});

		const totalEvalTime = Date.now() - evalStartTime;

		log.success('\n✓ Pairwise evaluation completed');
		log.dim(
			`   Prompts evaluated: ${generationCounter} | ` +
				`Total workflow generations: ${generationCounter * numGenerations} | ` +
				`Judge calls: ${generationCounter * numGenerations * numJudges}`,
		);
		log.dim(`   Total time: ${(totalEvalTime / 1000).toFixed(1)}s`);
		log.dim('   View results in LangSmith dashboard');
	} catch (error) {
		log.error(
			`✗ Pairwise evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exit(1);
	}
}

export interface LocalPairwiseOptions {
	prompt: string;
	criteria: { dos: string; donts: string };
	numJudges?: number;
	numGenerations?: number;
	verbose?: boolean;
	outputDir?: string;
	featureFlags?: BuilderFeatureFlags;
}

/** Log configuration for local pairwise evaluation */
function logLocalPairwiseConfig(
	log: EvalLogger,
	numGenerations: number,
	numJudges: number,
	outputDir: string | undefined,
	prompt: string,
	criteria: { dos: string; donts: string },
): void {
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
}

/**
 * Runs a single pairwise evaluation locally without LangSmith.
 * Useful for testing prompts and criteria before running full dataset evaluation.
 */
export async function runLocalPairwiseEvaluation(options: LocalPairwiseOptions): Promise<void> {
	const {
		prompt,
		criteria,
		numJudges = DEFAULT_NUM_JUDGES,
		numGenerations = DEFAULT_NUM_GENERATIONS,
		verbose = false,
		outputDir,
		featureFlags,
	} = options;
	const log = createLogger(verbose);

	console.log(formatHeader('Local Pairwise Evaluation', 50));
	logLocalPairwiseConfig(log, numGenerations, numJudges, outputDir, prompt, criteria);

	const startTime = Date.now();

	try {
		const { parsedNodeTypes, llm } = await setupTestEnvironment();

		// Create artifact saver if output directory is configured
		const artifactSaver = createArtifactSaver(outputDir, log);
		const promptId = 'local';

		// Save prompt artifacts
		artifactSaver?.savePrompt(promptId, prompt, criteria);

		log.info(`➔ Running ${numGenerations} generation(s)...`);

		// Run all generations in parallel
		const generationResults = await Promise.all(
			Array.from({ length: numGenerations }, async (_, genIndex) => {
				const genStartTime = Date.now();
				const runId = generateRunId();
				const agent = createAgent(parsedNodeTypes, llm, undefined, featureFlags);
				await consumeGenerator(agent.chat(getChatPayload(prompt, runId, featureFlags), `local-gen-${genIndex}`));
				const state = await agent.getState(runId, `local-gen-${genIndex}`);

				if (!state.values || !isWorkflowStateValues(state.values)) {
					throw new Error(`Invalid workflow state for generation ${genIndex + 1}`);
				}

				const workflow = state.values.workflowJSON;
				const genTime = (Date.now() - genStartTime) / 1000;

				log.verbose(
					`  Gen ${genIndex + 1}: Workflow done (${workflow?.nodes?.length ?? 0} nodes) [${genTime.toFixed(1)}s]`,
				);

				// Run judges for this generation
				const judgeResults = await Promise.all(
					Array.from({ length: numJudges }, async () => {
						return await evaluateWorkflowPairwise(llm, {
							workflowJSON: workflow,
							evalCriteria: criteria,
						});
					}),
				);

				const primaryPasses = judgeResults.filter((r) => r.primaryPass).length;
				const majorityPass = primaryPasses >= getMajorityThreshold(numJudges);
				const avgDiagnosticScore =
					judgeResults.reduce((sum, r) => sum + r.diagnosticScore, 0) / numJudges;

				log.verbose(
					`  Gen ${genIndex + 1}: ${majorityPass ? '✓ PASS' : '✗ FAIL'} (${primaryPasses}/${numJudges} judges, ${(avgDiagnosticScore * 100).toFixed(0)}%)`,
				);

				return { workflow, judgeResults, primaryPasses, majorityPass, avgDiagnosticScore };
			}),
		);

		// Save generation artifacts
		if (artifactSaver) {
			for (let i = 0; i < generationResults.length; i++) {
				artifactSaver.saveGeneration(promptId, i, generationResults[i]);
			}
		}

		// Aggregate across generations
		const passingGenerations = generationResults.filter((g) => g.majorityPass).length;
		const generationCorrectness = passingGenerations / numGenerations;
		const aggregatedDiagnosticScore =
			generationResults.reduce((sum, g) => sum + g.avgDiagnosticScore, 0) / numGenerations;

		const totalTime = (Date.now() - startTime) / 1000;

		// Display aggregated result
		if (numGenerations > 1) {
			console.log(
				`\n📊 Generation Correctness: ${passingGenerations}/${numGenerations} → ` +
					`${generationCorrectness >= 0.5 ? pc.green(generationCorrectness.toFixed(2)) : pc.red(generationCorrectness.toFixed(2))}`,
			);
			console.log(`   Aggregated Diagnostic: ${(aggregatedDiagnosticScore * 100).toFixed(0)}%`);
		} else {
			// Single generation - show original format
			const firstGen = generationResults[0];
			console.log(
				`\n📊 Result: ${firstGen.primaryPasses}/${numJudges} judges → ` +
					`${firstGen.majorityPass ? pc.green('PASS') : pc.red('FAIL')} ` +
					`(${(firstGen.avgDiagnosticScore * 100).toFixed(0)}%)`,
			);
		}
		log.dim(`   Timing: ${totalTime.toFixed(1)}s total`);

		// Per-generation breakdown (verbose or multi-gen)
		if (verbose && numGenerations > 1) {
			console.log(pc.dim('\nPer-generation breakdown:'));
			generationResults.forEach((g, i) => {
				console.log(
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
			console.log(pc.yellow('\nViolations (Gen 1):'));
			for (const v of allViolations) {
				console.log(pc.dim(`  [Judge ${v.judge}] ${v.rule}: ${v.justification}`));
			}
		}

		// Show workflow summary
		if (verbose && generationResults[0].workflow.nodes) {
			console.log(pc.dim('\nWorkflow nodes (Gen 1):'));
			for (const node of generationResults[0].workflow.nodes) {
				console.log(pc.dim(`  - ${node.name} (${node.type})`));
			}
		}
	} catch (error) {
		log.error(
			`✗ Local evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exit(1);
	}
}
