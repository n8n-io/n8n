import type { User } from '@n8n/db';
import { hasGlobalScope } from '@n8n/permissions';
import z from 'zod';

import type { AiPreferenceService } from '@/services/ai-preference.service';
import { flattenAiPreferences, renderAiPreferences } from '@/services/ai-preference.service';
import type { Telemetry } from '@/telemetry';

import {
	MCP_GET_USER_PREFERENCES_TOOL_NAME,
	MCP_USER_PREFERENCES_TRIGGER_CLAUSE,
	USER_CALLED_MCP_TOOL_EVENT,
} from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';

/**
 * The wording agreed in CONTEXT-132, and a requirement of that ticket rather than a choice made
 * here, so it is covered verbatim by a test — read the ticket before editing it.
 *
 * Each clause has a job. "For the remainder of the task" stops the result being treated as a
 * preamble that was satisfied once, and the precedence clause makes a conflict visible instead
 * of resolved arbitrarily, so text written by other people never outranks the person the
 * assistant is talking to.
 *
 * What this text does NOT do is make the model obey: the manual test report on CONTEXT-132
 * measured no change in what the model built across three wordings and 13 runs. It states the
 * contract clearly and it makes the client load and call the tool. Anything that has to hold
 * needs to be a rule the server checks.
 */
const DESCRIPTION = [
	'Returns the preferences saved for this n8n instance, the caller, and their projects: node and credential choices, naming, how work is organised, and patterns to avoid.',
	`Call this before ${MCP_USER_PREFERENCES_TRIGGER_CLAUSE} and apply what it returns to every change you make for the remainder of the task, not only the first one. If a preference conflicts with something the user asks for directly, follow the user and say which preference you set aside.`,
].join('\n\n');

/** A definite answer, so the assistant does not call again looking for one. */
const NOTHING_SAVED = 'No preferences are saved for this instance, for you, or for your projects.';

const inputSchema = {} satisfies z.ZodRawShape;

const outputSchema = {
	hasPreferences: z
		.boolean()
		.describe(
			'False when nothing is saved for the instance, the caller, or their projects. True when `preferences` holds at least one item.',
		),
	preferences: z
		.array(
			z.object({
				scope: z
					.enum(['instance', 'user', 'personalProject', 'project'])
					.describe(
						"Where the preference is saved: `instance` is set by an admin for everyone, `user` is what the caller saved for themselves, `personalProject` is the caller's own personal project, and `project` is a team project named in `project`.",
					),
				project: z
					.string()
					.optional()
					.describe("The team project's name. Set only when scope is `project`."),
				text: z.string().describe('The preference as the person wrote it.'),
			}),
		)
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
			// One source for "is there anything", so the flag and the list cannot disagree.
			const items = flattenAiPreferences(preferences);
			const hasPreferences = items.length > 0;

			telemetryPayload.results = { success: true, data: { hasPreferences } };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [
					{ type: 'text', text: hasPreferences ? renderAiPreferences(preferences) : NOTHING_SAVED },
				],
				structuredContent: { hasPreferences, preferences: items },
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
