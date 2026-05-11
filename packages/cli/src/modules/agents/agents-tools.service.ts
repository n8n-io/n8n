import { Tool } from '@n8n/agents';
import type { BuiltTool, CredentialProvider } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { validateNodeConfig } from '@n8n/workflow-sdk';
import { isToolType, isTriggerNodeType } from 'n8n-workflow';
import type { IDataObject, INodeParameters } from 'n8n-workflow';
import { z } from 'zod';

import { EphemeralNodeExecutor, isAgentProviderNode } from '@/node-execution';
import { NodeCatalogService } from '@/node-catalog';

type NodeRequest =
	| string
	| {
			nodeId: string;
			version?: number;
			resource?: string;
			operation?: string;
			mode?: string;
	  };

/**
 * Nodes the agent runtime can execute directly. Triggers are workflow entry
 * points, so they are never valid as standalone agent tools.
 */
export const isExecutableNodeType = (nodeId: string): boolean => !isTriggerNodeType(nodeId);

/**
 * Node IDs the agent builder should surface when configuring node-backed
 * tools. For regular nodes marked `usableAsTool`, the loader creates a
 * mirrored `*Tool` node type; native tool nodes already follow this shape.
 * HITL tools are excluded because the builder wires regular executable tools,
 * not approval-gated workflow steps. Provider nodes (OpenAI etc.) are
 * admitted via the explicit whitelist — they ship the full vendor API
 * (image, audio, …) but lack the `usableAsTool` flag.
 *
 * Exported as a stable reference so the catalog service can cache its
 * filtered search tool per filter identity.
 */
export const isAgentToolNodeType = (nodeId: string): boolean =>
	isExecutableNodeType(nodeId) &&
	(isToolType(nodeId, { includeHitl: false }) || isAgentProviderNode(nodeId));

const searchNodesInputSchema = z.object({
	queries: z.array(z.string()).min(1).describe('Search queries (e.g., ["gmail", "slack", "http"])'),
});

const nodeVersionSchema = z.number().describe('Tool node type version from search_nodes');

const getNodeTypesInputSchema = z.object({
	nodeIds: z
		.array(
			z.union([
				z.string(),
				z.object({
					nodeId: z.string(),
					version: nodeVersionSchema.optional(),
					resource: z.string().optional(),
					operation: z.string().optional(),
					mode: z.string().optional(),
				}),
			]),
		)
		.min(1)
		.describe('Tool node IDs from search_nodes (e.g., ["n8n-nodes-base.gmailTool"])'),
});

const listCredentialsInputSchema = z.object({
	types: z
		.array(z.string())
		.optional()
		.describe(
			'Optional credential types to filter by (e.g., ["gmailOAuth2", "httpHeaderAuth"]). ' +
				'When omitted, returns all credentials. Use the credential types declared in the ' +
				'node schema from get_node_types to narrow the results.',
		),
});

const runNodeInputSchema = z.object({
	nodeType: z.string().describe('Tool node type identifier from search_nodes'),
	nodeTypeVersion: nodeVersionSchema,
	nodeParameters: z
		.record(z.unknown())
		.optional()
		.describe(
			'Static node config. Use expressions like ={{ $json.url }} to reference inputData fields.',
		),
	credentials: z
		.record(z.object({ id: z.string(), name: z.string() }))
		.optional()
		.describe('Credential slot → { id, name }. Copy from list_credentials results.'),
	inputData: z
		.record(z.unknown())
		.optional()
		.describe('Runtime input, available as $json inside nodeParameters expressions.'),
});

@Service()
export class AgentsToolsService {
	constructor(
		private readonly logger: Logger,
		private readonly nodeCatalogService: NodeCatalogService,
		private readonly ephemeralNodeExecutor: EphemeralNodeExecutor,
	) {}

	/**
	 * Tools usable from both the builder and the agent runtime.
	 *
	 * `listCredentialsUsageHint` lets each caller tailor the `list_credentials`
	 * description to its flow — the runtime points at `run_node_tool`, while the
	 * builder points at code generation.
	 */
	getSharedTools(
		credentialProvider: CredentialProvider,
		listCredentialsUsageHint: string,
	): BuiltTool[] {
		return [
			this.buildSearchNodesTool(),
			this.buildGetNodeTypesTool(),
			this.buildListCredentialsTool(credentialProvider, listCredentialsUsageHint),
		];
	}

	/** Shared tools plus the runtime-only `run_node_tool` which binds to a project. */
	getRuntimeTools(credentialProvider: CredentialProvider, projectId: string): BuiltTool[] {
		return [
			...this.getSharedTools(
				credentialProvider,
				'Call this before run_node_tool to know which credential to pass.',
			),
			this.buildRunNodeTool(projectId),
		];
	}

