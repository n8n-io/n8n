import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { EvaluationResult as LangsmithEvaluationResult } from 'langsmith/evaluation';
import type { Run, Example } from 'langsmith/schemas';

import type { SimpleWorkflow } from '../../src/types/workflow.js';
import { evaluateWorkflow } from '../chains/workflow-evaluator.js';
import type { EvaluationInput } from '../types/evaluation.js';
import {
	isSimpleWorkflow,
	isValidPrompt,
	formatViolations,
	type UsageMetadata,
} from '../types/langsmith.js';

/**
 * Creates a Langsmith evaluator function that uses the LLM-based workflow evaluator
 * @param llm - Language model to use for evaluation
 * @returns Evaluator function compatible with Langsmith
 */
export function createLangsmithEvaluator(
	llm: BaseChatModel,
): (rootRun: Run, example?: Example) => Promise<LangsmithEvaluationResult[]> {
	// eslint-disable-next-line complexity
	return async (rootRun: Run, _example?: Example): Promise<LangsmithEvaluationResult[]> => {
		// Validate outputs exist
		if (!rootRun.outputs) {
			return [
				{
					key: 'evaluationError',
					score: 0,
					comment: 'No outputs found in run',
				},
			];
		}

		// Validate workflow with type guard
		if (!isSimpleWorkflow(rootRun.outputs.workflow)) {
			return [
				{
					key: 'evaluationError',
					score: 0,
					comment: 'Invalid or missing workflow in outputs',
				},
			];
		}
		const generatedWorkflow = rootRun.outputs.workflow;

		// Validate prompt with type guard
		if (!isValidPrompt(rootRun.outputs.prompt)) {
			return [
				{
					key: 'evaluationError',
					score: 0,
					comment: 'Invalid or missing prompt in outputs',
				},
			];
		}
		const prompt = rootRun.outputs.prompt;

		const usage: Partial<UsageMetadata> = {};
		if (rootRun.outputs.usage && typeof rootRun.outputs.usage === 'object') {
			const rawUsage = rootRun.outputs.usage as Record<string, unknown>;

			// Only include valid numeric fields
			if (typeof rawUsage.input_tokens === 'number') {
				usage.input_tokens = rawUsage.input_tokens;
			}
			if (typeof rawUsage.output_tokens === 'number') {
				usage.output_tokens = rawUsage.output_tokens;
			}
			if (typeof rawUsage.cache_create_input_tokens === 'number') {
				usage.cache_creation_input_tokens = rawUsage.cache_create_input_tokens;
			}
			if (typeof rawUsage.cache_read_input_tokens === 'number') {
				usage.cache_read_input_tokens = rawUsage.cache_read_input_tokens;
			}
		}

		// Check for reference workflow if available
		let referenceWorkflow: SimpleWorkflow | undefined;
		if (rootRun.outputs.referenceOutputs && typeof rootRun.outputs.referenceOutputs === 'object') {
			const refOutputs = rootRun.outputs.referenceOutputs as Record<string, unknown>;
			if (isSimpleWorkflow(refOutputs.workflowJSON)) {
				referenceWorkflow = refOutputs.workflowJSON;
			}
		}

		// Prepare evaluation input
		const evaluationInput: EvaluationInput = {
			userPrompt: prompt,
			generatedWorkflow,
			referenceWorkflow,
		};

		try {
			// Run evaluation
			const evaluationResult = await evaluateWorkflow(llm, evaluationInput);

			// Convert to Langsmith format
			const results: LangsmithEvaluationResult[] = [];

			// Functionality
			results.push({
				key: 'functionality',
				score: evaluationResult.functionality.score,
				comment: formatViolations(evaluationResult.functionality.violations),
			});

			// Connections
			results.push({
				key: 'connections',
				score: evaluationResult.connections.score,
				comment: formatViolations(evaluationResult.connections.violations),
			});

			// Expressions
			results.push({
				key: 'expressions',
				score: evaluationResult.expressions.score,
				comment: formatViolations(evaluationResult.expressions.violations),
			});

			// Node Configuration
			results.push({
				key: 'nodeConfiguration',
				score: evaluationResult.nodeConfiguration.score,
				comment: formatViolations(evaluationResult.nodeConfiguration.violations),
			});

			// Usage Metadata (if available)
			if (usage.input_tokens !== undefined) {
				results.push({
					key: 'inputTokens',
					score: usage.input_tokens,
				});
			}
			if (usage.output_tokens !== undefined) {
				results.push({
					key: 'outputTokens',
					score: usage.output_tokens,
				});
			}
			if (usage.cache_creation_input_tokens !== undefined) {
				results.push({
					key: 'cacheCreationInputTokens',
					score: usage.cache_creation_input_tokens,
				});
			}
			if (usage.cache_read_input_tokens !== undefined) {
				results.push({
					key: 'cacheReadInputTokens',
					score: usage.cache_read_input_tokens,
				});
			}

			// Structural Similarity (if reference workflow exists)
			if (referenceWorkflow && evaluationResult.structuralSimilarity.applicable) {
				results.push({
					key: 'structuralSimilarity',
					score: evaluationResult.structuralSimilarity.score,
					comment: formatViolations(evaluationResult.structuralSimilarity.violations),
				});
			}

			// Overall Score
			results.push({
				key: 'overallScore',
				score: evaluationResult.overallScore,
				comment: evaluationResult.summary,
			});

			return results;
		} catch (error) {
			// Return error results
			const errorMessage = error instanceof Error ? error.message : String(error);
			return [
				{
					key: 'evaluationError',
					score: 0,
					comment: `Evaluation failed: ${errorMessage}`,
				},
			];
		}
	};
}
