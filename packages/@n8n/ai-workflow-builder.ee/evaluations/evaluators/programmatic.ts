import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types/workflow';

import { programmaticEvaluation } from '../programmatic/programmatic-evaluation';
import type { Evaluator, Feedback } from '../harness-types';

/**
 * Context for programmatic evaluator.
 */
export interface ProgrammaticContext {
	prompt: string;
	referenceWorkflow?: SimpleWorkflow;
}

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
): Evaluator<ProgrammaticContext> {
	return {
		name: 'programmatic',

		async evaluate(workflow: SimpleWorkflow, ctx: ProgrammaticContext): Promise<Feedback[]> {
			const result = await programmaticEvaluation(
				{
					userPrompt: ctx.prompt,
					generatedWorkflow: workflow,
					referenceWorkflow: ctx.referenceWorkflow,
				},
				nodeTypes,
			);

			const feedback: Feedback[] = [];

			// Overall programmatic score
			feedback.push({
				key: 'programmatic.overall',
				score: result.overallScore,
			});

			// Connections check
			feedback.push({
				key: 'programmatic.connections',
				score: result.connections.score,
				comment: formatViolations(result.connections.violations),
			});

			// Trigger check
			feedback.push({
				key: 'programmatic.trigger',
				score: result.trigger.score,
				comment: formatViolations(result.trigger.violations),
			});

			// Agent prompt check
			feedback.push({
				key: 'programmatic.agentPrompt',
				score: result.agentPrompt.score,
				comment: formatViolations(result.agentPrompt.violations),
			});

			// Tools check
			feedback.push({
				key: 'programmatic.tools',
				score: result.tools.score,
				comment: formatViolations(result.tools.violations),
			});

			// FromAi check
			feedback.push({
				key: 'programmatic.fromAi',
				score: result.fromAi.score,
				comment: formatViolations(result.fromAi.violations),
			});

			// Similarity check (if reference workflow provided)
			if (result.similarity !== null && result.similarity !== undefined) {
				feedback.push({
					key: 'programmatic.similarity',
					score: result.similarity.score,
					comment: formatViolations(result.similarity.violations),
				});
			}

			return feedback;
		},
	};
}