	private buildSearchNodesTool(): BuiltTool {
		return new Tool('search_nodes')
			.description(
				'Search for n8n nodes by name or service. Use this to find nodes that can be executed. ' +
					'Returns tool node IDs, display names, versions, and descriptions. ' +
					'After finding a node, call get_node_types to get its parameter schema.',
			)
			.input(searchNodesInputSchema)
			.handler(async ({ queries }: { queries: string[] }) => {
				const { results } = await this.nodeCatalogService.searchNodes(queries, {
					nodeFilter: isAgentToolNodeType,
				});
				return { results };
			})
			.build();
	}

	private buildGetNodeTypesTool(): BuiltTool {
		return new Tool('get_node_types')
			.description(
				'Get detailed parameter schema for specific n8n nodes. Use the node IDs returned ' +
					'by search_nodes. Returns parameter definitions needed to configure a node for execution. ' +
					'Use the tool node IDs from search_nodes. ' +
					'You can optionally filter by resource/operation/mode.',
			)
			.input(getNodeTypesInputSchema)
			.handler(async ({ nodeIds }: { nodeIds: NodeRequest[] }) => {
				const results = await this.nodeCatalogService.getNodeTypes(
					nodeIds.map(normalizeNodeRequestForCatalog),
				);
				return { results };
			})
			.build();
	}

	private buildListCredentialsTool(
		credentialProvider: CredentialProvider,
		usageHint: string,
	): BuiltTool {
		return new Tool('list_credentials')
			.description(
				'List the credentials available to the user. Returns an array of credential names and types. ' +
					'Accepts an optional `types` filter to return only credentials matching the given types. ' +
					usageHint,
			)
			.input(listCredentialsInputSchema)
			.handler(async ({ types }) => {
				const creds = await credentialProvider.list();
				if (!types || types.length === 0) return { credentials: creds };
				const allowed = new Set(types);
				return { credentials: creds.filter((c) => allowed.has(c.type)) };
			})
			.build();
	}

	private buildRunNodeTool(projectId: string): BuiltTool {
		return new Tool('run_node_tool')
			.description(
				'Execute an n8n node for the current request. ' +
					'Use the tool nodeType and nodeTypeVersion from search_nodes. ' +
					'Call get_node_types first to understand what nodeParameters the node accepts. ' +
					'nodeParameters holds static node config; use n8n expressions like ={{ $json.url }} to map inputData fields. ' +
					'credentials maps slot names to { id, name } — copy from the list_credentials results. ' +
					'inputData is the runtime payload available as $json inside expressions. ' +
					'Parameters are validated against the node schema before execution.',
			)
			.input(runNodeInputSchema)
			.handler(async ({ nodeType, nodeTypeVersion, nodeParameters, credentials, inputData }) => {
				if (!isExecutableNodeType(nodeType)) {
					return {
						status: 'error',
						message: `Node type "${nodeType}" cannot be executed directly — trigger nodes are not supported here.`,
					};
				}

				if (nodeParameters) {
					const { valid, errors } = validateNodeConfig(
						nodeType,
						nodeTypeVersion,
						{
							parameters: nodeParameters,
						},
						{ isToolNode: true },
					);
					if (!valid) {
						return {
							status: 'error',
							message: `Invalid nodeParameters: ${errors.map((e) => e.message).join('; ')}`,
						};
					}
				}

				try {
					return await this.ephemeralNodeExecutor.executeInline({
						nodeType,
						nodeTypeVersion,
						nodeParameters: (nodeParameters ?? {}) as INodeParameters,
						credentialDetails: credentials,
						inputData: [{ json: (inputData ?? {}) as IDataObject }],
						projectId,
					});
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					this.logger.warn('run_node_tool execution failed', { nodeType, error });
					return {
						status: 'error',
						message: `Node execution failed: ${message}`,
					};
				}
			})
			.build();
	}
}

/**
 * The catalog's `getNodeTypes` signature expects `version` as a string (matching the
 * code-builder tool's wire format). Our public schema uses `number` for consistency
 * with `run_node_tool`; adapt at the boundary.
 */
function normalizeNodeRequestForCatalog(req: NodeRequest):
	| string
	| {
			nodeId: string;
			version?: string;
			resource?: string;
			operation?: string;
			mode?: string;
	  } {
	if (typeof req === 'string') return req;
	const { version, ...rest } = req;
	return version === undefined ? rest : { ...rest, version: String(version) };
}
