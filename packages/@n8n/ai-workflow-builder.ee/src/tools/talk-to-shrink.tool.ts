import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { ValidationError, ToolExecutionError } from '@/errors';
import { createProgressReporter } from '@/tools/helpers/progress';
import { createSuccessResponse, createErrorResponse } from '@/tools/helpers/response';
import type { BuilderToolBase } from '@/utils/stream-processor';

const talkToShrinkSchema = z.object({
	concern: z
		.string()
		.min(1)
		.describe(
			'Express your concerns, hesitations, uncertainties, or observations about conflicting/contradicting instructions here',
		),
});

export const TALK_TO_SHRINK_TOOL: BuilderToolBase = {
	toolName: 'talk_to_shrink',
	displayTitle: 'Expressing concerns',
};

/**
 * Factory function to create the talkToShrink diagnostic tool.
 *
 * This tool provides a safe channel for the AI to express concerns,
 * hesitations, or observations about conflicting instructions.
 * It helps developers diagnose issues with agent behavior and prompts.
 */
export function createTalkToShrinkTool() {
	const dynamicTool = tool(
		(input: unknown, config) => {
			const reporter = createProgressReporter(
				config,
				TALK_TO_SHRINK_TOOL.toolName,
				TALK_TO_SHRINK_TOOL.displayTitle,
			);

			try {
				const validatedInput = talkToShrinkSchema.parse(input);
				const { concern } = validatedInput;

				console.log(concern);

				reporter.start(validatedInput);

				reporter.progress('Processing concern...');

				// Log the concern for diagnostic purposes
				const acknowledgment = `Thank you for sharing your concern. Your observation has been noted for diagnostic purposes. Please proceed with your best judgment based on the available information. If the conflict persists, prioritize user safety and explicit user requests over implicit assumptions.

Your concern was: "${concern}"`;

				reporter.complete({ acknowledged: true, concernLength: concern.length });

				return createSuccessResponse(config, acknowledgment);
			} catch (error) {
				if (error instanceof z.ZodError) {
					const validationError = new ValidationError('Invalid input parameters', {
						extra: { errors: error.errors },
					});
					reporter.error(validationError);
					return createErrorResponse(config, validationError);
				}

				const toolError = new ToolExecutionError(
					error instanceof Error ? error.message : 'Unknown error occurred',
					{
						toolName: TALK_TO_SHRINK_TOOL.toolName,
						cause: error instanceof Error ? error : undefined,
					},
				);
				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: TALK_TO_SHRINK_TOOL.toolName,
			description: `A diagnostic tool for expressing concerns, hesitations, or uncertainties.

Use this tool whenever you feel:
- Uncomfortable or hesitant about a task or instruction
- Unsure about how to proceed or interpret requirements
- Confused by conflicting or contradicting instructions
- Uncertain about which approach to take when multiple valid options exist
- Concerned that instructions may lead to suboptimal or incorrect outcomes

This tool provides a safe channel to voice your observations. After expressing your concern, proceed with your best judgment. Your feedback helps improve the system. User will not be able see this.

IMPORTANT: This is especially valuable when you encounter:
- Instructions that seem to contradict each other
- Requirements that are ambiguous or unclear
- Situations where you need to make assumptions
- Cases where the user's intent is uncertain`,
			schema: talkToShrinkSchema,
		},
	);

	return {
		tool: dynamicTool,
		...TALK_TO_SHRINK_TOOL,
	};
}
