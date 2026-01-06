import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types/workflow';

import { evaluateWorkflow } from '../chains/workflow-evaluator';
import type { EvaluationInput } from '../types/evaluation';
import type { Evaluator, Feedback } from '../harness-types';

/**
 * Context for LLM-judge evaluator.
 */
export interface LLMJudgeContext {
	prompt: string;
}

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
): Evaluator<LLMJudgeContext> {
	return {
		name: 'llm-judge',

		async evaluate(workflow: SimpleWorkflow, ctx: LLMJudgeContext): Promise<Feedback[]> {
			const input: EvaluationInput = {
				userPrompt: ctx.prompt,
				generatedWorkflow: workflow,
			};

			const result = await evaluateWorkflow(llm, input);

			const feedback: Feedback[] = [];

			// Core category scores
			feedback.push({
				key: 'functionality',
				score: result.functionality.score,
				comment: formatViolations(result.functionality.violations),
			});

			feedback.push({
				key: 'connections',
				score: result.connections.score,
				comment: formatViolations(result.connections.violations),
			});

			feedback.push({
				key: 'expressions',
				score: result.expressions.score,
				comment: formatViolations(result.expressions.violations),
			});

			feedback.push({
				key: 'nodeConfiguration',
				score: result.nodeConfiguration.score,
				comment: formatViolations(result.nodeConfiguration.violations),
			});

			// Efficiency with sub-metrics
			feedback.push({
				key: 'efficiency',
				score: result.efficiency.score,
				comment: formatViolations(result.efficiency.violations),
			});

			feedback.push({
				key: 'efficiency.redundancyScore',
				score: result.efficiency.redundancyScore,
			});

			feedback.push({
				key: 'efficiency.pathOptimization',
				score: result.efficiency.pathOptimization,
			});

			feedback.push({
				key: 'efficiency.nodeCountEfficiency',
				score: result.efficiency.nodeCountEfficiency,
			});

			// Data flow
			feedback.push({
				key: 'dataFlow',
				score: result.dataFlow.score,
				comment: formatViolations(result.dataFlow.violations),
			});

			// Maintainability with sub-metrics
			feedback.push({
				key: 'maintainability',
				score: result.maintainability.score,
				comment: formatViolations(result.maintainability.violations),
			});

			feedback.push({
				key: 'maintainability.nodeNamingQuality',
				score: result.maintainability.nodeNamingQuality,
			});

			feedback.push({
				key: 'maintainability.workflowOrganization',
				score: result.maintainability.workflowOrganization,
			});

			feedback.push({
				key: 'maintainability.modularity',
				score: result.maintainability.modularity,
			});

			// Overall score
			feedback.push({
				key: 'overallScore',
				score: result.overallScore,
				comment: result.summary,
			});

			return feedback;
		},
	};
}
