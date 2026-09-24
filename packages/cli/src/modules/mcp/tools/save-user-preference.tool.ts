import type { AiPreferenceDto } from '@n8n/api-types';
import { AI_PREFERENCE_CONTENT_MAX_LENGTH, aiPreferenceContentSchema } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { isRecord } from '@n8n/utils/is-record';
import { lazyImport } from '@n8n/utils/lazy-import';
import z from 'zod';

import { writeAssistantPreference } from '@/services/ai-preference-write';
import type { AiPreferenceService } from '@/services/ai-preference.service';
import type { UrlService } from '@/services/url.service';
import type { Telemetry } from '@/telemetry';

import {
	MCP_GET_USER_PREFERENCES_TOOL_NAME,
	MCP_SAVE_USER_PREFERENCE_TOOL_NAME,
	MCP_UNDO_USER_PREFERENCE_TOOL_NAME,
	MCP_UPDATE_USER_PREFERENCE_TOOL_NAME,
	USER_CALLED_MCP_TOOL_EVENT,
} from '../mcp.constants';
import type {
	ToolDefinition,
	ToolHandlerResult,
	UserCalledMCPToolEventPayload,
} from '../mcp.types';
import {
	classifyPreferenceWriteError,
	PREFERENCE_WRITE_REASONS,
	preferencesSettingsUrl,
	savedPreferenceSchema,
	secondsSinceSaved,
	toSavedPreferenceOutput,
} from './user-preference-tool.utils';

/**
 * A requirement of CONTEXT-161, pinned verbatim by a test. There is no system prompt on this side,
 * so the description is the only lever over when a client saves, and it has to carry the line
 * between a durable preference and a one-off instruction on its own.
 */
const DESCRIPTION = [
	'Saves a preference about how the user likes to work with n8n, so the n8n assistant and every connected AI tool apply it from now on: node and credential choices, naming, how work is organised, patterns to avoid.',
	'Call this only for a durable preference the user states about their way of working, such as "always add an error workflow" or "name nodes in English". Do not call it for an instruction that applies to the current task only, such as "make this one a POST request", and do not infer a preference the user did not state.',
	`Read ${MCP_GET_USER_PREFERENCES_TOOL_NAME} first. If a saved preference already covers the same ground, call ${MCP_UPDATE_USER_PREFERENCE_TOOL_NAME} with its id instead of saving a near-duplicate; saving the exact same text again is refused.`,
	`The preference is saved at once, without a confirmation step. In the same turn, tell the user the exact text that was saved and give them the settings link from the result, so they can check it. If they want it changed, call ${MCP_UPDATE_USER_PREFERENCE_TOOL_NAME}; if they want it gone, call ${MCP_UNDO_USER_PREFERENCE_TOOL_NAME}.`,
].join('\n\n');

/** The key of the one input request, read back from the retry's `inputResponses`. */
const REVIEW_KEY = 'review';

const inputSchema = {
	content: aiPreferenceContentSchema,
} satisfies z.ZodRawShape;

const outputSchema = {
	saved: z
		.boolean()
		.describe('True when a preference is saved when this call returns. False when nothing is.'),
	preference: savedPreferenceSchema
		.optional()
		.describe('The preference as saved. Absent when `saved` is false.'),
	removed: z
		.boolean()
		.optional()
		.describe('True when the user declined the review form that followed the write.'),
	error: z.string().optional().describe('Set when the write or the review failed.'),
	reason: z
		.enum(PREFERENCE_WRITE_REASONS)
		.optional()
		.describe(
			'Why the write was refused. `duplicate`: the same text is saved already, read the preferences and update that one. `scope_full`: the user has to remove a preference first. Do not retry the same call.',
		),
} satisfies z.ZodRawShape;

type Output = z.objectOutputType<typeof outputSchema, z.ZodTypeAny>;

/** The slice of the SDK's handler context this tool reads. */
type HandlerContext = {
	mcpReq?: {
		envelope?: Record<string, unknown>;
		inputResponses?: Record<string, unknown>;
		requestState?: <T = unknown>() => T | undefined;
	};
};

/** What the form asks: the saved text, editable. The three answers carry the rest. */
const reviewFormSchema = z.object({
	text: z.string().optional(),
});

/**
 * Whether the client can show a form. On this revision a client names its modes, and one that
 * declares `url` alone cannot answer a form. A bare `elicitation: {}` still counts as form
 * support: the rule from before modes existed, which the SDK keeps as well.
 */
