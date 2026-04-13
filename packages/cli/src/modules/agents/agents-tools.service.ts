import { Tool } from '@n8n/agents';
import type { BuiltTool, CredentialProvider } from '@n8n/agents';
import { Service } from '@n8n/di';
import { validateNodeConfig } from '@n8n/workflow-sdk';
import { isToolType, isTriggerNodeType } from 'n8n-workflow';
import type { IDataObject, INodeParameters } from 'n8n-workflow';
import { z } from 'zod';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { EphemeralNodeExecutor } from '@/node-execution';
import { WorkflowBuilderToolsService } from '@/modules/mcp/tools/workflow-builder/workflow-builder-tools.service';

interface InvokableTool<TInput> {
	invoke(input: TInput): Promise<string>;
}

type NodeRequest =
	| string
	| {
			nodeId: string;
			version?: string;
			resource?: string;
			operation?: string;
			mode?: string;
	  };

const searchNodesInputSchema = z.object({
	queries: z.array(z.string()).min(1).describe('Search queries (e.g., ["gmail", "slack", "http"])'),
});

const getNodeTypesInputSchema = z.object({
	nodeIds: z
		.array(
			z.union([
				z.string(),
				z.object({
					nodeId: z.string(),
					version: z.string().optional(),
					resource: z.string().optional(),
					operation: z.string().optional(),
					mode: z.string().optional(),
				}),
			]),
		)
		.min(1)
		.describe('Node IDs from search_nodes (e.g., ["n8n-nodes-base.gmail"])'),
});

const listCredentialsInputSchema = z.object({});

const runNodeInputSchema = z.object({
	nodeType: z.string().describe('Node type identifier from search_nodes'),
	nodeTypeVersion: z.number().describe('Node type version from search_nodes'),
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

/** Nodes the runtime agent should never surface as executable node tools. */
function isExcludedNodeType(nodeId: string): boolean {
	return isTriggerNodeType(nodeId) || isToolType(nodeId);
}

@Service()
export class AgentsToolsService {
	/** Lazily initialized filtered search tool — invalidated on node-type refresh. */
	private agentSearchTool: InvokableTool<{ queries: string[] }> | undefined;

	/** Result cache for the filtered search tool, keyed by sorted query list. */
	private readonly agentSearchCache = new Map<string, string>();

	constructor(
		private readonly workflowBuilderToolsService: WorkflowBuilderToolsService,
		private readonly ephemeralNodeExecutor: EphemeralNodeExecutor,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
	) {
		this.loadNodesAndCredentials.addPostProcessor(async () => await this.refreshNodeTypes());
	}

	async refreshNodeTypes(): Promise<void> {
		this.agentSearchTool = undefined;
		this.agentSearchCache.clear();
	}

	async initialize(): Promise<void> {
		await this.workflowBuilderToolsService.initialize();
	}

	getSharedTools(credentialProvider: CredentialProvider): BuiltTool[] {
		return [
			this.buildSearchNodesTool(),
			this.buildGetNodeTypesTool(),
			this.buildListCredentialsTool(credentialProvider),
		];
	}

	getTools(credentialProvider: CredentialProvider, projectId: string): BuiltTool[] {
		return [...this.getSharedTools(credentialProvider), this.buildRunNodeTool(projectId)];
	}

	private async invokeAgentSearch(queries: string[]): Promise<string> {
		const cacheKey = JSON.stringify([...queries].sort());
		const cached = this.agentSearchCache.get(cacheKey);
		if (cached) return cached;

		if (!this.agentSearchTool) {
			const { createCodeBuilderSearchTool } = await import('@n8n/ai-workflow-builder');
			this.agentSearchTool = createCodeBuilderSearchTool(
				this.workflowBuilderToolsService.getNodeTypeParser(),
				{ nodeFilter: (nodeId) => !isExcludedNodeType(nodeId) },
			);
		}

		const result = await this.agentSearchTool.invoke({ queries });
		this.agentSearchCache.set(cacheKey, result);
		return result;
	}

	private buildSearchNodesTool(): BuiltTool {
		return new Tool('search_nodes')
			.description(
				'Search for n8n nodes by name or service. Use this to find nodes that can be executed. ' +
					'Returns node IDs, display names, versions, and descriptions. ' +
					'After finding a node, call get_node_types to get its parameter schema.',
			)
			.input(searchNodesInputSchema)
			.handler(async ({ queries }: { queries: string[] }) => {
				const results = await this.invokeAgentSearch(queries);
				return { results };
			})
			.build();
	}

	private buildGetNodeTypesTool(): BuiltTool {
		return new Tool('get_node_types')
			.description(
				'Get detailed parameter schema for specific n8n nodes. Use the node IDs returned ' +
					'by search_nodes. Returns parameter definitions needed to configure a node for execution. ' +
					'You can optionally filter by resource/operation/mode.',
			)
			.input(getNodeTypesInputSchema)
			.handler(async ({ nodeIds }: { nodeIds: NodeRequest[] }) => {
				const results = await this.workflowBuilderToolsService.getNodeTypes(nodeIds);
				return { results };
			})
			.build();
	}

	private buildListCredentialsTool(credentialProvider: CredentialProvider): BuiltTool {
		return new Tool('list_credentials')
			.description(
				'List the credentials available to the user. Returns an array of credential names and types. ' +
					'Call this before run_node_tool to know which credential to pass.',
			)
			.input(listCredentialsInputSchema)
			.handler(async () => {
				const creds = await credentialProvider.list();
				return { credentials: creds };
			})
			.build();
	}

	private buildRunNodeTool(projectId: string): BuiltTool {
		return new Tool('run_node_tool')
			.description(
				'Execute an n8n node for the current request. ' +
					'Use nodeType and nodeTypeVersion from search_nodes. ' +
					'Call get_node_types first to understand what nodeParameters the node accepts. ' +
					'nodeParameters holds static node config; use n8n expressions like ={{ $json.url }} to map inputData fields. ' +
					'credentials maps slot names to { id, name } — copy from the list_credentials results. ' +
					'inputData is the runtime payload available as $json inside expressions. ' +
					'Parameters are validated against the node schema before execution.',
			)
			.input(runNodeInputSchema)
			.handler(async ({ nodeType, nodeTypeVersion, nodeParameters, credentials, inputData }) => {
				if (nodeParameters) {
					const { valid, errors } = validateNodeConfig(nodeType, nodeTypeVersion, {
						parameters: nodeParameters,
					});
					if (!valid) {
						return {
							status: 'error',
							message: `Invalid nodeParameters: ${errors.map((e) => e.message).join('; ')}`,
						};
					}
				}

				return await this.ephemeralNodeExecutor.executeInline({
					nodeType,
					nodeTypeVersion,
					nodeParameters: (nodeParameters ?? {}) as INodeParameters,
					credentialDetails: credentials,
					inputData: [{ json: (inputData ?? {}) as IDataObject }],
					projectId,
				});
			})
			.build();
	}
}
