import { Tool } from '@n8n/agents';
import { appBlueprintResumeSchema, appBlueprintSchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { APP_BLUEPRINT_TOOL_ID } from './tool-ids';

export { APP_BLUEPRINT_TOOL_ID };

export const appBlueprintInputSchema = z.object({
	blueprint: appBlueprintSchema.describe('The app you propose to build'),
});

/**
 * Shows the user an editable summary of the app the agent intends to build
 * and suspends until they approve it or ask for changes. The approved
 * blueprint (as edited in the card) is what `apps(action="create")` and the
 * first build should follow.
 */
export function createAppBlueprintTool() {
	return new Tool(APP_BLUEPRINT_TOOL_ID)
		.description(
			'Propose an app before creating it; the run suspends until the user approves or asks for changes. ' +
				'Call it once you know what to build (after the clarifying questions) and before apps(action="create"). ' +
				'The user can edit the name, namespace, connections and theme in the card: build from the returned ' +
				'`blueprint`, not from your proposal. `approved: false` with `feedback` means revise and propose ' +
				'again; never create the app without an approved blueprint.',
		)
		.input(appBlueprintInputSchema)
		.output(
			z.object({
				approved: z.boolean(),
				blueprint: appBlueprintSchema.optional(),
				feedback: z.string().optional(),
			}),
		)
		.suspend(
			z.object({
				requestId: z.string(),
				message: z.string(),
				severity: z.literal('info'),
				inputType: z.literal('app-blueprint'),
				appBlueprint: appBlueprintSchema,
			}),
		)
		.resume(appBlueprintResumeSchema)
		.handler(async (input: z.infer<typeof appBlueprintInputSchema>, ctx) => {
			const resumeData = ctx.resumeData;

			if (resumeData === undefined || resumeData === null) {
				return await ctx.suspend({
					requestId: nanoid(),
					message: `Review the blueprint for ${input.blueprint.name}`,
					severity: 'info' as const,
					inputType: 'app-blueprint' as const,
					appBlueprint: input.blueprint,
				});
			}

			if (!resumeData.approved) {
				return {
					approved: false,
					...(resumeData.feedback ? { feedback: resumeData.feedback } : {}),
				};
			}

			// A resume without the edited copy (older client) falls back to the proposal.
			return { approved: true, blueprint: resumeData.blueprint ?? input.blueprint };
		})
		.build();
}