function supportsFormElicitation(capabilities: unknown): boolean {
	const elicitation = isRecord(capabilities) ? capabilities.elicitation : undefined;
	if (!isRecord(elicitation)) return false;
	return 'form' in elicitation || !('url' in elicitation);
}

/**
 * Saves a personal preference with no confirmation gate, then, on a client that declares
 * elicitation, follows the write with one form that offers edit and undo: Accept keeps the text
 * as shown, Decline removes the row, and a cancelled form keeps it, because the write already
 * happened and silence must not delete data.
 *
 * The form is the second round of one `tools/call` (multi-round-trip elicitation, protocol
 * revision 2026-07-28): the client answers and retries the same call, and the row id travels in
 * `requestState`. The retry re-authorizes through the service, so a forged id reaches nothing the
 * caller could not already reach through the update and undo tools.
 */
export const createSaveUserPreferenceTool = (
	user: User,
	aiPreferenceService: AiPreferenceService,
	telemetry: Telemetry,
	urlService: UrlService,
	logger: Logger,
): ToolDefinition<typeof inputSchema, ToolHandlerResult> => ({
	name: MCP_SAVE_USER_PREFERENCE_TOOL_NAME,
	config: {
		description: DESCRIPTION,
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Save User Preference',
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: false,
		},
	},
	handler: async ({ content }, extra) => {
		const { inputRequired, inputResponse, CLIENT_CAPABILITIES_META_KEY } = await lazyImport<
			typeof import('@modelcontextprotocol/server')
		>(async () => await import('@modelcontextprotocol/server'));

		const ctx = (extra ?? {}) as HandlerContext;
		const canElicit = supportsFormElicitation(ctx.mcpReq?.envelope?.[CLIENT_CAPABILITIES_META_KEY]);
		const review = inputResponse(ctx.mcpReq?.inputResponses, REVIEW_KEY);
		const url = preferencesSettingsUrl(urlService);

		// Count and capability, never the text, which is the person's own writing.
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: MCP_SAVE_USER_PREFERENCE_TOOL_NAME,
			parameters: { text_length: content.length, can_elicit: canElicit },
		};

		const done = (output: Output, text: string, isError = false): ToolHandlerResult => {
			telemetryPayload.results = isError
				? { success: false, error: output.error, data: { reason: output.reason } }
				: {
						success: true,
						data: {
							saved: output.saved,
							removed: output.removed ?? false,
							review: review.kind === 'elicit' ? review.action : 'none',
						},
					};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			return {
				content: [{ type: 'text', text }],
				structuredContent: output,
				...(isError ? { isError: true } : {}),
			};
		};

		const savedResult = (preference: AiPreferenceDto, lead: string) =>
			done(
				{ saved: true, preference: toSavedPreferenceOutput(preference, url) },
				`${lead} Saved text: "${preference.content}". Tell the user this is what was saved and that they can review it at ${url}.`,
			);

		const applyReview = async (
			id: string,
			answer: Extract<ReturnType<typeof inputResponse>, { kind: 'elicit' }>,
		): Promise<ToolHandlerResult> => {
			const keep = `Tell the user the preference stays as saved and that they can review it at ${url}.`;

			// Cancel means keep: the row is already there, and a dismissed form removes nothing.
			if (answer.action === 'cancel') {
				return done(
					{ saved: true, preference: { id, scope: 'user', text: content, url } },
					`The user closed the review without changing the preference. Saved text: "${content}". ${keep}`,
				);
			}

			// Decline removes: every client offers that answer, and a press after the write means
			// "not this one". Unlike cancel, it is only ever a deliberate act.
			const form = reviewFormSchema.safeParse(answer.content ?? {});
			const wantsRemoval = answer.action === 'decline';
			const editedText = form.success ? form.data.text?.trim() : undefined;

			if (wantsRemoval) {
				try {
					const removed = await aiPreferenceService.undoWrite(user, id, 'mcp');
					// The same event the chat card fires on Undo: a late refusal of a write the
					// user first let stand.
					telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_DELETED_PREFERENCES, {
						count: 1,
						source: 'rejected',
						scope_types: ['user'],
						surface: 'mcp',
						seconds_since_saved: secondsSinceSaved(removed),
					});
					telemetry.track(TELEMETRY_EVENT.CONTEXT.PREFERENCE_CONFIRMATION_RESOLVED, {
						surface: 'mcp',
						outcome: 'rejected',
						scope_type: 'user',
						text_length: removed.content.length,
					});
					return done(
						{ saved: false, removed: true },
						'The user removed the preference in the review. Nothing is saved now. Do not save it again unless they ask.',
					);
				} catch (error) {
					const { reason, message } = classifyPreferenceWriteError(error);
					return done(
						{ saved: true, error: message, reason },
						`The user asked to remove the preference but the removal failed: ${message}. The preference is still saved. ${keep}`,
						true,
					);
				}
			}

			if (editedText && editedText !== content) {
				// The form's maxLength is advice to the client. The cap is applied here as the tool
				// input applies it, so an edit cannot save what a fresh save would refuse.
				const parsed = aiPreferenceContentSchema.safeParse(editedText);
				if (!parsed.success) {
					const message = `The edited text is longer than ${AI_PREFERENCE_CONTENT_MAX_LENGTH} characters.`;
					telemetry.track(TELEMETRY_EVENT.CONTEXT.PREFERENCE_WRITE_REJECTED, {
						surface: 'mcp',
						reason: 'too_long',
						scope_type: 'user',
						text_length: editedText.length,
					});
					return done(
						{
							saved: true,
							preference: { id, scope: 'user', text: content, url },
							error: message,
							reason: 'too_long',
						},
						`The user edited the preference but the edit was refused: ${message} The original text is still saved: "${content}". ${keep}`,
						true,
					);
				}
				try {
					const updated = await aiPreferenceService.updateContent(user, id, parsed.data);
					telemetry.track(TELEMETRY_EVENT.CONTEXT.PREFERENCE_CONFIRMATION_RESOLVED, {
						surface: 'mcp',
						outcome: 'accepted_after_edit',
						scope_type: 'user',
						text_length: updated.content.length,
					});
					return savedResult(updated, 'The user edited the preference in the review.');
				} catch (error) {
					const { reason, message } = classifyPreferenceWriteError(error);
					return done(
						{
							saved: true,
							preference: { id, scope: 'user', text: content, url },
							error: message,
							reason,
						},
						`The user edited the preference but the edit was refused: ${message}. The original text is still saved: "${content}". ${keep}`,
						true,
					);
				}
			}

			// `accepted` already fired with the write: silence is agreement, and so is this.
			return done(
				{ saved: true, preference: { id, scope: 'user', text: content, url } },
				`The user kept the preference as saved. Saved text: "${content}". ${keep}`,
			);
		};

		// Second round: the client answered the review form. The write is already on disk.
		if (review.kind === 'elicit') {
			const id = ctx.mcpReq?.requestState?.();
			if (!(typeof id === 'string' && z.string().uuid().safeParse(id).success)) {
				return done(
					{
						saved: true,
						error: 'The review answer could not be matched to the saved preference.',
					},
					`The preference was saved, but the review answer could not be matched to it. Read ${MCP_GET_USER_PREFERENCES_TOOL_NAME} to find it, and tell the user it is saved at ${url}.`,
				);
			}
			return await applyReview(id, review);
		}

		// First round: write at once, through the write the n8n Assistant tool also uses. It sets
		// the source, maps a refusal to a reason and fires the shown/accepted/saved events: the
		// review form below is the surface those events describe, and silence keeps the row.
		const written = await writeAssistantPreference({
			aiPreferenceService,
			telemetry,
			logger,
			user,
			surface: 'mcp',
			content,
			scope: 'user',
		});
		if (!written.ok) {
			return done(
				{ saved: false, error: written.message, reason: written.reason },
				`Nothing was saved: ${written.message}. Do not call this tool again with the same text.`,
				true,
			);
		}
		const { preference } = written;

		if (!canElicit) return savedResult(preference, 'Preference saved.');

		return inputRequired({
			inputRequests: {
				[REVIEW_KEY]: inputRequired.elicit({
					// Clients may show only the first lines of the message, so the state comes first:
					// the row is already saved, and closing the form keeps it. The last lines name where
					// the person manages it, and the consent permission that stops this tool saving more.
					message: `Saved to your n8n preferences. Accept to keep it, or Decline to delete it.\n\n"${preference.content}"\n\nFrom now on, the n8n assistant and your connected AI tools follow this preference. To change it, edit the text, then accept. If you close this, the preference stays saved.\n\nYou can change or delete it anytime in n8n under Settings > Context > Preferences. To stop this tool from saving preferences, connect it again without the "Save, update and undo AI preferences" permission.`,
					requestedSchema: {
						type: 'object',
						properties: {
							text: {
								type: 'string',
								title: 'Preference',
								description: "Edit the text to change what's saved.",
								default: preference.content,
								maxLength: AI_PREFERENCE_CONTENT_MAX_LENGTH,
							},
						},
					},
				}),
			},
			requestState: preference.id,
		});
	},
});
