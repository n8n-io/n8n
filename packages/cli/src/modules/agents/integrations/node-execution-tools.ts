import { Tool } from '@n8n/agents';
import type { CredentialProvider } from '@n8n/agents';
import { validateNodeConfig, setSchemaBaseDirs } from '@n8n/workflow-sdk';
import type { IDataObject, INodeCredentialsDetails, INodeParameters } from 'n8n-workflow';
import { z } from 'zod';

import type { EphemeralNodeExecutor } from '@/node-execution';
import { resolveBuiltinNodeDefinitionDirs } from '@/modules/instance-ai/node-definition-resolver';

import type { NodeToolRegistry, ToolDescriptor } from '../node-tool-registry';

export interface RunNodeArgs {
	nodeType: string;
	nodeTypeVersion: number;
	nodeParameters?: Record<string, unknown>;
	credentials?: Record<string, { id: string; name: string }>;
	inputData?: Record<string, unknown>;
}

let schemaBaseDirsInitialized = false;

/**
 * Ensures the workflow-sdk schema validator knows where to find pre-generated
 * node schemas. Safe to call multiple times — only resolves dirs once.
 */
function ensureSchemaBaseDirsSet(): void {
	if (schemaBaseDirsInitialized) return;
	schemaBaseDirsInitialized = true;
	const dirs = resolveBuiltinNodeDefinitionDirs();
	if (dirs.length > 0) setSchemaBaseDirs(dirs);
}

/**
 * Tool that returns the list of n8n node tools the agent can add to itself.
 * The credential provider is used to filter to tools the user actually has
 * credentials configured for.
 */
export function createListToolsTool(
	registry: Pick<NodeToolRegistry, 'listTools'>,
	credentialProvider: CredentialProvider,
) {
	return new Tool('list_tools')
		.description(
			'List the n8n node tools available to this agent. ' +
				'Each entry includes: displayName, nodeType (identifier for run_node_tool), ' +
				'nodeTypeVersion, description, hasCredentials, and credentials ({ id, name, type } for each ' +
				'credential the user has configured). ' +
				'Use this to find a nodeType, then call get_node_schema to see what nodeParameters ' +
				'the node accepts, and run_node_tool to execute it.',
		)
		.input(z.object({}))
		.handler(async () => {
			const tools = await registry.listTools(credentialProvider);
			return { tools };
		});
}

/**
 * Tool that returns the full parameter schema for a single n8n node type.
 *
 * Call this after list_tools to understand what nodeParameters a node accepts
 * before calling run_node_tool.
 */
export function createGetNodeSchemaTool(registry: Pick<NodeToolRegistry, 'getNodeSchema'>) {
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
				nodeType: z.string().describe('Node type identifier from list_tools'),
			}),
		)
		.handler(async ({ nodeType }: { nodeType: string }) => {
			const schema = await registry.getNodeSchema(nodeType);
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
				'Use nodeType and nodeTypeVersion from list_tools. ' +
				'Call get_node_schema first to understand what nodeParameters the node accepts. ' +
				'nodeParameters holds static node config; use n8n expressions like ={{ $json.url }} to map inputData fields. ' +
				'credentials maps slot names to { id, name } — copy from the credentials array in list_tools. ' +
				'inputData is the runtime payload available as $json inside expressions. ' +
				'Parameters are validated against the node schema before execution.',
		)
		.input(
			z.object({
				nodeType: z.string().describe('Node type identifier from list_tools'),
				nodeTypeVersion: z.number().describe('Node type version from list_tools'),
				nodeParameters: z
					.record(z.unknown())
					.optional()
					.describe(
						'Static node config. Use expressions like ={{ $json.url }} to reference inputData fields.',
					),
				credentials: z
					.record(z.object({ id: z.string(), name: z.string() }))
					.optional()
					.describe('Credential slot → { id, name }. Copy from list_tools credentials array.'),
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
					ensureSchemaBaseDirsSet();
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
					credentialDetails: credentials as Record<string, INodeCredentialsDetails> | undefined,
					inputData: [{ json: (inputData ?? {}) as IDataObject }],
					projectId,
				});
			},
		);
}

export type { ToolDescriptor };
