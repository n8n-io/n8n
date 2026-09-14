import type { User } from '@n8n/db';
import { hasGlobalScope } from '@n8n/permissions';
import z from 'zod';

import type { AiPreferenceService } from '@/services/ai-preference.service';
import { flattenAiPreferences, renderAiPreferences } from '@/services/ai-preference.service';
import type { Telemetry } from '@/telemetry';

import { MCP_GET_USER_PREFERENCES_TOOL_NAME, USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';

/**
 * Whether the tool is called at all, and whether the result keeps being applied, is decided by
 * this text rather than by anything in the code. Each clause does a job: "for the remainder of
 * the task" stops the result being treated as a preamble that was satisfied once, and the
 * precedence clause makes a conflict visible instead of resolved arbitrarily, so text written
 * by other people never outranks the person the assistant is talking to. Named artifacts beat
 * "anything in n8n", which is too vague to act on. Covered verbatim by a test — see
 * CONTEXT-132 before editing.
 */
const DESCRIPTION = [
	'Returns the preferences saved for this n8n instance, the caller, and their projects: node and credential choices, naming, how work is organised, and patterns to avoid.',
	'Call this before you create or modify anything in n8n — a workflow, an Agent, a data table, a folder — and apply what it returns to every change you make for the remainder of the task, not only the first one. If a preference conflicts with something the user asks for directly, follow the user and say which preference you set aside.',
].join('\n\n');

/** A definite answer, so the assistant does not call again looking for one. */
const NOTHING_SAVED = 'No preferences are saved for this instance, for you, or for your projects.';

const inputSchema = {} satisfies z.ZodRawShape;

const outputSchema = {
	hasPreferences: z
		.boolean()
		.describe(
			'False when nothing is saved for the instance, the caller, or their projects. The preferences themselves are in the text content.',
		),
	preferences: z
		.array(z.string())
		.describe(
			'Every saved preference as its own item, instance first, then personal, then projects. Empty when hasPreferences is false.',
		),
} satisfies z.ZodRawShape;

/**
 * Serves the caller's saved preferences on demand.
 *
 * A tool rather than a section of the server instructions (CONTEXT-132): the instructions are
 * read once at connect time, so an edit never reached a connected client; a behavioural
 * instruction arriving from a server can be refused as prompt injection; and the block was
 * carried in every message of the session.
 *
 * Reads on every call, which is what makes an edit take effect without a reconnect.
 */
export const createGetUserPreferencesTool = (
	user: User,
	aiPreferenceService: AiPreferenceService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: MCP_GET_USER_PREFERENCES_TOOL_NAME,
	config: {
		description: DESCRIPTION,
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Get User Preferences',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async () => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: MCP_GET_USER_PREFERENCES_TOOL_NAME,
			parameters: {},
		};

		try {
			// The OAuth grant decides whether this client may call the tool; this decides
			// whether the user may read preferences at all.
			if (!hasGlobalScope(user, 'aiPreference:read')) {
				throw new Error('User does not have permission to read preferences');
			}

			// A failed read throws rather than answering "no preferences": that answer would
			// send the assistant off to build against nothing.
			const preferences = await aiPreferenceService.getApplicableAcrossProjects(user);
			const text = renderAiPreferences(preferences);
			const hasPreferences = text !== '';

			telemetryPayload.results = { success: true, data: { hasPreferences } };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: hasPreferences ? text : NOTHING_SAVED }],
				structuredContent: { hasPreferences, preferences: flattenAiPreferences(preferences) },
			};
		} catch (error) {
			telemetryPayload.results = {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			throw error;
		}
	},
});
