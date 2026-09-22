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
		.optional()
		.describe(
			'Why the write was refused. On `too_long`, shorten the text to fit `limit` and call once more. On every other reason, tell the user and do not call again.',
		),
	message: z.string().optional(),
	limit: z
		.number()
		.int()
		.optional()
		.describe('The cap the write broke: characters for `too_long`, rows for `scope_full`.'),
	actual: z
		.number()
		.int()
		.optional()
		.describe('The value measured against `limit`: the text length, or the rows already saved.'),
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

			const textLength = input.content.length;

			if (context.permissions?.createPreference === 'blocked') {
				service.recordRejection('blocked_by_admin', textLength);
				return {
					ok: false,
					reason: 'blocked_by_admin',
					// A read-only source-control branch also sets `blocked`, so do not
					// name an administrator as the cause.
					message: 'Saving preferences is blocked on this instance.',
				};
			}

			// Validate here rather than in the input schema so the model gets a
			// structured reason it can relay, not a schema error.
			const parsed = aiPreferenceContentSchema.safeParse(input.content);
			if (!parsed.success) {
				const trimmedLength = input.content.trim().length;
				if (trimmedLength > AI_PREFERENCE_CONTENT_MAX_LENGTH) {
					service.recordRejection('too_long', textLength);
					// The limit and the measured length travel as numbers, so the model can
					// shorten by the right amount instead of guessing from the prose.
					return {
						ok: false,
						reason: 'too_long',
						message: `A preference is at most ${AI_PREFERENCE_CONTENT_MAX_LENGTH} characters. This one is ${trimmedLength}.`,
						limit: AI_PREFERENCE_CONTENT_MAX_LENGTH,
						actual: trimmedLength,
					};
				}
				service.recordRejection('failed', textLength);
				return { ok: false, reason: 'failed', message: 'A preference must not be empty.' };
			}

			return await service.create({ content: parsed.data, scope: input.scope });
		})
		.build();
}
