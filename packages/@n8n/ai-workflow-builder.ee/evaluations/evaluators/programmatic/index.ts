import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types/workflow';

import type { EvaluationContext, Evaluator, Feedback } from '../../harness/harness-types';
import { programmaticEvaluation } from '../../programmatic/programmatic-evaluation';

/**
 * Format violations as a comment string.
 */
function formatViolations(
	violations: Array<{ type: string; description: string }>,
): string | undefined {
	if (!violations || violations.length === 0) return undefined;
	return violations.map((v) => `[${v.type}] ${v.description}`).join('; ');
}

/**
 * Create a programmatic evaluator that runs rule-based checks.
 * This doesn't require an LLM - it uses static analysis.
 *
 * @param nodeTypes - Node type descriptions for validation
 * @returns An evaluator that produces feedback from programmatic checks
 */
export function createProgrammaticEvaluator(
	nodeTypes: INodeTypeDescription[],
): Evaluator<EvaluationContext> {
	const fb = (
		metric: string,
		score: number,
		kind: Feedback['kind'],
		comment?: string,
	): Feedback => ({
		evaluator: 'programmatic',
		metric,
		score,
		kind,
		...(comment ? { comment } : {}),
	});

	return {
		name: 'programmatic',

		async evaluate(workflow: SimpleWorkflow, ctx: EvaluationContext): Promise<Feedback[]> {
			const result = await programmaticEvaluation(
				{
					userPrompt: ctx.prompt,
					generatedWorkflow: workflow,
					referenceWorkflows: ctx.referenceWorkflows,
				},
				nodeTypes,
			);

			const feedback: Feedback[] = [
				// Overall programmatic score (scoring)
				fb('overall', result.overallScore, 'score'),
				// Stable category metrics (dashboard)
				fb(
					'connections',
					result.connections.score,
					'metric',
					formatViolations(result.connections.violations),
				),
				fb('nodes', result.nodes.score, 'metric', formatViolations(result.nodes.violations)),
				fb('trigger', result.trigger.score, 'metric', formatViolations(result.trigger.violations)),
				fb(
					'agentPrompt',
					result.agentPrompt.score,
					'metric',
					formatViolations(result.agentPrompt.violations),
				),
				fb('tools', result.tools.score, 'metric', formatViolations(result.tools.violations)),
				fb('fromAi', result.fromAi.score, 'metric', formatViolations(result.fromAi.violations)),
				fb(
					'credentials',
					result.credentials.score,
					'metric',
					formatViolations(result.credentials.violations),
				),
			];

			// Similarity check (if reference workflow provided)
			if (result.similarity !== null && result.similarity !== undefined) {
				feedback.push(
					fb(
						'similarity',
						result.similarity.score,
						'metric',
						formatViolations(result.similarity.violations),
					),
				);
			}

			return feedback;
		},
	};
}
