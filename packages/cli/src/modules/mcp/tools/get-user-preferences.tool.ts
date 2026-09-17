import type { User } from '@n8n/db';
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
 * The wording is a requirement of CONTEXT-132 and is pinned verbatim by a test. It gets the
 * tool called and states the contract; it does not, on its own, make the model comply.
 */
const DESCRIPTION = [
	'Returns the preferences saved for this n8n instance, the caller, and their projects: node and credential choices, naming, how work is organised, and patterns to avoid.',
	`Call this before ${MCP_USER_PREFERENCES_TRIGGER_CLAUSE} and apply what it returns to every change you make for the remainder of the task, not only the first one. If a preference conflicts with something the user asks for directly, follow the user and say which preference you set aside.`,
	'When you work inside one project, pass its `projectId` to leave the other projects out.',
].join('\n\n');

/** A definite answer, so the assistant does not call again looking for one. */
const NOTHING_SAVED = 'No preferences are saved for this instance, for you, or for your projects.';

/** The single-project read answers about that project, not about projects it never read. */
const NOTHING_SAVED_FOR_PROJECT =
	'No preferences are saved for this instance, for you, or for this project.';

const inputSchema = {
	projectId: z
		.string()
		.min(1)
		.optional()
		.describe(
			'Read one project instead of every project you can see. The instance and personal preferences are always included. Obtain the id from search_projects.',
		),
} satisfies z.ZodRawShape;

const outputSchema = {
	hasPreferences: z
		.boolean()
		.describe(
			'False when nothing is saved for the instance, the caller, or their projects, and also false when `error` is set. True when `preferences` holds at least one item.',
		),
	preferences: z
		.array(
			z.object({
				id: z
					.string()
					.describe(
						'Stable id of the preference. Name it when you update this preference, so an edit replaces the row instead of adding a second one.',
					),
				scope: z
					.enum(['instance', 'user', 'project'])
					.describe(
						'Where the preference is saved: `instance` is set by an admin for everyone, `user` is what the caller saved for themselves (including on their own personal project), and `project` is a team project named in `project`.',
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
	error: z
		.string()
		.optional()
		.describe(
			'Set when the read failed. The preferences are unknown, not absent: do not build as if none were saved.',
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
	handler: async ({ projectId }: { projectId?: string }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: MCP_GET_USER_PREFERENCES_TOOL_NAME,
			// Reported so CONTEXT-144 can see how often a caller narrows the read.
			parameters: { projectId },
		};

		try {
			// The OAuth grant decides whether this client may call the tool. No RBAC check: the
			// service only returns rows the user may see, and their own rows need no scope.
			// A projectId the caller may not read throws and answers as an error result below,
			// never as an empty success.
			const preferences = projectId
				? await aiPreferenceService.getApplicableForProject(user, projectId)
				: await aiPreferenceService.getApplicableAcrossProjects(user);
			// One source for "is there anything", so the flag and the list cannot disagree.
			const items = flattenAiPreferences(preferences);
			const hasPreferences = items.length > 0;
			const text = hasPreferences
				? renderAiPreferences(preferences)
				: projectId
					? NOTHING_SAVED_FOR_PROJECT
					: NOTHING_SAVED;

			// Count, scopes and the size of the rendered text, never the text itself, which is
			// the person's own writing. The length is what reviews the caps: CONTEXT-137 wants a
			// new number once the 95th percentile of a rendered block passes 8,000 characters,
			// and this read is one of the two paths that render one today (CONTEXT-137).
			telemetryPayload.results = {
				success: true,
				data: {
					hasPreferences,
					count: items.length,
					scopes: [...new Set(items.map((item) => item.scope))],
					rendered_length: hasPreferences ? text.length : 0,
				},
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text }],
				structuredContent: { hasPreferences, preferences: items },
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			telemetryPayload.results = { success: false, error: message };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			// An error result shaped by the output schema, not a throw: a strict client
			// validates structured content against the schema and would reject a bare error.
			// `isError` plus the `error` field keep it distinct from "no preferences", which
			// would send the assistant off to build against nothing.
			const output = { hasPreferences: false, preferences: [], error: message };
			return {
				content: [{ type: 'text', text: `Could not read the saved preferences: ${message}` }],
				structuredContent: output,
				isError: true,
			};
		}
	},
});
