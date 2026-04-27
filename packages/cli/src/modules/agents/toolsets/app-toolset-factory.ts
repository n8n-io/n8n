import {
	Tool,
	type BuiltTool,
	zodToJsonSchema,
	buildManifest,
	buildOperationsFromDescription,
	type AppDefinition,
	type OperationEntry,
} from '@n8n/agents';
import {
	generateZodSchema,
	type FromAIArgument,
	type FromAIArgumentType,
	type INodeProperties,
} from 'n8n-workflow';
import { z } from 'zod';

import type { EphemeralNodeExecutor } from '@/node-execution';
import type { NodeTypes } from '@/node-types';

export interface BuildAppToolsetParams {
	appDef: AppDefinition;
	credentialId: string;
	credentialName: string;
	projectId: string;
	nodeTypes: NodeTypes;
	executor: EphemeralNodeExecutor;
}

const dispatcherInputSchema = z.object({
	action: z.enum(['list_operations', 'describe_operation', 'invoke_operation']),
	name: z
		.string()
		.optional()
		.describe('Operation name in "resource:operation" form. Required for describe/invoke.'),
	args: z
		.record(z.unknown())
		.optional()
		.describe('Arguments for invoke_operation, matching the schema from describe_operation.'),
});

/**
 * Build the dispatcher tool that surfaces an app's full operation surface to
 * the agent. One BuiltTool per attached app; the agent picks an action and an
 * operation at runtime.
 */
export function buildAppToolset(params: BuildAppToolsetParams): BuiltTool {
	const { appDef, credentialId, credentialName, projectId, nodeTypes, executor } = params;

	const nodeType = nodeTypes.getByNameAndVersion(appDef.nodeType, appDef.nodeTypeVersion);
	const operations = buildOperationsFromDescription(nodeType.description, appDef);
	const manifest = buildManifest(appDef, nodeType.description, operations);
	const byName = new Map<string, OperationEntry>(operations.map((o) => [o.name, o]));

	return new Tool(appDef.kind)
		.description(manifest)
		.input(dispatcherInputSchema)
		.handler(async (input) => {
			if (input.action === 'list_operations') {
				return {
					manifest,
					operations: operations.map((o) => ({ name: o.name, description: o.description })),
				};
			}

			if (input.action === 'describe_operation') {
				if (!input.name) {
					return { status: 'error', message: '`name` is required for describe_operation' };
				}
				const entry = byName.get(input.name);
				if (!entry) {
					return {
						status: 'error',
						message: `Unknown operation "${input.name}". Call list_operations to see available names.`,
					};
				}
				const zodSchema = buildOperationZodSchema(entry);
				return {
					name: entry.name,
					description: entry.description,
					schema: zodToJsonSchema(zodSchema),
				};
			}

			// invoke_operation
			if (!input.name) {
				return { status: 'error', message: '`name` is required for invoke_operation' };
			}
			const entry = byName.get(input.name);
			if (!entry) {
				return {
					status: 'error',
					message: `Unknown operation "${input.name}". Call list_operations to see available names.`,
				};
			}
			const zodSchema = buildOperationZodSchema(entry);
			const parsed = zodSchema.safeParse(input.args ?? {});
			if (!parsed.success) {
				return {
					status: 'error',
					message: `Invalid args for ${input.name}: ${parsed.error.issues
						.map((i) => `${i.path.join('.')}: ${i.message}`)
						.join('; ')}`,
				};
			}

			try {
				return await executor.executeInline({
					nodeType: appDef.nodeType,
					nodeTypeVersion: appDef.nodeTypeVersion,
					nodeParameters: {
						resource: entry.resource,
						operation: entry.operation,
						...parsed.data,
					},
					credentialDetails: {
						[appDef.credentialType]: { id: credentialId, name: credentialName },
					},
					inputData: [{ json: {} }],
					projectId,
				});
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return { status: 'error', message: `${appDef.label} invocation failed: ${message}` };
			}
		})
		.build();
}

function buildOperationZodSchema(entry: OperationEntry): z.ZodObject<z.ZodRawShape> {
	const shape: z.ZodRawShape = {};
	for (const prop of entry.properties) {
		const arg = propertyToFromAIArgument(prop);
		let schema = generateZodSchema(arg);
		if (!prop.required) schema = schema.optional();
		shape[prop.name] = schema;
	}
	return z.object(shape);
}

function propertyToFromAIArgument(property: INodeProperties): FromAIArgument {
	return {
		key: property.name,
		type: nodePropertyTypeToFromAIType(property.type),
		description:
			property.description ?? property.displayName ?? `${property.name} for the operation`,
	};
}

function nodePropertyTypeToFromAIType(type: string | undefined): FromAIArgumentType {
	switch (type) {
		case 'number':
			return 'number';
		case 'boolean':
			return 'boolean';
		case 'collection':
		case 'fixedCollection':
		case 'json':
			return 'json';
		default:
			return 'string';
	}
}
