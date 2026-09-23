import type { AiPreferenceDto } from '@n8n/api-types';
import { aiPreferenceContentSchema } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import z from 'zod';

import type { AiPreferenceService } from '@/services/ai-preference.service';
import type { UrlService } from '@/services/url.service';
import type { Telemetry } from '@/telemetry';

import {
	MCP_GET_USER_PREFERENCES_TOOL_NAME,
	MCP_UPDATE_USER_PREFERENCE_TOOL_NAME,
	USER_CALLED_MCP_TOOL_EVENT,
} from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import {
	classifyPreferenceWriteError,
	PREFERENCE_WRITE_REASONS,
	preferenceScopeOf,
	preferencesSettingsUrl,
	savedPreferenceSchema,
	toRejectedReason,
	toSavedPreferenceOutput,
} from './user-preference-tool.utils';

/** Pinned verbatim by a test, like the other preference tools. */
const DESCRIPTION = [
	'Replaces the text of a saved preference. Use it when the user changes or refines a preference that is already saved, instead of saving a second one next to it.',
	`Take the id from ${MCP_GET_USER_PREFERENCES_TOOL_NAME} or from the result of the save. The scope stays where it is; only the text changes.`,
	'Tell the user the new text in the same turn, so they see what changed.',
].join('\n\n');

const inputSchema = {
	id: z.string().min(1).describe('Id of the preference to change.'),
	content: aiPreferenceContentSchema,
} satisfies z.ZodRawShape;

const outputSchema = {
	saved: z.boolean().describe('True when the preference now carries the new text.'),
	preference: savedPreferenceSchema.optional().describe('The preference after the edit.'),
	error: z.string().optional().describe('Set when the edit was refused or failed.'),
	reason: z
		.enum(PREFERENCE_WRITE_REASONS)
		.optional()
		.describe(
			'Why the edit was refused. `not_found`: no preference with this id is visible to the user; read the preferences again. `duplicate`: another preference in the same scope already has this text. Do not retry the same call.',
		),
} satisfies z.ZodRawShape;

export const createUpdateUserPreferenceTool = (
	user: User,
	aiPreferenceService: AiPreferenceService,
	telemetry: Telemetry,
	urlService: UrlService,
): ToolDefinition<typeof inputSchema> => ({
	name: MCP_UPDATE_USER_PREFERENCE_TOOL_NAME,
	config: {
		description: DESCRIPTION,
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Update User Preference',
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ id, content }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: MCP_UPDATE_USER_PREFERENCE_TOOL_NAME,
			parameters: { text_length: content.length },
		};

		let preference: AiPreferenceDto;
		try {
			preference = await aiPreferenceService.updateContent(user, id, content);
		} catch (error) {
			const { reason, message } = classifyPreferenceWriteError(error);
			telemetry.track(TELEMETRY_EVENT.CONTEXT.PREFERENCE_WRITE_REJECTED, {
				surface: 'mcp',
				reason: toRejectedReason(reason),
				text_length: content.length,
			});
			telemetryPayload.results = { success: false, error: message, data: { reason } };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			return {
				content: [
					{
						type: 'text',
						text: `The preference was not changed: ${message}. Do not call this tool again with the same input.`,
					},
				],
				structuredContent: { saved: false, error: message, reason },
				isError: true,
			};
		}

		const scope = preferenceScopeOf(preference);
		telemetry.track(TELEMETRY_EVENT.CONTEXT.ASSISTANT_SAVED_PREFERENCE, {
			surface: 'mcp',
			scope_type: scope,
			text_length: preference.content.length,
			replaced_existing: true,
		});
		telemetryPayload.results = { success: true, data: { scope } };
		telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

		const url = preferencesSettingsUrl(urlService);
		return {
			content: [
				{
					type: 'text',
					text: `Preference updated. New text: "${preference.content}". Tell the user this is what is saved now and that they can review it at ${url}.`,
				},
			],
			structuredContent: { saved: true, preference: toSavedPreferenceOutput(preference, url) },
		};
	},
});
