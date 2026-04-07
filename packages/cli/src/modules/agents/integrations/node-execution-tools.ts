import { Tool } from '@n8n/agents';
import type { CredentialProvider } from '@n8n/agents';
import type { IDataObject, INodeCredentialsDetails, INodeParameters } from 'n8n-workflow';
import { z } from 'zod';

import type { EphemeralNodeExecutor } from '@/node-execution';

import type { NodeToolRegistry, ToolDescriptor } from '../node-tool-registry';

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
			'List the n8n node tools available to add to this agent. ' +
				'Each entry includes: name (display name), nodeType (the type identifier to use in code), ' +
				'nodeTypeVersion, description, hasCredentials, and credentials (array of { slot, id, name } ' +
				'for any credentials the user has configured). ' +
				'To add a tool, call get_my_code, insert a ToolFromNode block, then typecheck and set_code. ' +
				'Example ToolFromNode usage:\n' +
				"  import { ToolFromNode } from '@n8n/agents-utils';\n" +
				"  import { node } from '@n8n/workflow-sdk';\n" +
				"  import { z } from 'zod';\n" +
				'  // Then in the agent chain:\n' +
				"  .tool(new ToolFromNode(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2,\n" +
				"    config: { parameters: { url: '={{ $json.url }}' } } }))\n" +
				"    .name('fetch_webpage').description('Fetch a URL')\n" +
				"    .input(z.object({ url: z.string().describe('URL to fetch') })))\n" +
				'For nodes that need credentials, include config.credentials using slot/id/name from this list.',
		)
		.input(z.object({}))
		.handler(async () => {
			const tools = await registry.listTools(credentialProvider);
			return { tools };
		});
}

export interface RunNodeArgs {
	nodeType: string;
	nodeTypeVersion: number;
	nodeParameters?: Record<string, unknown>;
	credentials?: Record<string, { id: string; name: string }>;
	inputData?: Record<string, unknown>;
}

/**
 * Tool that executes any n8n node directly for the current turn, without
 * requiring it to be in the agent's schema first.
 *
 * After a successful call, the agent should also persist the tool by writing
 * a ToolFromNode block and calling set_code — so that on the next rehydration
 * the tool is part of the schema and run_node_tool is no longer needed for it.
 */
export function createRunNodeTool(
	executor: Pick<EphemeralNodeExecutor, 'executeInline'>,
	projectId: string,
) {
	return new Tool('run_node_tool')
		.description(
			'Execute an n8n node immediately for the current request, even before it is in your schema. ' +
				'Use nodeType and nodeTypeVersion from list_tools. ' +
				'nodeParameters holds static node config; use n8n expressions like ={{ $json.url }} to map inputData fields. ' +
				'credentials maps slot names to { id, name } — copy from the credentials array in list_tools. ' +
				'inputData is the runtime payload available as $json inside expressions. ' +
				'After getting the result, present it to the user and ask: ' +
				'"Would you like me to add this tool permanently so I can use it directly next time?" ' +
				'If yes: call get_my_code, add a matching ToolFromNode block, typecheck, then set_code.',
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
			async ({ nodeType, nodeTypeVersion, nodeParameters, credentials, inputData }: RunNodeArgs) =>
				executor.executeInline({
					nodeType,
					nodeTypeVersion,
					nodeParameters: (nodeParameters ?? {}) as INodeParameters,
					credentialDetails: credentials as Record<string, INodeCredentialsDetails> | undefined,
					inputData: [{ json: (inputData ?? {}) as IDataObject }],
					projectId,
				}),
		);
}

export type { ToolDescriptor };
