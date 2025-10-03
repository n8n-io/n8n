import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { EvaluationResult as LangsmithEvaluationResult } from 'langsmith/evaluation';
import type { Run, Example } from 'langsmith/schemas';
import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '../../src/types/workflow.js';
import { evaluateWorkflow } from '../chains/workflow-evaluator.js';
import { programmaticEvaluation } from '../programmatic/programmatic.js';
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
 * Creates a Langsmith evaluator function that uses the LLM-based workflow evaluator and programmatic evaluation.
 * @param llm - Language model to use for evaluation
 * @param parsedNodeTypes - Node types for programmatic evaluation
 * @returns Evaluator function compatible with Langsmith
 */
export function createLangsmithEvaluator(
	llm: BaseChatModel,
	parsedNodeTypes: INodeTypeDescription[],
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
			// Run LLM-based evaluation
			const evaluationResult = await evaluateWorkflow(llm, evaluationInput);

			// Run programmatic evaluation
			const programmaticResult = await programmaticEvaluation(evaluationInput, parsedNodeTypes);

			const results: LangsmithEvaluationResult[] = [];

			// Add core category scores
			const categories = [
				{ key: 'functionality', score: evaluationResult.functionality },
				{ key: 'connections', score: evaluationResult.connections },
				{ key: 'expressions', score: evaluationResult.expressions },
				{ key: 'nodeConfiguration', score: evaluationResult.nodeConfiguration },
			];

			for (const { key, score } of categories) {
				results.push(categoryToResult(key, score));
			}

			results.push(categoryToResult('efficiency', evaluationResult.efficiency));
			// Add sub-metrics
			results.push({
				key: 'efficiency.redundancyScore',
				score: evaluationResult.efficiency.redundancyScore,
			});
			results.push({
				key: 'efficiency.pathOptimization',
				score: evaluationResult.efficiency.pathOptimization,
			});
			results.push({
				key: 'efficiency.nodeCountEfficiency',
				score: evaluationResult.efficiency.nodeCountEfficiency,
			});

			results.push(categoryToResult('dataFlow', evaluationResult.dataFlow));

			results.push(categoryToResult('maintainability', evaluationResult.maintainability));
			results.push({
				key: 'maintainability.nodeNamingQuality',
				score: evaluationResult.maintainability.nodeNamingQuality,
			});
			results.push({
				key: 'maintainability.workflowOrganization',
				score: evaluationResult.maintainability.workflowOrganization,
			});
			results.push({
				key: 'maintainability.modularity',
				score: evaluationResult.maintainability.modularity,
			});

			// Add usage metadata if available
			const usageMetrics = [
				{ key: 'inputTokens', value: validation.usage?.input_tokens },
				{ key: 'outputTokens', value: validation.usage?.output_tokens },
				{ key: 'cacheCreationInputTokens', value: validation.usage?.cache_creation_input_tokens },
				{ key: 'cacheReadInputTokens', value: validation.usage?.cache_read_input_tokens },
			];

			for (const metric of usageMetrics) {
				if (metric.value !== undefined) {
					// Langsmith has a limitation on large scores (>99999) so we track in thousands
					results.push({ key: metric.key, score: metric.value / 1000 });
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

			// Add programmatic evaluation scores
			results.push({
				key: 'programmatic.overall',
				score: programmaticResult.overallScore,
			});
			results.push(categoryToResult('programmatic.connections', programmaticResult.connections));
			results.push(categoryToResult('programmatic.trigger', programmaticResult.trigger));
			results.push(categoryToResult('programmatic.agentPrompt', programmaticResult.agentPrompt));
			results.push(categoryToResult('programmatic.tools', programmaticResult.tools));
			results.push(categoryToResult('programmatic.fromAi', programmaticResult.fromAi));

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
