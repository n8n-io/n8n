import type { BuiltTool } from '@n8n/agents';
import { Tool } from '@n8n/agents';
import type { IDataObject, INodeParameters } from 'n8n-workflow';
import { z } from 'zod';

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
export function resolveNodeTool(
	toolSchema: {
		name: string;
		description: string;
		metadata: Record<string, unknown> | null | undefined;
		inputSchema: Record<string, unknown> | undefined;
	},
	ctx: NodeToolFactoryContext,
): BuiltTool {
	const metadata = toolSchema.metadata as NodeToolDescriptor | undefined;
	if (!metadata) {
		throw new Error(`Node tool "${toolSchema.name}" is missing metadata`);
	}

	const inputSchema = buildZodSchema(toolSchema.inputSchema);

	return new Tool(toolSchema.name)
		.description(toolSchema.description ?? `Execute the ${metadata.nodeType} node`)
		.input(inputSchema)
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

/**
 * Build a Zod schema from a JSON Schema object stored in the tool metadata.
 * Falls back to a passthrough object schema if no schema is stored.
 */
function buildZodSchema(
	jsonSchema: Record<string, unknown> | undefined,
): z.ZodObject<z.ZodRawShape> {
	if (!jsonSchema || typeof jsonSchema !== 'object') {
		return z.object({}).passthrough();
	}

	try {
		const properties = jsonSchema.properties as
			| Record<string, { type?: string; description?: string }>
			| undefined;
		if (!properties) return z.object({}).passthrough();

		const required = (jsonSchema.required as string[]) ?? [];
		const shape: z.ZodRawShape = {};

		for (const [key, prop] of Object.entries(properties)) {
			let fieldSchema: z.ZodTypeAny;
			switch (prop.type) {
				case 'integer':
				case 'number':
					fieldSchema = z.number();
					break;
				case 'boolean':
					fieldSchema = z.boolean();
					break;
				case 'array':
					fieldSchema = z.array(z.unknown());
					break;
				case 'object':
					fieldSchema = z.object({}).passthrough();
					break;
				default:
					fieldSchema = z.string();
			}

			if (prop.description) {
				fieldSchema = fieldSchema.describe(prop.description);
			}

			if (!required.includes(key)) {
				fieldSchema = fieldSchema.optional();
			}

			shape[key] = fieldSchema;
		}

		return z.object(shape);
	} catch {
		return z.object({}).passthrough();
	}
}
