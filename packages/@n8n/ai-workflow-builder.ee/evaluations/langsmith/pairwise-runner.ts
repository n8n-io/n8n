import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { evaluate } from 'langsmith/evaluation';
import type { EvaluationResult as LangsmithEvaluationResult } from 'langsmith/evaluation';
import type { Run, Example } from 'langsmith/schemas';
import type { INodeTypeDescription } from 'n8n-workflow';
import pc from 'picocolors';

import type { SimpleWorkflow } from '../../src/types/workflow';
import { evaluateWorkflowPairwise } from '../chains/pairwise-evaluator';
import { setupTestEnvironment, createAgent } from '../core/environment';
import { generateRunId, isWorkflowStateValues } from '../types/langsmith';
import { consumeGenerator, formatHeader, getChatPayload } from '../utils/evaluation-helpers';
import { createLogger, type EvalLogger } from '../utils/logger';

interface PairwiseDatasetInput {
	evals: {
		dos: string;
		donts: string;
	};
	prompt: string;
}

interface PairwiseGeneratorOutput {
	workflow: SimpleWorkflow;
	evalCriteria: PairwiseDatasetInput['evals'];
	prompt: string;
}

function isPairwiseGeneratorOutput(outputs: unknown): outputs is PairwiseGeneratorOutput {
	if (!outputs || typeof outputs !== 'object') return false;

	const obj = outputs as Record<string, unknown>;

	if (!obj.workflow || typeof obj.workflow !== 'object') return false;
	if (!obj.evalCriteria || typeof obj.evalCriteria !== 'object') return false;

	return true;
}

// Counter to track generations across repetitions
let generationCounter = 0;

function createPairwiseWorkflowGenerator(
	parsedNodeTypes: INodeTypeDescription[],
	llm: BaseChatModel,
	log: EvalLogger,
	tracer?: LangChainTracer,
) {
	return async (inputs: PairwiseDatasetInput) => {
		generationCounter++;
		const currentGeneration = generationCounter;
		const promptPreview = inputs.prompt.slice(0, 60).replace(/\n/g, ' ');

		log.verbose(
			`🔄 [Gen #${currentGeneration}] "${promptPreview}${inputs.prompt.length > 60 ? '...' : ''}"`,
		);

		const runId = generateRunId();

		// Create agent for this run
		const agent = createAgent(parsedNodeTypes, llm, tracer);

		// Use the prompt from the dataset
		await consumeGenerator(
			agent.chat(getChatPayload(inputs.prompt, runId), 'langsmith-pairwise-eval-user'),
		);

		// Get generated workflow
		const state = await agent.getState(runId, 'langsmith-pairwise-eval-user');

		if (!state.values || !isWorkflowStateValues(state.values)) {
			throw new Error('Invalid workflow state');
		}

		const nodeCount = state.values.workflowJSON?.nodes?.length ?? 0;
		log.verbose(`✅ [Gen #${currentGeneration}] Done (${nodeCount} nodes)`);

		return {
			workflow: state.values.workflowJSON,
			evalCriteria: inputs.evals,
			prompt: inputs.prompt,
		};
	};
}

const DEFAULT_NUM_JUDGES = 3;

// Counter to track evaluations
let evaluationCounter = 0;

function createPairwiseLangsmithEvaluator(llm: BaseChatModel, numJudges: number, log: EvalLogger) {
	return async (rootRun: Run, _example?: Example): Promise<LangsmithEvaluationResult[]> => {
		evaluationCounter++;
		const currentEvaluation = evaluationCounter;

		log.verbose(`⚖️  [Eval #${currentEvaluation}] Starting with ${numJudges} judges...`);

		const outputs = rootRun.outputs;

		if (!isPairwiseGeneratorOutput(outputs)) {
			log.error(`  ❌ [Eval #${currentEvaluation}] Invalid output - missing workflow/criteria`);
			return [
				{ key: 'pairwise_primary', score: 0, comment: 'Invalid output' },
				{ key: 'pairwise_diagnostic', score: 0 },
			];
		}

		// Count criteria for logging
		const dosCount = outputs.evalCriteria.dos
			? outputs.evalCriteria.dos.split('\n').filter((l) => l.trim()).length
			: 0;
		const dontsCount = outputs.evalCriteria.donts
			? outputs.evalCriteria.donts.split('\n').filter((l) => l.trim()).length
			: 0;

		log.verbose(`     Criteria: ${dosCount} DOs, ${dontsCount} DON'Ts`);

		// Run multiple judges in PARALLEL
		const judgeResults = await Promise.all(
			Array.from({ length: numJudges }, async (_, i) => {
				const result = await evaluateWorkflowPairwise(llm, {
					workflowJSON: outputs.workflow,
					evalCriteria: outputs.evalCriteria,
				});
				// Log each judge's result
				const totalCriteria = result.passes.length + result.violations.length;
				log.verbose(
					`     Judge ${i + 1}: ${result.primaryPass ? '✓ PASS' : '✗ FAIL'} ` +
						`(${result.passes.length}/${totalCriteria} criteria, ` +
						`diagnostic=${(result.diagnosticScore * 100).toFixed(1)}%)`,
				);
				return result;
			}),
		);

		// Level 3: Aggregate across judges
		const primaryPasses = judgeResults.filter((r) => r.primaryPass).length;
		const majorityPass = primaryPasses >= Math.ceil(numJudges / 2);
		const primaryScore = majorityPass ? 1 : 0;
		const avgDiagnosticScore =
			judgeResults.reduce((sum, r) => sum + r.diagnosticScore, 0) / numJudges;

		// Log aggregation - always show this as it's the main result
		console.log(
			pc.dim(
				`  📊 [Eval #${currentEvaluation}] ${primaryPasses}/${numJudges} judges → ` +
					`${majorityPass ? pc.green('PASS') : pc.red('FAIL')} (${(avgDiagnosticScore * 100).toFixed(0)}%)`,
			),
		);

		// Collect all violations for comment
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
			{
				key: 'pairwise_primary',
				score: primaryScore,
				comment,
			},
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
	};
}

