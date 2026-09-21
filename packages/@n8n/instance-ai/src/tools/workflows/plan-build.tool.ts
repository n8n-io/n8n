import { Tool } from '@n8n/agents';

import { selectDecisionService } from './compiler-tool-support';
import type { InstanceAiContext } from '../../types';
import { buildPlanSchema, decideBuildPlan } from '../../workflow-builder/plan-build';
import { recordBuildPlanReview } from '../../workflow-builder/build-plan-review';
import { DOMAIN_TOOL_IDS } from '../tool-ids';

export function createPlanBuildTool(context: InstanceAiContext) {
	return new Tool(DOMAIN_TOOL_IDS.PLAN_BUILD)
		.description(
			'After you describe the complete workflow or Agent behavior in text, use JEV to choose installed nodes and operations in bounded parallel batches. ' +
				'This returns grounded node definitions. It does not save or execute anything. ' +
				'Call once in each new edit turn before build-workflow. For parameter-only edits, describe the change and preserved behavior with steps: [] to review without repeating node discovery. ' +
				'You then fill parameters, expressions, and graph connections. Resolve uncertain choices with reasoning or ask-user. Never omit a requested stage.',
		)
		.input(buildPlanSchema)
		.handler(async (input, ctx) => {
			const review = await decideBuildPlan(
				input,
				context.nodeService,
				selectDecisionService(context),
				ctx.abortSignal,
			);
			const planId = await recordBuildPlanReview(
				context,
				review.selections.flatMap(({ id, selected }) => (selected ? [{ id, ...selected }] : [])),
			);
			return {
				...review,
				planId,
				graphGuidance:
					'For a selected step, use graph.planId and a node with step, name, and parameters. Omit type and typeVersion. Code supplies them and the selected resource, operation, and mode. Do not change these operation fields. For unresolved steps, use explicit type and typeVersion after LLM reasoning. Include every edge and requested behavior.',
			};
		})
		.build();
}
