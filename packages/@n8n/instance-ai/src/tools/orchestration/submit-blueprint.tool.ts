import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { planningBlueprintSchema } from './blueprint.schema';

/**
 * Tool the planner sub-agent calls to finalize its solution blueprint.
 *
 * Zod validates the input against `planningBlueprintSchema`. The planner's
 * background task `run()` function extracts the validated blueprint from the
 * last `submit-blueprint` tool call and returns it as
 * `BackgroundTaskResult.outcome.blueprint`.
 */
export function createSubmitBlueprintTool() {
	return createTool({
		id: 'submit-blueprint',
		description:
			'Submit the finalized solution blueprint. Call this exactly once after ' +
			'your analysis is complete. This is your FINAL action — after this tool returns, ' +
			'reply with only "Blueprint submitted." and stop. Do not summarize or recap.',
		inputSchema: planningBlueprintSchema,
		outputSchema: z.object({ result: z.string() }),
		execute: async (input) => {
			const itemCount =
				input.workflows.length +
				input.dataTables.length +
				input.researchItems.length +
				input.delegateItems.length;
			return await Promise.resolve({
				result: `Blueprint submitted (${itemCount} items). Your job is done — reply with "Blueprint submitted." and nothing else.`,
			});
		},
	});
}
