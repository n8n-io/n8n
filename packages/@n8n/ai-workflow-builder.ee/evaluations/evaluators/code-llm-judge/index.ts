/**
 * Code LLM Judge Evaluator
 *
 * Uses an LLM to analyze generated TypeScript SDK code for quality issues
 * including expression syntax errors, API misuse, and security problems.
 *
 * Supports custom SDK types for variant evaluation (builder, graph interfaces).
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { SDK_API_CONTENT } from '@n8n/workflow-sdk';

import type { SimpleWorkflow } from '@/types/workflow';

import type { EvaluationContext, Evaluator, Feedback } from '../../harness/harness-types';
import {
	CodeEvaluationResultSchema,
	type CategoryResult,
	type CodeEvaluationResult,
} from './evaluation';
import { getCodeReviewSystemPrompt, CODE_REVIEW_USER_PROMPT } from './prompts/code-review.prompt';

const EVALUATOR_NAME = 'code-llm-judge';

/** Options for the code LLM judge evaluator */
export interface CodeLLMJudgeEvaluatorOptions {
	/**
	 * Custom SDK type content to use instead of the default @n8n/workflow-sdk types.
	 * Used for variant evaluation (builder, graph interfaces).
	 * If not provided, uses SDK_API_CONTENT from @n8n/workflow-sdk.
	 */
	customSdkTypes?: string;
}

/**
 * Helper to create feedback items.
 */
function fb(
	metric: string,
	score: number,
	kind: 'score' | 'metric' | 'detail',
	comment?: string,
): Feedback {
	return {
		evaluator: EVALUATOR_NAME,
		metric,
		score,
		kind,
		comment,
	};
}

/**
 * Format violations into a comment string.
 */
function formatViolations(result: CategoryResult): string | undefined {
	if (result.violations.length === 0) {
		return undefined;
	}

	return result.violations.map((v) => `[${v.severity}] ${v.description}`).join('; ');
}

/**
 * Create a code LLM judge evaluator that uses an LLM to analyze generated code.
 *
 * @param llm - The LangChain chat model to use for evaluation
 * @param options - Optional configuration for custom SDK types (for variant evaluation)
 * @returns An evaluator that analyzes TypeScript SDK code quality
 */
export function createCodeLLMJudgeEvaluator(
	llm: BaseChatModel,
	options?: CodeLLMJudgeEvaluatorOptions,
): Evaluator<EvaluationContext> {
	// Determine which SDK types to use for evaluation
	const sdkApiContent = options?.customSdkTypes ?? SDK_API_CONTENT;

	return {
		name: EVALUATOR_NAME,

		async evaluate(_workflow: SimpleWorkflow, ctx: EvaluationContext): Promise<Feedback[]> {
			// Skip if no generated code available
			if (!ctx.generatedCode) {
				return [fb('skipped', 1, 'score', 'No generated code available for LLM analysis')];
			}

			// Create structured output chain
			const structuredLLM = llm.withStructuredOutput(CodeEvaluationResultSchema);

			// Prepare the prompt
			const userPrompt = CODE_REVIEW_USER_PROMPT.replace('{code}', ctx.generatedCode);

			// Invoke the LLM with the appropriate SDK types
			const systemPrompt = getCodeReviewSystemPrompt(sdkApiContent);
			const result = (await structuredLLM.invoke([
				new SystemMessage(systemPrompt),
				new HumanMessage(userPrompt),
			])) as CodeEvaluationResult;

			// Convert result to feedback
			const feedback: Feedback[] = [
				fb('overallScore', result.overallScore, 'score', result.summary),
				fb(
					'expressionSyntax',
					result.expressionSyntax.score,
					'metric',
					formatViolations(result.expressionSyntax),
				),
				fb('apiUsage', result.apiUsage.score, 'metric', formatViolations(result.apiUsage)),
				fb('security', result.security.score, 'metric', formatViolations(result.security)),
				fb('codeQuality', result.codeQuality.score, 'metric', formatViolations(result.codeQuality)),
			];

			return feedback;
		},
	};
}
