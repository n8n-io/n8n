import type { BuiltTool, ToolSchema } from '@n8n/agents';
import { Tool } from '@n8n/agents';
import type { IDataObject, INodeParameters } from 'n8n-workflow';

import type { EphemeralNodeExecutor } from '@/node-execution';

import type { NodeToolDescriptor } from './types';

export interface NodeToolFactoryContext {
	executor: EphemeralNodeExecutor;
	projectId: string;
}

/**
 * Convert a single {@link NodeToolDescriptor} marker (from `ToolFromNode.build()`) into
 * a real `BuiltTool` backed by {@link EphemeralNodeExecutor}.
 */
export function resolveNodeTool(toolSchema: ToolSchema, ctx: NodeToolFactoryContext): BuiltTool {
	const metadata = toolSchema.metadata as NodeToolDescriptor | null;
	if (!metadata) {
		throw new Error(`Node tool "${toolSchema.name}" is missing metadata`);
	}

	return new Tool(toolSchema.name)
		.description(toolSchema.description ?? `Execute the ${metadata.nodeType} node`)
		.input(toolSchema.inputSchema)
		.handler(async (input: Record<string, unknown>) => {
			const credentialDetails: Record<string, { id: string; name: string }> = {};
			for (const [slot, ref] of Object.entries(metadata.credentials ?? {})) {
				if (ref.id) {
					credentialDetails[slot] = { id: ref.id, name: ref.name };
				}
			}

			return await ctx.executor.executeInline({
				nodeType: metadata.nodeType,
				nodeTypeVersion: metadata.nodeTypeVersion,
				nodeParameters: metadata.nodeParameters as INodeParameters,
				credentialDetails:
					Object.keys(credentialDetails).length > 0 ? credentialDetails : undefined,
				inputData: [{ json: input as IDataObject }],
				projectId: ctx.projectId,
			});
		})
		.build();
}
