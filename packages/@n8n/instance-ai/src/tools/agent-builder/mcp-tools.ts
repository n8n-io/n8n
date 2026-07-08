/**
 * search_mcp_servers / verify_mcp_server — discover and connectivity-test MCP
 * servers before adding them to the agent config. Both delegate to
 * `agentBuilderService` (the host owns the registry, SSRF-safe fetch, OAuth).
 */
import { Tool } from '@n8n/agents';
import { McpAuthenticationSchemaTypes } from '@n8n/api-types';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';
import { AGENT_BUILDER_TOOL_IDS } from '../tool-ids';

export function createSearchMcpServersTool(context: InstanceAiContext) {
	return new Tool(AGENT_BUILDER_TOOL_IDS.SEARCH_MCP_SERVERS)
		.description(
			'Search the MCP server registry (e.g. Notion, Slack, GitHub) for servers that can be added ' +
				'to the agent. Returns each match with its url, transport, authentication scheme, ' +
				'credentialType, and advertised tools.',
		)
		.input(
			z.object({
				queries: z.array(z.string().min(1)).min(1).describe('Search terms, e.g. ["github"]'),
			}),
		)
		.handler(async ({ queries }) => {
			if (!context.agentBuilderService) return { results: [] };
			return { results: await context.agentBuilderService.searchMcpServers(queries) };
		})
		.build();
}

export function createVerifyMcpServerTool(context: InstanceAiContext) {
	return new Tool(AGENT_BUILDER_TOOL_IDS.VERIFY_MCP_SERVER)
		.description(
			'Test connectivity to an MCP server and list its available tools before adding it to the ' +
				'config. Call after resolving a credential (when authentication is not "none") and before ' +
				'adding the server entry to the config file and calling build_agent. ' +
				'Returns { ok: true, tools: [{ name, description }] } or { ok: false, error }.',
		)
		.input(
			z.object({
				name: z
					.string()
					.min(1)
					.max(64)
					.regex(/^[a-zA-Z0-9_-]+$/)
					.describe('The server name (used as the tool-name prefix)'),
				url: z.string().min(1).describe('The MCP server endpoint URL'),
				transport: z
					.enum(['sse', 'streamableHttp'])
					.default('streamableHttp')
					.describe('Transport type. Defaults to streamableHttp'),
				authentication: z
					.union([McpAuthenticationSchemaTypes, z.string().endsWith('McpOAuth2Api')])
					.default('none')
					.describe('Authentication scheme'),
				credential: z
					.string()
					.optional()
					.describe(
						'Credential id (from the credentials tool, action "list"). Required when authentication is not "none"',
					),
				connectionTimeoutMs: z
					.number()
					.int()
					.min(1)
					.max(120_000)
					.optional()
					.describe('Connection timeout in milliseconds'),
			}),
		)
		.handler(async ({ name, url, transport, authentication, credential, connectionTimeoutMs }) => {
			if (!context.agentBuilderService) {
				return { ok: false as const, error: 'MCP verification is not available in this context.' };
			}
			return await context.agentBuilderService.verifyMcpServer({
				name,
				url,
				transport,
				authentication,
				credentialId: credential,
				connectionTimeoutMs,
			});
		})
		.build();
}
