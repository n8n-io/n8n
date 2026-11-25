import { mcpServerActionSourceSchema, mcpServerToolKindSchema } from '@n8n/api-types';
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
			is_ai_draft: z
				.boolean()
				.describe('True when the AI wrote the name and the description of the tool'),
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
	CUSTOM_MCP_SERVER_TOOL_CALLED: {
		name: 'Custom MCP server tool called',
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
			'A person opened the share page of a custom MCP server. Fires once per page load, also without a sign-in.',
		properties: z.object({
			server_id: serverId,
			signed_in: z.boolean(),
			can_connect: z
				.boolean()
				.describe('True when the person can connect, so the page shows the tools'),
		}),
	},
	USER_CLICKED_CLIENT_ON_MCP_SERVER_SHARE_PAGE: {
		name: 'User clicked client on MCP server share page',
		description:
			'A person used a client button on the share page of a custom MCP server. With "Custom MCP server tool called", it shows the path from the click to the first call.',
		properties: z.object({
			server_id: serverId,
			client: z.string().describe('Client id from the share page, e.g. "claude-ai" or "cursor"'),
			method: z
				.enum(['deep_link', 'copy_command', 'copy_url', 'copy_config'])
				.describe('What the person did: open a link, or copy a command, the URL, or a config'),
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
