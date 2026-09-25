import type { User } from '@n8n/db';
import z from 'zod';

import { MCP_EXPLORE_NODE_RESOURCES_TOOL } from './constants';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';

import type { NodeResourceExplorerService } from '@/services/node-resource-explorer.service';
import type { Telemetry } from '@/telemetry';

const inputSchema = {
	nodeType: z
		.string()
		.describe(
			'Fully-qualified node type ID from search_nodes / get_node_types, e.g. "n8n-nodes-base.slack".',
		),
	version: z
		.number()
		.describe('Node version, e.g. 4.7. Must match a version returned by search_nodes.'),
	methodName: z
		.string()
		.describe(
			"The exact method name from the node's `@searchListMethod` or `@loadOptionsMethod` annotation in the type definition. " +
				'Call get_node_types first to read the real method name. Do not invent or guess.',
		),
	methodType: z
		.enum(['listSearch', 'loadOptions'])
		.describe(
			'"listSearch" for `@searchListMethod` annotations (supports filter/pagination); ' +
				'"loadOptions" for `@loadOptionsMethod` annotations.',
		),
	credentialType: z
		.string()
		.describe('Credential type key for the node, e.g. "slackApi" or "googleSheetsOAuth2Api".'),
	credentialId: z
		.string()
		.describe('ID of a credential the user can access, obtained from list_credentials.'),
	filter: z.string().optional().describe('Optional search/filter text to narrow results.'),
	paginationToken: z
		.string()
		.optional()
		.describe('Pagination token from a previous call to fetch the next page (listSearch only).'),
	currentNodeParameters: z
		.record(z.unknown())
		.optional()
		.describe(
			'Current node parameters for dependent lookups. Some methods require prior selections — ' +
				'e.g. listing sheets within a spreadsheet needs `{ documentId: { __rl: true, mode: "id", value: "<spreadsheetId>" } }`. ' +
				"Check the type definition's displayOptions to know which parameters a method depends on.",
		),
} satisfies z.ZodRawShape;

const outputSchema = {
	results: z
		.array(
			z.object({
				name: z.string(),
				value: z.union([z.string(), z.number(), z.boolean()]),
				url: z.string().optional(),
				description: z.string().optional(),
			}),
		)
		.describe('Resources returned by the node method. `value` is the id to use in workflow code.'),
	paginationToken: z
		.string()
		.optional()
		.describe('Pass back as `paginationToken` to fetch the next page. Absent if no more results.'),
	builderHint: z
		.string()
		.optional()
		.describe("Selection guidance from the node's @builderHint annotation, when present."),
} satisfies z.ZodRawShape;

/**
 * MCP tool that resolves a node's resource locator (listSearch) or
 * load-options dropdown values on behalf of the calling user, so agents
 * can ground workflow parameters in real IDs instead of guessing.
 */
export const createExploreNodeResourcesTool = (
	user: User,
	nodeResourceExplorerService: NodeResourceExplorerService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: MCP_EXPLORE_NODE_RESOURCES_TOOL.toolName,
	config: {
		description:
			"Resolve the real values behind a node's resource locator or load-options dropdown (e.g. Slack channels, Google Sheets tabs, OpenAI models). " +
			'Use this after get_node_types so you ground RLC and load-options parameters in real IDs instead of inventing them. ' +
			'Requires a credential ID from list_credentials — the call runs as the current user with that credential.',
		inputSchema,
		outputSchema,
		annotations: {
			title: MCP_EXPLORE_NODE_RESOURCES_TOOL.displayTitle,
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: true,
		},
	},
	handler: async (params) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: MCP_EXPLORE_NODE_RESOURCES_TOOL.toolName,
			parameters: {
				nodeType: params.nodeType,
				version: params.version,
				methodName: params.methodName,
				methodType: params.methodType,
				credentialType: params.credentialType,
				hasFilter: params.filter !== undefined,
				hasPaginationToken: params.paginationToken !== undefined,
				hasCurrentNodeParameters: params.currentNodeParameters !== undefined,
			},
		};

		try {
			const result = await nodeResourceExplorerService.exploreResources(user, params);

			telemetryPayload.results = {
				success: true,
				data: {
					resultCount: result.results.length,
					hasPaginationToken: result.paginationToken !== undefined,
					hasBuilderHint: result.builderHint !== undefined,
				},
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: JSON.stringify(result) }],
				structuredContent: { ...result },
			};
		} catch (error) {
			// Send the error class name only — error.message may contain credential IDs
			// or fragments of upstream API responses we don't want in product analytics.
			telemetryPayload.results = {
				success: false,
				error: error instanceof Error ? error.name : 'UnknownError',
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			throw error;
		}
	},
});
