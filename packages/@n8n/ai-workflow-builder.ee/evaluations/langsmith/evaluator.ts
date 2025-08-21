import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { EvaluationResult as LangsmithEvaluationResult } from 'langsmith/evaluation';
import type { Run, Example } from 'langsmith/schemas';

import type { SimpleWorkflow } from '../../src/types/workflow.js';
import { evaluateWorkflow } from '../chains/workflow-evaluator.js';
import type { EvaluationInput, CategoryScore } from '../types/evaluation.js';
import {
	isSimpleWorkflow,
	isValidPrompt,
	formatViolations,
	type UsageMetadata,
} from '../types/langsmith.js';

// Helper to validate run outputs
function validateRunOutputs(outputs: unknown): {
	workflow?: SimpleWorkflow;
	prompt?: string;
	referenceWorkflow?: SimpleWorkflow;
	usage?: Partial<UsageMetadata>;
	error?: string;
} {
	if (!outputs || typeof outputs !== 'object') {
		return { error: 'No outputs found in run' };
	}

	const runOutputs = outputs as Record<string, unknown>;

	if (!isSimpleWorkflow(runOutputs.workflow)) {
		return { error: 'Invalid or missing workflow in outputs' };
	}

	if (!isValidPrompt(runOutputs.prompt)) {
		return { error: 'Invalid or missing prompt in outputs' };
	}

	// Extract usage metadata if available
	const usage = extractUsageMetadata(runOutputs.usage);

	// Extract reference workflow if available
	let referenceWorkflow: SimpleWorkflow | undefined;
	if (runOutputs.referenceOutputs && typeof runOutputs.referenceOutputs === 'object') {
		const refOutputs = runOutputs.referenceOutputs as Record<string, unknown>;
		if (isSimpleWorkflow(refOutputs.workflowJSON)) {
			referenceWorkflow = refOutputs.workflowJSON;
		}
	}

	return {
		workflow: runOutputs.workflow,
		prompt: runOutputs.prompt,
		referenceWorkflow,
		usage,
	};
}

// Helper to extract usage metadata
function extractUsageMetadata(usage: unknown): Partial<UsageMetadata> {
	if (!usage || typeof usage !== 'object') return {};

	const rawUsage = usage as Record<string, unknown>;
	const usageFieldMap: Record<string, keyof UsageMetadata> = {
		input_tokens: 'input_tokens',
		output_tokens: 'output_tokens',
		cache_create_input_tokens: 'cache_creation_input_tokens',
		cache_read_input_tokens: 'cache_read_input_tokens',
	};

	const result: Partial<UsageMetadata> = {};
	for (const [sourceKey, targetKey] of Object.entries(usageFieldMap)) {
		const value = rawUsage[sourceKey];
		if (typeof value === 'number') {
			result[targetKey] = value;
		}
	}
	return result;
}

// Helper to convert category scores to Langsmith results
function categoryToResult(key: string, category: CategoryScore): LangsmithEvaluationResult {
	return {
		key,
		score: category.score,
		comment: formatViolations(category.violations),
	};
}

/**
 * Creates a Langsmith evaluator function that uses the LLM-based workflow evaluator
 * @param llm - Language model to use for evaluation
 * @returns Evaluator function compatible with Langsmith
 */
export function createLangsmithEvaluator(
	llm: BaseChatModel,
): (rootRun: Run, example?: Example) => Promise<LangsmithEvaluationResult[]> {
	return async (rootRun: Run, _example?: Example): Promise<LangsmithEvaluationResult[]> => {
		// Validate and extract outputs
		const validation = validateRunOutputs(rootRun.outputs);
		if (validation.error) {
			return [
				{
					key: 'evaluationError',
					score: 0,
					comment: validation.error,
				},
			];
		}

		const evaluationInput: EvaluationInput = {
			userPrompt: validation.prompt!,
			generatedWorkflow: validation.workflow!,
			referenceWorkflow: validation.referenceWorkflow,
		};

		try {
			const evaluationResult = await evaluateWorkflow(llm, evaluationInput);
			const results: LangsmithEvaluationResult[] = [];

			// Add category scores
			const categories = [
				{ key: 'functionality', score: evaluationResult.functionality },
				{ key: 'connections', score: evaluationResult.connections },
				{ key: 'expressions', score: evaluationResult.expressions },
				{ key: 'nodeConfiguration', score: evaluationResult.nodeConfiguration },
			];

			for (const { key, score } of categories) {
				results.push(categoryToResult(key, score));
			}

			// Add usage metadata if available
			const usageMetrics = [
				{ key: 'inputTokens', value: validation.usage?.input_tokens },
				{ key: 'outputTokens', value: validation.usage?.output_tokens },
				{ key: 'cacheCreationInputTokens', value: validation.usage?.cache_creation_input_tokens },
				{ key: 'cacheReadInputTokens', value: validation.usage?.cache_read_input_tokens },
			];

			for (const metric of usageMetrics) {
				if (metric.value !== undefined) {
					results.push({ key: metric.key, score: metric.value });
				}
			}

			// Add structural similarity if applicable
			if (validation.referenceWorkflow && evaluationResult.structuralSimilarity.applicable) {
				results.push(
					categoryToResult('structuralSimilarity', evaluationResult.structuralSimilarity),
				);
			}

			// Add overall score
			results.push({
				key: 'overallScore',
				score: evaluationResult.overallScore,
				comment: evaluationResult.summary,
			});

			return results;
		} catch (error) {
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
