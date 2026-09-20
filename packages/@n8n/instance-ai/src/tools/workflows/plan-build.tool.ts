import { Tool } from '@n8n/agents';

import { selectDecisionService } from './compiler-tool-support';
import type { InstanceAiContext } from '../../types';
import { buildPlanSchema, decideBuildPlan } from '../../workflow-builder/plan-build';
import { DOMAIN_TOOL_IDS } from '../tool-ids';

export function createPlanBuildTool(context: InstanceAiContext) {
	return new Tool(DOMAIN_TOOL_IDS.PLAN_BUILD)
		.description(
			'After you describe the complete workflow or Agent behavior in text, use JEV to choose installed nodes and operations in bounded parallel batches. ' +
				'This returns grounded node definitions. It does not save or execute anything. ' +
				'You then fill parameters, expressions, and graph connections. Resolve uncertain choices with reasoning or ask-user. Never omit a requested stage.',
		)
		.input(buildPlanSchema)
		.handler(
			async (input, ctx) =>
				await decideBuildPlan(
					input,
					context.nodeService,
					selectDecisionService(context),
					ctx.abortSignal,
				),
		)
		.build();
}
