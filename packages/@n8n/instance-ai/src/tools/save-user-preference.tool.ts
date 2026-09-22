import { Tool } from '@n8n/agents';
import { AI_PREFERENCE_CONTENT_MAX_LENGTH, aiPreferenceContentSchema } from '@n8n/api-types';
import { UnexpectedError } from 'n8n-workflow';
import { z } from 'zod';

import type { InstanceAiContext, InstanceAiPreferenceWriteResult } from '../types';
import { DOMAIN_TOOL_IDS } from './tool-ids';

/** A requirement, not prose: a test pins this string verbatim. Change it on purpose. */
export const SAVE_USER_PREFERENCE_DESCRIPTION =
	'Saves a durable preference for this user: a node or credential choice, a naming rule, how they organize their work, or a pattern to avoid. ' +
	'Call this when the user states something they want you to keep following in later conversations, not a one-off instruction for the current task. ' +
	'The saved text appears in the chat, where the user can edit or undo it. If this preference conflicts with one already saved, say so and let the user decide.';

const inputSchema = z.object({
	content: z
		.string()
		.describe(
			`The preference in the user's own terms, one or two sentences, at most ${AI_PREFERENCE_CONTENT_MAX_LENGTH} characters.`,
		),
	scope: z
		.literal('user')
		.describe(
			'Who the preference applies to. Only `user` (this user, in every project) exists yet.',
		),
});

const outputSchema = z.object({
	ok: z.boolean(),
	preference: z
		.object({ id: z.string(), content: z.string(), scope: z.literal('user') })
		.optional(),
	reason: z
		.enum(['too_long', 'scope_full', 'duplicate', 'not_permitted', 'blocked_by_admin', 'failed'])
		.optional(),
	message: z.string().optional(),
});

export function createSaveUserPreferenceTool(context: InstanceAiContext) {
	return new Tool(DOMAIN_TOOL_IDS.SAVE_USER_PREFERENCE)
		.description(SAVE_USER_PREFERENCE_DESCRIPTION)
		.input(inputSchema)
		.output(outputSchema)
		.handler(async (input): Promise<InstanceAiPreferenceWriteResult> => {
			const service = context.aiPreferenceService;
			// The tool is registered only when the adapter is wired, so a missing
			// service is a wiring fault, not a user or instance state.
			if (!service) {
				throw new UnexpectedError('Saved preferences are not enabled on this instance.');
			}

			if (context.permissions?.createPreference === 'blocked') {
				return {
					ok: false,
					reason: 'blocked_by_admin',
					message: 'An administrator has blocked the assistant from saving preferences.',
				};
			}

			// Validate here rather than in the input schema so the model gets a
			// structured reason it can relay, not a schema error.
			const parsed = aiPreferenceContentSchema.safeParse(input.content);
			if (!parsed.success) {
				const tooLong = input.content.trim().length > AI_PREFERENCE_CONTENT_MAX_LENGTH;
				return {
					ok: false,
					reason: tooLong ? 'too_long' : 'failed',
					message: tooLong
						? `A preference is at most ${AI_PREFERENCE_CONTENT_MAX_LENGTH} characters.`
						: 'A preference must not be empty.',
				};
			}

			return await service.create({ content: parsed.data, scope: input.scope });
		})
		.build();
}
