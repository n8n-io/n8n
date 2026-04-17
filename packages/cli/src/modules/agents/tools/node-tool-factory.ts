import type { BuiltTool } from '@n8n/agents';
import { Tool } from '@n8n/agents';
import type { JSONSchema7 } from 'json-schema';
import type { IDataObject, INodeParameters } from 'n8n-workflow';

import type { EphemeralNodeExecutor } from '@/node-execution';

import type { AgentJsonToolConfig } from '../json-config/agent-json-config';

export interface NodeToolFactoryContext {
	executor: EphemeralNodeExecutor;
	projectId: string;
}

/**
 * Convert a single {@link NodeToolDescriptor} marker (from `ToolFromNode.build()`) into
 * a real `BuiltTool` backed by {@link EphemeralNodeExecutor}.
 */
export function resolveNodeTool(
	toolSchema: Extract<AgentJsonToolConfig, { type: 'node' }>,
	ctx: NodeToolFactoryContext,
): BuiltTool {
	return new Tool(toolSchema.name)
		.description(toolSchema.description ?? `Execute the ${toolSchema.node.nodeType} node`)
		.input(toolSchema.inputSchema as JSONSchema7)
		.handler(async (input: Record<string, unknown>) => {
			const credentialDetails: Record<string, { id: string; name: string }> = {};
			for (const [slot, ref] of Object.entries(toolSchema.node.credentials ?? {})) {
				if (ref.id) {
					credentialDetails[slot] = { id: ref.id, name: ref.name };
				}
			}

			return await ctx.executor.executeInline({
				nodeType: toolSchema.node.nodeType,
				nodeTypeVersion: toolSchema.node.nodeTypeVersion,
				nodeParameters: toolSchema.node.nodeParameters as INodeParameters,
				credentialDetails:
					Object.keys(credentialDetails).length > 0 ? credentialDetails : undefined,
				inputData: [{ json: input as IDataObject }],
				projectId: ctx.projectId,
			});
		})
		.build();
}
