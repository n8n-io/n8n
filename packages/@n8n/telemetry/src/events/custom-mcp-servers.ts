import {
	mcpServerActionSourceSchema,
	mcpServerToolDraftFieldSchema,
	mcpServerToolKindSchema,
} from '@n8n/api-types';
import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

/**
 * Custom MCP servers that builders make in a project. The instance MCP has its events in
 * `mcp.ts`. Every event carries `user_id`, because PostHog drops a backend event without it.
 */

const serverId = z.string();
const userId = z.string().describe('The person who did the action or made the call');
const toolKind = z.enum(mcpServerToolKindSchema.options);
const clientName = z
	.string()
	.describe('Name of the AI client from its OAuth registration, e.g. "Claude Code"');

/** Builder actions come from the editor or the n8n Assistant. */
const builderSource = {
	source: z.enum(mcpServerActionSourceSchema.options).describe('Where the builder did the action'),
	thread_id: z
		.string()
		.optional()
		.describe('The n8n Assistant thread that did the action. Absent outside the Assistant'),
};

export const CUSTOM_MCP_SERVERS_TELEMETRY = defineTelemetryEvents({
	USER_CREATED_CUSTOM_MCP_SERVER: {
		name: 'User created custom MCP server',
		description: 'A builder created a custom MCP server in a project.',
		properties: z.object({
			server_id: serverId,
			project_id: z.string(),
			user_id: userId,
			...builderSource,
		}),
	},
	USER_ADDED_TOOL_TO_CUSTOM_MCP_SERVER: {
		name: 'User added tool to custom MCP server',
		description: 'A builder added a tool to a custom MCP server. Fires once per added tool.',
		properties: z.object({
			server_id: serverId,
			user_id: userId,
			tool_kind: toolKind,
			...builderSource,
		}),
	},
	USER_DRAFTED_TOOL_OF_CUSTOM_MCP_SERVER: {
		name: 'User drafted tool of custom MCP server',
		description:
			'The n8n Assistant wrote the text of a tool, or tried to. Fires once per draft call: after an add, or for a "Generate" click.',
		properties: z.object({
			server_id: serverId,
			user_id: userId,
			field: z
				.enum([...mcpServerToolDraftFieldSchema.options, 'both'])
				.describe('both for the draft after an add. One field for a "Generate" click'),
			status: z
				.enum(['drafted', 'invalid_answer', 'model_failed', 'no_credits', 'not_available'])
				.describe(
					'drafted: the tool has the new text. invalid_answer: the answer broke the rules. model_failed: the model call failed. no_credits: the person has no Assistant credits left, so no model call ran. not_available: the Assistant cannot write drafts',
				),
			...builderSource,
		}),
	},
	USER_CONNECTED_TO_CUSTOM_MCP_SERVER: {
		name: 'User connected to custom MCP server',
		description:
			'A person connected an AI client to a custom MCP server. Fires on the first authorized request of each person and client.',
		properties: z.object({
			server_id: serverId,
			user_id: userId,
			client_name: clientName,
		}),
	},
	USER_CALLED_CUSTOM_MCP_SERVER_TOOL: {
		name: 'User called custom MCP server tool',
		description: 'An AI client called a tool of a custom MCP server. Fires once per call.',
		properties: z.object({
			server_id: serverId,
			user_id: userId,
			client_name: clientName,
			tool_kind: toolKind,
			status: z
				.enum(['success', 'error'])
				.describe('error for a failed run, a broken tool, or a busy server'),
			duration_ms: z.number().describe('Time from the call to the result, in milliseconds'),
		}),
	},
	USER_BLOCKED_PERSON_FROM_CUSTOM_MCP_SERVER: {
		name: 'User blocked person from custom MCP server',
		description:
			'A builder blocked a person, so all clients of the person lose access to the server.',
		properties: z.object({
			server_id: serverId,
			user_id: userId,
			blocked_user_id: z.string(),
			...builderSource,
		}),
	},
	USER_RESTORED_ACCESS_TO_CUSTOM_MCP_SERVER: {
		name: 'User restored access to custom MCP server',
		description: 'A builder removed the block of a person, so the person can connect again.',
		properties: z.object({
			server_id: serverId,
			user_id: userId,
			restored_user_id: z.string(),
			...builderSource,
		}),
	},
	USER_VIEWED_MCP_SERVER_SHARE_PAGE: {
		name: 'User viewed MCP server share page',
		description:
			'A person opened the share page of a custom MCP server. The backend sends it once per page load, also for a link that finds no server. Without a sign-in the event has no user_id, so PostHog drops it and only the warehouse has it.',
		properties: z.object({
			server_id: serverId.optional().describe('Absent when the link finds no server'),
			user_id: z
				.string()
				.optional()
				.describe('The person who opened the page. Absent without a sign-in'),
			signed_in: z.boolean(),
			can_connect: z
				.boolean()
				.describe('True when the person can connect, so the page shows the tools'),
			result: z
				.enum(['found', 'not_found'])
				.describe('not_found: an unknown or deleted server, or the feature flag is off'),
		}),
	},
	USER_CLICKED_CLIENT_ON_MCP_SERVER_SHARE_PAGE: {
		name: 'User clicked client on MCP server share page',
		description:
			'A person used a client button on the share page of a custom MCP server. With "Custom MCP server tool called", it shows the path from the click to the first call. The editor sends it, and the editor starts telemetry only after a sign-in, so it misses the clicks of people who are not signed in.',
		properties: z.object({
			server_id: serverId,
			client: z
				.string()
				.describe(
					'Client id from the share page, e.g. "claude-ai" or "cursor". "any" is the URL at the top of the page, "other" the steps for any other client',
				),
			method: z
				.enum(['deep_link', 'copy_command', 'copy_sign_in_command', 'copy_url', 'copy_config'])
				.describe(
					'What the person did: open a link, or copy an install command, a sign-in command, the URL, or a config',
				),
		}),
	},
	USER_DELETED_CUSTOM_MCP_SERVER: {
		name: 'User deleted custom MCP server',
		description: 'A builder deleted a custom MCP server.',
		properties: z.object({
			server_id: serverId,
			project_id: z.string(),
			user_id: userId,
			...builderSource,
		}),
	},
});
