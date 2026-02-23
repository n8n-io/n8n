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

function createPairwiseLangsmithEvaluator(llm: BaseChatModel) {
	return async (rootRun: Run, _example?: Example): Promise<LangsmithEvaluationResult[]> => {
		const outputs = rootRun.outputs;

		if (!isPairwiseGeneratorOutput(outputs)) {
			return [
				{
					key: 'pairwise_score',
					score: 0,
					comment: 'Missing or invalid workflow/evaluation criteria in outputs',
				},
			];
		}

		const result = await evaluateWorkflowPairwise(llm, {
			workflowJSON: outputs.workflow,
			evalCriteria: outputs.evalCriteria,
		});

		const violationsText =
			result.violations.length > 0
				? `Violations:\n${result.violations.map((v) => `- ${v.rule}: ${v.justification}`).join('\n')}`
				: '';

		const passesText =
			result.passes.length > 0
				? `Passes:\n${result.passes.map((p) => `- ${p.rule}: ${p.justification}`).join('\n')}`
				: '';

		const comment = [violationsText, passesText].filter(Boolean).join('\n\n');

		return [
			{
				key: 'pairwise_score',
				score: result.score,
				comment: comment || 'No comments',
			},
			{
				key: 'pairwise_passed_count',
				score: result.passes.length,
			},
			{
				key: 'pairwise_failed_count',
				score: result.violations.length,
			},
		];
	};
}

export async function runPairwiseLangsmithEvaluation(repetitions: number = 1): Promise<void> {
	console.log(formatHeader('AI Workflow Builder Pairwise Evaluation', 70));

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

		// Check if we should limit examples
		const maxExamplesEnv = process.env.EVAL_MAX_EXAMPLES;
		const maxExamples = maxExamplesEnv ? parseInt(maxExamplesEnv, 10) : undefined;

		// Fetch examples if limiting, otherwise use dataset name
		let data: string | Example[] = datasetName;
		if (maxExamples && maxExamples > 0) {
			console.log(pc.yellow(`➔ Limiting to ${maxExamples} example(s)`));
			const examples: Example[] = [];
			for await (const example of lsClient.listExamples({ datasetId })) {
				examples.push(example);
				if (examples.length >= maxExamples) break;
			}
			data = examples;
		}

		const generateWorkflow = createPairwiseWorkflowGenerator(parsedNodeTypes, llm, tracer);
		const evaluator = createPairwiseLangsmithEvaluator(llm);

		await evaluate(generateWorkflow, {
			data,
			evaluators: [evaluator],
			maxConcurrency: 5,
			experimentPrefix: 'pairwise-evals',
			numRepetitions: repetitions,
		});

		console.log(pc.green('✓ Pairwise evaluation completed'));
	} catch (error) {
		console.error(pc.red('✗ Pairwise evaluation failed:'), error);
		process.exit(1);
	}
}
