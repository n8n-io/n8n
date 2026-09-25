import type { AiPreferenceDto, AiPreferenceScope } from '@n8n/api-types';
import { aiPreferenceContentSchema } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
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
import type { PreferenceWriteReason } from './user-preference-tool.utils';
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
	'Changes a saved preference: its text, who it applies to, or both. Use it when the user changes or refines a preference that is already saved, instead of saving a second one next to it.',
	`Take the id from ${MCP_GET_USER_PREFERENCES_TOOL_NAME} or from the result of the save. Leave \`scope\` out to keep the preference where it is; only the user decides to move one, so pass \`scope\` when they ask for it and never on your own.`,
	'A move to `project` needs `projectId` from `search_projects`. A move the user may not make is refused with `not_permitted`.',
	'Tell the user what the preference says now and who it applies to, in the same turn.',
].join('\n\n');

const inputSchema = {
	id: z.string().min(1).describe('Id of the preference to change.'),
	content: aiPreferenceContentSchema
		.optional()
		.describe('The new text. Leave it out to keep the text and move the preference only.'),
	scope: z
		.enum(['user', 'project', 'instance'])
		.optional()
		.describe(
			'Who the preference applies to after the change: `user` the caller in every project, `project` everyone in one project, `instance` everyone on this n8n instance. Leave it out to keep the current scope.',
		),
	projectId: z
		.string()
		.min(1)
		.optional()
		.describe('The project to move the preference to. Required with `scope` `project`.'),
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
	logger: Logger,
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
	handler: async ({ id, content, scope: requestedScope, projectId }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: MCP_UPDATE_USER_PREFERENCE_TOOL_NAME,
			parameters: {
				...(content !== undefined ? { text_length: content.length } : {}),
				...(requestedScope !== undefined ? { scope: requestedScope } : {}),
			},
		};

		const refuse = (reason: PreferenceWriteReason, message: string, textLength?: number) => {
			telemetry.track(TELEMETRY_EVENT.CONTEXT.PREFERENCE_WRITE_REJECTED, {
				surface: 'mcp',
				reason: toRejectedReason(reason),
				// The scope the call named, when it named one. The field is absent only for a
				// call that named no usable scope, which is what the event documents.
				...(requestedScope !== undefined ? { scope_type: requestedScope } : {}),
				...(textLength !== undefined ? { text_length: textLength } : {}),
			});
			telemetryPayload.results = { success: false, error: message, data: { reason } };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			return {
				content: [
					{
						type: 'text' as const,
						text: `The preference was not changed: ${message}. Do not call this tool again with the same input.`,
					},
				],
				structuredContent: { saved: false, error: message, reason },
				isError: true,
			};
		};

		// A call that changes nothing is a model mistake, not a refusal the user caused.
		if (content === undefined && requestedScope === undefined) {
			return refuse('failed', 'Name the new text, the new scope, or both');
		}
		if (requestedScope === 'project' && !projectId) {
			return refuse('failed', 'A move to a project needs a projectId');
		}

		// The row before the change: the move reports the scope it left, and a text-only move
		// keeps the text the row already has.
		let before: AiPreferenceDto;
		try {
			before = await aiPreferenceService.getById(user, id);
		} catch (error) {
			const { reason, message } = classifyPreferenceWriteError(error);
			if (reason === 'failed') {
				logger.error('Reading an AI preference over MCP failed', { error });
			}
			return refuse(reason, message, content?.length);
		}

		const beforeScope = preferenceScopeOf(before);
		const text = content ?? before.content;
		const moved =
			requestedScope !== undefined &&
			(requestedScope !== beforeScope ||
				(requestedScope === 'project' && projectId !== before.projectId));

		let preference: AiPreferenceDto;
		try {
			preference = requestedScope
				? await aiPreferenceService.update(user, id, {
						content: text,
						scope: requestedScope,
						// A user-scope row keeps its owner. A row moving into user scope has none to
						// keep, so it goes to the caller, who is the only owner MCP can name.
						userId: requestedScope === 'user' ? (before.userId ?? user.id) : null,
						projectId: requestedScope === 'project' ? (projectId ?? null) : null,
					})
				: await aiPreferenceService.updateContent(user, id, text);
		} catch (error) {
			const { reason, message } = classifyPreferenceWriteError(error);
			// The mapped refusals carry their own text. Anything else is a fault whose message stays
			// internal, so it goes to the log or it is lost.
			if (reason === 'failed') {
				logger.error('Updating an AI preference over MCP failed', { error });
			}
			telemetry.track(TELEMETRY_EVENT.CONTEXT.PREFERENCE_WRITE_REJECTED, {
				surface: 'mcp',
				reason: toRejectedReason(reason),
				scope_type: requestedScope ?? beforeScope,
				text_length: text.length,
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
		// The user asked the client to change a saved preference, so it lands in the same funnel
		// as an edit from the review form. Without it an MCP edit is invisible to the ratio that
		// says whether the assistant saves the right text.
		telemetry.track(TELEMETRY_EVENT.CONTEXT.PREFERENCE_CONFIRMATION_RESOLVED, {
			surface: 'mcp',
			outcome: 'accepted_after_edit',
			scope_type: scope,
			text_length: preference.content.length,
		});
		// The same pair the chat card fires on a move, so one number covers every surface that
		// can take a preference off the scope the tool wrote it with.
		telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_UPDATED_PREFERENCE, {
			scope_type: scope,
			text_length: preference.content.length,
			// The same answer the move event gives. A change of project is a move, and reading
			// only the scope kind would call it no change on one event and a move on the other.
			scope_changed: moved,
			...(preference.projectId ? { project_id: preference.projectId } : {}),
			surface: 'mcp',
		});
		if (moved) {
			telemetry.track(TELEMETRY_EVENT.CONTEXT.PREFERENCE_SCOPE_ACCEPTED, {
				surface: 'mcp',
				offered_scope: beforeScope,
				accepted_scope: scope,
				scope_changed: true,
			});
		}
		telemetryPayload.results = { success: true, data: { scope, moved } };
		telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

		const url = preferencesSettingsUrl(urlService);
		return {
			content: [
				{
					type: 'text',
					text: `Preference updated. It now reads "${preference.content}" and applies to ${scopeInWords(scope)}. Tell the user both, and that they can review it at ${url}.`,
				},
			],
			structuredContent: { saved: true, preference: toSavedPreferenceOutput(preference, url) },
		};
	},
});

/** Who a preference applies to, in the words the client relays to the user. */
function scopeInWords(scope: AiPreferenceScope): string {
	if (scope === 'instance') return 'everyone on this n8n instance';
	if (scope === 'project') return 'everyone in the project';
	return 'the user only, in every project';
}
