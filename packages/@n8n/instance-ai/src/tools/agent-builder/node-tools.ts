/**
 * search_nodes / get_node_types / get_resource_locator_options.
 *
 * `search_nodes` and `get_resource_locator_options` delegate to the host
 * (`agentBuilderService`) so they get exact parity with the CLI builder: the
 * agent-tool node filter, and resource-locator resolution across all lookup
 * kinds (incl. loadOptions routing) with the full credentials map.
 * `get_node_types` reuses `resolveNodeTypeDefinitions` from the consolidated
 * `nodes` tool (both resolve TS defs via `nodeService.getNodeTypeDefinition`).
 */
import { Tool } from '@n8n/agents';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';
import { resolveNodeTypeDefinitions } from '../nodes.tool';
import { AGENT_BUILDER_TOOL_IDS } from '../tool-ids';

const NODE_TOOLS_UNAVAILABLE = {
	ok: false as const,
	code: 'not_available',
	message: 'Agent building is not available in this context.',
};

const agentNodeVersionSchema = z.union([
	z.number().finite(),
	z.string().regex(/^\d+(?:\.\d+)?$/, 'Node version must be a semantic number such as 1.3.'),
]);

const agentNodeRequestSchema = z.union([
	z.string(),
	z.object({
		nodeType: z.string(),
		version: agentNodeVersionSchema.optional(),
		resource: z.string().optional(),
		operation: z.string().optional(),
		mode: z.string().optional(),
	}),
]);

type AgentNodeRequest = z.infer<typeof agentNodeRequestSchema>;

function normalizeAgentNodeRequest(request: AgentNodeRequest): AgentNodeRequest {
	if (typeof request === 'string' || request.version === undefined) return request;
	const version = typeof request.version === 'number' ? request.version : Number(request.version);
	if (!Number.isFinite(version)) {
		throw new Error('Node version must be a semantic number such as 1.3.');
	}
	return { ...request, version };
}

function normalizeResolvedNodeVersion(version: string | number): number {
	if (typeof version === 'number') return version;
	const normalized = Number(version);
	if (!Number.isFinite(normalized)) throw new Error(`Invalid resolved node version: "${version}".`);
	return normalized;
}

export function createSearchNodesTool(context: InstanceAiContext) {
	return new Tool(AGENT_BUILDER_TOOL_IDS.SEARCH_NODES)
		.description(
			'Search for n8n nodes by name or service (e.g. ["gmail", "slack", "http"]) to find nodes ' +
				'usable as agent tools. Returns tool node IDs, display names, versions, and descriptions. ' +
				'After finding a node, call get_node_types to read its parameter schema.',
		)
		.input(
			z.object({
				queries: z
					.array(z.string().min(1))
					.min(1)
					.describe('Search queries, e.g. ["gmail", "slack", "http"]'),
			}),
		)
		.handler(async ({ queries }) => {
			if (!context.agentBuilderService) return { results: [] };
			return await context.agentBuilderService.searchNodes(queries);
		})
		.build();
}

export function createGetNodeTypesTool(context: InstanceAiContext) {
	return new Tool(AGENT_BUILDER_TOOL_IDS.GET_NODE_TYPES)
		.description(
			'Get host-installed TypeScript definitions for node types — exact semantic versions, parameter names, enum values, ' +
				'credential types, display conditions, and `@searchListMethod` / `@loadOptionsMethod` / ' +
				'`@builderHint` annotations. Call before writing each node `tool(...)` in the agent source, ' +
				'and use the returned numeric version.',
		)
		.input(z.object({ nodeTypes: z.array(agentNodeRequestSchema).min(1).max(5) }))
		.handler(async ({ nodeTypes }) => {
			const result = await resolveNodeTypeDefinitions(
				context,
				nodeTypes.map(normalizeAgentNodeRequest),
			);
			return {
				definitions: result.definitions.map((definition) =>
					!('version' in definition) || definition.version === undefined
						? definition
						: { ...definition, version: normalizeResolvedNodeVersion(definition.version) },
				),
			};
		})
		.build();
}

const nodeCredentialSchema = z.object({ id: z.string(), name: z.string() });

export function createGetResourceLocatorOptionsTool(context: InstanceAiContext) {
	return new Tool(AGENT_BUILDER_TOOL_IDS.GET_RESOURCE_LOCATOR_OPTIONS)
		.description(
			'Fetch live options for a node parameter configured through a resourceLocator, ' +
				'loadOptionsMethod, or loadOptions routing (stable IDs such as Linear teamId, Slack ' +
				'channel, calendar, project, model, database, or table selectors). Resolve credentials ' +
				'first when the node needs them (the credentials tool with action "list" + the ' +
				'ask-user tool), then pass the ' +
				'credentials map. Write the returned parameterValue into nodeParameters instead of using ' +
				'$fromAI for stable resource IDs.',
		)
		.input(
			z.object({
				nodeType: z.string().describe('Tool node type identifier from search_nodes'),
				nodeTypeVersion: z.number().describe('Tool node type version from search_nodes'),
				parameterPath: z
					.string()
					.describe('Parameter path to resolve, e.g. "teamId" or "additionalFields.teamId"'),
				nodeParameters: z
					.record(z.unknown())
					.optional()
					.describe('Current static nodeParameters (resource/operation/mode and resolved deps)'),
				credentials: z
					.record(nodeCredentialSchema)
					.optional()
					.describe(
						'Node credentials map (from the credentials tool, action "list"): ' +
							'{ credentialType: { id, name } }',
					),
				filter: z.string().optional().describe('Optional search string to narrow options'),
				paginationToken: z.string().optional().describe('Pagination token from a previous lookup'),
			}),
		)
		.handler(async (input) => {
			if (!context.agentBuilderService) return NODE_TOOLS_UNAVAILABLE;
			return await context.agentBuilderService.resolveResourceLocatorOptions(input);
		})
		.build();
}