export interface PairwiseEvaluationOptions {
	repetitions?: number;
	notionId?: string;
	numJudges?: number;
	verbose?: boolean;
	experimentName?: string;
}

const DEFAULT_EXPERIMENT_NAME = 'pairwise-evals';

export async function runPairwiseLangsmithEvaluation(
	options: PairwiseEvaluationOptions = {},
): Promise<void> {
	const {
		repetitions = 1,
		notionId,
		numJudges = DEFAULT_NUM_JUDGES,
		verbose = false,
		experimentName = DEFAULT_EXPERIMENT_NAME,
	} = options;
	const log = createLogger(verbose);

	console.log(formatHeader('AI Workflow Builder Pairwise Evaluation', 70));

	// Log configuration
	log.info(`➔ Experiment: ${experimentName}`);
	log.info(`➔ Config: ${numJudges} judges × ${repetitions} reps${verbose ? ' (verbose)' : ''}`);
	log.verbose('   Primary: ALL criteria must pass → majority vote');
	log.verbose('   Secondary: Average diagnostic score');

	if (!process.env.LANGSMITH_API_KEY) {
		log.error('✗ LANGSMITH_API_KEY environment variable not set');
		process.exit(1);
	}

	// Reset counters for this run
	generationCounter = 0;
	evaluationCounter = 0;

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

		// Check if we should limit examples
		const maxExamplesEnv = process.env.EVAL_MAX_EXAMPLES;
		const maxExamples = maxExamplesEnv ? parseInt(maxExamplesEnv, 10) : undefined;

		// Filter examples based on notionId or maxExamples
		let data: Example[];
		if (notionId) {
			log.warn(`🔍 Filtering by notion_id: ${notionId}`);
			const filtered = allExamples.filter(
				(e) => (e.metadata as Record<string, unknown> | undefined)?.notion_id === notionId,
			);

			if (filtered.length === 0) {
				log.error(`❌ No example found with notion_id: ${notionId}`);
				const availableIds = allExamples
					.map((e) => (e.metadata as Record<string, unknown> | undefined)?.notion_id)
					.filter(Boolean);
				log.dim(`Available: ${availableIds.join(', ')}`);
				process.exit(1);
			}

			log.success(`✅ Found ${filtered.length} example(s)`);
			log.verbose(`Metadata: ${JSON.stringify(filtered[0].metadata, null, 2)}`);
			data = filtered;
		} else if (maxExamples && maxExamples > 0) {
			log.warn(`➔ Limiting to ${maxExamples} example(s)`);
			data = allExamples.slice(0, maxExamples);
		} else {
			data = allExamples;
		}

		const generateWorkflow = createPairwiseWorkflowGenerator(parsedNodeTypes, llm, log, tracer);
		const evaluator = createPairwiseLangsmithEvaluator(llm, numJudges, log);

		// NOTE: LangSmith's numRepetitions doesn't work when passing Example[] array directly
		// (it only works with dataset names). We manually duplicate examples to work around this.
		const repeatedData: Example[] = [];
		for (let i = 0; i < repetitions; i++) {
			repeatedData.push(...data);
		}

		log.info(`➔ Running ${data.length} × ${repetitions} = ${repeatedData.length} generations`);

		await evaluate(generateWorkflow, {
			data: repeatedData,
			evaluators: [evaluator],
			maxConcurrency: 5,
			experimentPrefix: experimentName,
			// numRepetitions not used - we manually duplicate examples above
			metadata: {
				numJudges,
				repetitions,
				scoringMethod: 'hierarchical',
			},
		});

		log.success('\n✓ Pairwise evaluation completed');
		log.dim(
			`   Generations: ${generationCounter} | Evaluations: ${evaluationCounter} | Judge calls: ${evaluationCounter * numJudges}`,
		);
		log.dim('   View results in LangSmith dashboard');
	} catch (error) {
		log.error(`✗ Pairwise evaluation failed: ${error}`);
		process.exit(1);
	}
}
