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

function createPairwiseWorkflowGenerator(
	parsedNodeTypes: INodeTypeDescription[],
	llm: BaseChatModel,
	tracer?: LangChainTracer,
) {
	return async (inputs: PairwiseDatasetInput) => {
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

		return {
			workflow: state.values.workflowJSON,
			evalCriteria: inputs.evals,
			prompt: inputs.prompt,
		};
	};
}

const DEFAULT_NUM_JUDGES = 3;

function createPairwiseLangsmithEvaluator(llm: BaseChatModel, numJudges: number) {
	return async (rootRun: Run, _example?: Example): Promise<LangsmithEvaluationResult[]> => {
		const outputs = rootRun.outputs;

		if (!isPairwiseGeneratorOutput(outputs)) {
			console.log(pc.red('  ❌ Invalid generator output - missing workflow/criteria'));
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

		console.log(pc.dim(`\n  📋 Evaluating workflow with ${numJudges} judges...`));
		console.log(pc.dim(`     Criteria: ${dosCount} DOs, ${dontsCount} DON'Ts`));

		// Run multiple judges in PARALLEL
		const judgeResults = await Promise.all(
			Array.from({ length: numJudges }, async (_, i) => {
				const result = await evaluateWorkflowPairwise(llm, {
					workflowJSON: outputs.workflow,
					evalCriteria: outputs.evalCriteria,
				});
				// Log each judge's result
				const totalCriteria = result.passes.length + result.violations.length;
				console.log(
					pc.dim(
						`     Judge ${i + 1}: ${result.primaryPass ? '✓ PASS' : '✗ FAIL'} ` +
							`(${result.passes.length}/${totalCriteria} criteria, ` +
							`diagnostic=${(result.diagnosticScore * 100).toFixed(1)}%)`,
					),
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

		// Log aggregation
		console.log(
			pc.blue(
				`  📊 Aggregate: ${primaryPasses}/${numJudges} judges passed → ` +
					`Primary=${majorityPass ? 'PASS' : 'FAIL'}, Diagnostic=${(avgDiagnosticScore * 100).toFixed(1)}%`,
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

export async function runPairwiseLangsmithEvaluation(
	repetitions: number = 1,
	notionId?: string,
	numJudges: number = DEFAULT_NUM_JUDGES,
): Promise<void> {
	console.log(formatHeader('AI Workflow Builder Pairwise Evaluation', 70));

	// Log configuration
	console.log(pc.blue('➔ Configuration:'));
	console.log(pc.dim(`   - Judges per generation: ${numJudges}`));
	console.log(pc.dim(`   - Generations per prompt: ${repetitions}`));
	console.log(pc.dim('   - Primary scoring: ALL criteria must pass → majority vote across judges'));
	console.log(pc.dim('   - Secondary scoring: Average diagnostic score'));

	if (!process.env.LANGSMITH_API_KEY) {
		console.error(pc.red('✗ LANGSMITH_API_KEY environment variable not set'));
		process.exit(1);
	}

	try {
		const { parsedNodeTypes, llm, tracer, lsClient } = await setupTestEnvironment();

		if (!lsClient) {
			throw new Error('Langsmith client not initialized');
		}

		const datasetName = process.env.LANGSMITH_DATASET_NAME ?? 'notion-pairwise-workflows';
		console.log(pc.blue(`➔ Using dataset: ${datasetName}`));

		// Verify dataset exists and get dataset info
		let datasetId: string;
		try {
			const dataset = await lsClient.readDataset({ datasetName });
			datasetId = dataset.id;
		} catch (error) {
			console.error(pc.red(`✗ Dataset "${datasetName}" not found`));
			process.exit(1);
		}

		// Fetch all examples from dataset for filtering/inspection
		const allExamples: Example[] = [];
		console.log(pc.blue('➔ Fetching examples from dataset...'));
		for await (const example of lsClient.listExamples({ datasetId })) {
			// Log first example structure for debugging
			if (allExamples.length === 0) {
				console.log(
					pc.dim('📊 First example structure:'),
					JSON.stringify(
						{
							id: example.id,
							dataset_id: example.dataset_id,
							metadata: example.metadata,
							inputsKeys: Object.keys(example.inputs ?? {}),
						},
						null,
						2,
					),
				);
			}
			allExamples.push(example);
		}
		console.log(pc.blue(`📊 Total examples in dataset: ${allExamples.length}`));

		// Check if we should limit examples
		const maxExamplesEnv = process.env.EVAL_MAX_EXAMPLES;
		const maxExamples = maxExamplesEnv ? parseInt(maxExamplesEnv, 10) : undefined;

		// Filter examples based on notionId or maxExamples
		let data: Example[];
		if (notionId) {
			console.log(pc.yellow(`🔍 Searching for example with notion_id: ${notionId}`));
			const filtered = allExamples.filter(
				(e) => (e.metadata as Record<string, unknown> | undefined)?.notion_id === notionId,
			);

			if (filtered.length === 0) {
				console.error(pc.red(`❌ No example found with notion_id: ${notionId}`));
				const availableIds = allExamples
					.map((e) => (e.metadata as Record<string, unknown> | undefined)?.notion_id)
					.filter(Boolean);
				console.log(pc.dim('Available notion_ids:'), availableIds);
				process.exit(1);
			}

			console.log(pc.green(`✅ Found ${filtered.length} example(s) with notion_id: ${notionId}`));
			console.log(
				pc.dim('Matched example metadata:'),
				JSON.stringify(filtered[0].metadata, null, 2),
			);
			data = filtered;
		} else if (maxExamples && maxExamples > 0) {
			console.log(pc.yellow(`➔ Limiting to ${maxExamples} example(s)`));
			data = allExamples.slice(0, maxExamples);
		} else {
			data = allExamples;
		}

		const generateWorkflow = createPairwiseWorkflowGenerator(parsedNodeTypes, llm, tracer);
		const evaluator = createPairwiseLangsmithEvaluator(llm, numJudges);

		await evaluate(generateWorkflow, {
			data,
			evaluators: [evaluator],
			maxConcurrency: 5,
			experimentPrefix: 'pairwise-evals',
			numRepetitions: repetitions,
			metadata: {
				numJudges,
				scoringMethod: 'hierarchical',
			},
		});

		console.log(pc.green('\n✓ Pairwise evaluation completed'));
		console.log(pc.dim('   View aggregated results in LangSmith dashboard'));
	} catch (error) {
		console.error(pc.red('✗ Pairwise evaluation failed:'), error);
		process.exit(1);
	}
}
