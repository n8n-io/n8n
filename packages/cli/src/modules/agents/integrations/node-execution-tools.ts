import { Tool } from '@n8n/agents';
import type { CredentialProvider } from '@n8n/agents';
import { validateNodeConfig } from '@n8n/workflow-sdk';
import type {
	IDataObject,
	INodeCredentialsDetails,
	INodeParameters,
	INodeTypeDescription,
} from 'n8n-workflow';
import { z } from 'zod';

import type { EphemeralNodeExecutor } from '@/node-execution';

import { getNodeSchema, searchNodes, type NodeDescriptor } from './search-nodes-tools';

export interface RunNodeArgs {
	nodeType: string;
	nodeTypeVersion: number;
	nodeParameters?: Record<string, unknown>;
	credentials?: Record<string, INodeCredentialsDetails>;
	inputData?: Record<string, unknown>;
}

/**
 * Tool that searches for relevant n8n nodes by keyword query.
 *
 * Uses sublimeSearch across displayName, name, codex aliases, and description.
 * Results are ranked by relevance and trimmed to `topK`.
 * Use `get_node_schema` to inspect parameters, then `run_node_tool` to execute.
 */
export function createSearchNodesTool(
	nodes: INodeTypeDescription[],
	credentialProvider: CredentialProvider,
) {
	return new Tool('search_nodes')
		.description(
			'Search for n8n node tools relevant to your task. ' +
				'Pass a natural-language query (e.g. "send email", "fetch HTTP"). ' +
				'Each result includes: displayName, nodeType, nodeTypeVersion, description, hasCredentials, credentials. ' +
				'Use get_node_schema to inspect parameters, then run_node_tool to execute.',
		)
		.input(
			z.object({
				query: z.string().describe('Natural-language description of what you want to do'),
				topK: z.number().int().min(1).max(50).optional().describe('Max results (default 10)'),
				minScore: z
					.number()
					.min(0)
					.max(1)
					.optional()
					.describe('Minimum relevance score 0–1 (default 0.1)'),
			}),
		)
		.handler(
			async ({
				query,
				topK,
				minScore,
			}: {
				query: string;
				topK?: number;
				minScore?: number;
			}) => {
				const tools = await searchNodes(nodes, query, credentialProvider, { topK, minScore });
				return { tools };
			},
		);
}

/**
 * Tool that returns the full parameter schema for a single n8n node type.
 *
 * Call this after search_nodes to understand what nodeParameters a node accepts
 * before calling run_node_tool.
 */
export function createGetNodeSchemaTool(nodes: INodeTypeDescription[]) {
	return new Tool('get_node_schema')
		.description(
			'Return the parameter schema for a specific n8n node type. ' +
				'Each entry describes a parameter the node accepts: type, displayName, description, ' +
				'required, default, and (for options/multiOptions) the allowed values. ' +
				'Nested types: collection → fields, fixedCollection → groups with fields inside. ' +
				'Parameters marked conditional only apply under certain resource/operation combinations. ' +
				'Use this before run_node_tool to understand what to put in nodeParameters.',
		)
		.input(
			z.object({
				nodeType: z.string().describe('Node type identifier from search_nodes'),
			}),
		)
		.handler(async ({ nodeType }: { nodeType: string }) => {
			const schema = getNodeSchema(nodes, nodeType);
			if (!schema) {
				return { error: `No schema found for node type "${nodeType}"` };
			}
			return { nodeType, schema };
		});
}

/**
 * Tool that executes an n8n node for the current request.
 *
 * nodeParameters are validated against the node's pre-generated Zod schema
 * (from @n8n/workflow-sdk) before execution. n8n expression strings are
 * accepted for any field and validated at runtime by the node itself.
 */
export function createRunNodeTool(
	executor: Pick<EphemeralNodeExecutor, 'executeInline'>,
	projectId: string,
) {
	return new Tool('run_node_tool')
		.description(
			'Execute an n8n node for the current request. ' +
				'Use nodeType and nodeTypeVersion from search_nodes. ' +
				'Call get_node_schema first to understand what nodeParameters the node accepts. ' +
				'nodeParameters holds static node config; use n8n expressions like ={{ $json.url }} to map inputData fields. ' +
				'credentials maps slot names to { id, name } — copy from the credentials array in search_nodes. ' +
				'inputData is the runtime payload available as $json inside expressions. ' +
				'Parameters are validated against the node schema before execution.',
		)
		.input(
			z.object({
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
					.describe('Credential slot → { id, name }. Copy from search_nodes credentials array.'),
				inputData: z
					.record(z.unknown())
					.optional()
					.describe('Runtime input, available as $json inside nodeParameters expressions.'),
			}),
		)
		.handler(
			async ({
				nodeType,
				nodeTypeVersion,
				nodeParameters,
				credentials,
				inputData,
			}: RunNodeArgs) => {
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

				return await executor.executeInline({
					nodeType,
					nodeTypeVersion,
					nodeParameters: (nodeParameters ?? {}) as INodeParameters,
					credentialDetails: credentials,
					inputData: [{ json: (inputData ?? {}) as IDataObject }],
					projectId,
				});
			},
		);
}

export type { NodeDescriptor };
