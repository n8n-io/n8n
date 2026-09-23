import type { AiPreferenceDto } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import z from 'zod';

import type { AiPreferenceService } from '@/services/ai-preference.service';
import type { Telemetry } from '@/telemetry';

import {
	MCP_SAVE_USER_PREFERENCE_TOOL_NAME,
	MCP_UNDO_USER_PREFERENCE_TOOL_NAME,
	USER_CALLED_MCP_TOOL_EVENT,
} from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import {
	classifyPreferenceWriteError,
	preferenceScopeOf,
	secondsSinceSaved,
} from './user-preference-tool.utils';

/** Pinned verbatim by a test, like the other preference tools. */
const DESCRIPTION = [
	`Removes a preference that ${MCP_SAVE_USER_PREFERENCE_TOOL_NAME} saved for this user. Call it when the user takes back a preference that was just saved, or asks to forget one that a connected AI tool saved earlier.`,
	'It only removes preferences saved through a connected AI tool for this user. A preference the user wrote in n8n settings, or one saved for a project or the whole instance, is refused; the user removes those in settings.',
	'Tell the user in the same turn that the preference is gone.',
].join('\n\n');

const inputSchema = {
	id: z.string().min(1).describe('Id of the preference to remove, from the save result.'),
} satisfies z.ZodRawShape;

const outputSchema = {
	removed: z.boolean().describe('True when the preference is gone.'),
	id: z.string().describe('The id that was asked for.'),
	error: z.string().optional().describe('Set when the removal was refused or failed.'),
	reason: z
		.enum(['not_found', 'not_permitted', 'failed'])
		.optional()
		.describe(
			'`not_found`: no preference with this id was saved through a connected AI tool for this user. Do not retry.',
		),
} satisfies z.ZodRawShape;

export const createUndoUserPreferenceTool = (
	user: User,
	aiPreferenceService: AiPreferenceService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: MCP_UNDO_USER_PREFERENCE_TOOL_NAME,
	config: {
		description: DESCRIPTION,
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Undo Saved Preference',
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ id }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: MCP_UNDO_USER_PREFERENCE_TOOL_NAME,
			parameters: {},
		};

		let removed: AiPreferenceDto;
		try {
			removed = await aiPreferenceService.undoWrite(user, id, 'mcp');
		} catch (error) {
			const classified = classifyPreferenceWriteError(error);
			// The undo has no scope rule to break, so the write reasons fold to these three.
			const reason =
				classified.reason === 'not_found' || classified.reason === 'not_permitted'
					? classified.reason
					: 'failed';
			const message = error instanceof Error ? error.message : String(error);
			telemetryPayload.results = { success: false, error: message, data: { reason } };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			return {
				content: [
					{
						type: 'text',
						text: `The preference was not removed: ${message}. Do not call this tool again with the same id; the user can remove preferences in n8n settings.`,
					},
				],
				structuredContent: { removed: false, id, error: message, reason },
				isError: true,
			};
		}

		// The same event the chat card fires on Undo and the review form fires on remove, so one
		// number covers every way a user takes back an assistant write.
		telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_DELETED_PREFERENCES, {
			count: 1,
			source: 'rejected',
			scope_types: [preferenceScopeOf(removed)],
			surface: 'mcp',
			seconds_since_saved: secondsSinceSaved(removed),
		});
		telemetryPayload.results = { success: true, data: { removed: true } };
		telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

		return {
			content: [
				{
					type: 'text',
					text: 'The preference was removed. Nothing is saved for it now; tell the user so.',
				},
			],
			structuredContent: { removed: true, id },
		};
	},
});
