/**
 * Execution evaluator for the v2 evaluation harness.
 *
 * Executes generated workflows with pin data to verify they run without errors.
 * Service nodes use pin data (skipping real API calls); utility nodes execute
 * using their real compiled dist implementations.
 */

import type { SimpleWorkflow } from '@/types/workflow';

import type { EvaluationContext, Evaluator, Feedback } from '../../harness/harness-types';
import { executeWorkflowWithPinData } from '../../support/workflow-executor';

/**
 * Create an execution evaluator that runs the workflow with pin data.
 *
 * Node implementations are loaded lazily from the compiled dist/ files in
 * nodes-base and nodes-langchain — no DI or package-loading setup required.
 */
export function createExecutionEvaluator(): Evaluator<EvaluationContext> {
	return {
		name: 'execution',

		async evaluate(workflow: SimpleWorkflow, ctx: EvaluationContext): Promise<Feedback[]> {
			const pinData = ctx.pinData ?? {};

			const result = await executeWorkflowWithPinData(workflow, pinData);

			return [
				{
					evaluator: 'execution',
					metric: 'executionSuccess',
					score: result.success ? 1 : 0,
					kind: 'score',
					comment: result.success
						? `Workflow executed successfully (${result.executedNodes.length} nodes)`
						: `Execution failed: ${result.error}${result.errorNode ? ` (at node: ${result.errorNode})` : ''}`,
				},
			];
		},
	};
}
