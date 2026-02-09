import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types/workflow';

import type { EvaluationInput } from './evaluation';
import { evaluateWorkflow } from './workflow-evaluator';
import { runWithOptionalLimiter, withTimeout } from '../../harness/evaluation-helpers';
import type { EvaluationContext, Evaluator, Feedback } from '../../harness/harness-types';

const EVALUATOR_NAME = 'llm-judge';

/**
 * Violation type from evaluation results.
 */
interface Violation {
	type: string;
	description: string;
	pointsDeducted: number;
}

/**
 * Format violations as a comment string.
 */
function formatViolations(violations: Violation[]): string {
	if (!violations || violations.length === 0) return '';
	return violations.map((v) => `[${v.type}] ${v.description}`).join('; ');
}

/**
 * Create an LLM-as-judge evaluator that uses the existing evaluateWorkflow chain.
 *
 * @param llm - The LLM to use for evaluation
 * @param _nodeTypes - Node type descriptions (unused but kept for interface compatibility)
 * @returns An evaluator that produces feedback from LLM evaluation
 */
export function createLLMJudgeEvaluator(
	llm: BaseChatModel,
	_nodeTypes: INodeTypeDescription[],
): Evaluator<EvaluationContext> {
	const fb = (
		metric: string,
		score: number,
		kind: Feedback['kind'],
		comment?: string,
	): Feedback => ({
		evaluator: EVALUATOR_NAME,
		metric,
		score,
		kind,
		...(comment ? { comment } : {}),
	});

	return {
		name: EVALUATOR_NAME,

		async evaluate(workflow: SimpleWorkflow, ctx: EvaluationContext): Promise<Feedback[]> {
			const input: EvaluationInput = {
				userPrompt: ctx.prompt,
				generatedWorkflow: workflow,
			};

			const result = await runWithOptionalLimiter(async () => {
				return await withTimeout({
					promise: evaluateWorkflow(llm, input),
					timeoutMs: ctx.timeoutMs,
					label: 'llm-judge:evaluateWorkflow',
				});
			}, ctx.llmCallLimiter);

			return [
				// Core category scores
				fb(
					'functionality',
					result.functionality.score,
					'metric',
					formatViolations(result.functionality.violations),
				),
				fb(
					'connections',
					result.connections.score,
					'metric',
					formatViolations(result.connections.violations),
				),
				fb(
					'expressions',
					result.expressions.score,
					'metric',
					formatViolations(result.expressions.violations),
				),
				fb(
					'nodeConfiguration',
					result.nodeConfiguration.score,
					'metric',
					formatViolations(result.nodeConfiguration.violations),
				),

				// Efficiency with sub-metrics
				fb(
					'efficiency',
					result.efficiency.score,
					'metric',
					formatViolations(result.efficiency.violations),
				),
				fb('efficiency.redundancyScore', result.efficiency.redundancyScore, 'detail'),
				fb('efficiency.pathOptimization', result.efficiency.pathOptimization, 'detail'),
				fb('efficiency.nodeCountEfficiency', result.efficiency.nodeCountEfficiency, 'detail'),

				// Data flow
				fb(
					'dataFlow',
					result.dataFlow.score,
					'metric',
					formatViolations(result.dataFlow.violations),
				),

				// Maintainability with sub-metrics
				fb(
					'maintainability',
					result.maintainability.score,
					'metric',
					formatViolations(result.maintainability.violations),
				),
				fb('maintainability.nodeNamingQuality', result.maintainability.nodeNamingQuality, 'detail'),
				fb(
					'maintainability.workflowOrganization',
					result.maintainability.workflowOrganization,
					'detail',
				),
				fb('maintainability.modularity', result.maintainability.modularity, 'detail'),

				// Best practices adherence
				fb(
					'bestPractices',
					result.bestPractices.score,
					'metric',
					formatViolations(result.bestPractices.violations),
				),

				// Overall score
				fb('overallScore', result.overallScore, 'score', result.summary),
			];
		},
	};
}
