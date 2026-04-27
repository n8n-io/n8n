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
	NodeHelpers,
	type FromAIArgument,
	type FromAIArgumentType,
	type IDataObject,
	type INodeExecutionData,
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
	const manifest = buildManifest(nodeType.description, operations);
	const byName = new Map<string, OperationEntry>(operations.map((o) => [o.name, o]));

	// Pre-resolve top-level parameter defaults from the node description (e.g.
	// `authentication: 'oAuth2'` for Google nodes). Some nodes branch on these
	// defaults to pick which credential to bind, so omitting them leads to the
	// wrong credential type being requested at execution time.
	const baseNode = { typeVersion: appDef.nodeTypeVersion, parameters: {} };
	const defaultParameters =
		NodeHelpers.getNodeParameters(
			nodeType.description.properties ?? [],
			{},
			true,
			false,
			baseNode,
			nodeType.description,
		) ?? {};

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
				const { nodeParameters: normalized, inputData } = normalizeForExecutor(parsed.data, entry);
				return await executor.executeInline({
					nodeType: appDef.nodeType,
					nodeTypeVersion: appDef.nodeTypeVersion,
					nodeParameters: {
						...defaultParameters,
						resource: entry.resource,
						operation: entry.operation,
						...normalized,
					},
					credentialDetails: {
						[appDef.credentialType]: { id: credentialId, name: credentialName },
					},
					inputData,
					projectId,
				});
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return {
					status: 'error',
					message: `${nodeType.description.displayName} invocation failed: ${message}`,
				};
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
	const baseDescription =
		property.description ?? property.displayName ?? `${property.name} for the operation`;
	return {
		key: property.name,
		type: nodePropertyTypeToFromAIType(property.type),
		description: enrichDescription(property, baseDescription),
	};
}

/**
 * Add hints to the LLM-facing description for n8n-specific parameter types
 * whose Zod schema collapses to a friendlier shape than the node actually
 * consumes. The toolset rewrites the value at invoke time
 * (see `normalizeForExecutor`) — this string just teaches the model what
 * shape to *send*.
 */
function enrichDescription(property: INodeProperties, base: string): string {
	if (property.type === 'resourceLocator') {
		return `${base} (provide the raw ID as a string).`;
	}
	if (property.type === 'resourceMapper') {
		return `${base} (provide a flat object {columnName: value, …} for one row, or an array of such objects for multiple rows).`;
	}
	return base;
}

interface NormalizedInvocation {
	nodeParameters: Record<string, unknown>;
	inputData: INodeExecutionData[];
}

/**
 * Translate Zod-parsed args into the shapes the underlying n8n node consumes.
 *
 * The toolset's LLM-facing schema flattens two n8n-UI-only parameter types
 * for ergonomics; the node still expects their full structure at runtime:
 *
 *  - `resourceLocator` — node reads `{ mode, value }`. The LLM sends a
 *    plain string. We wrap it, picking the first available mode that
 *    accepts a raw value (`id` → `url` → first declared mode).
 *  - `resourceMapper` (mode `add`) — node reads
 *    `{ mappingMode, value, schema, … }`. The LLM sends a flat
 *    `{column: value}` map (or an array of them). We convert to
 *    `mappingMode: 'autoMapInputData'` and route the data through
 *    `inputData` so the node's auto-map path picks it up. This sidesteps
 *    the `defineBelow` schema-checking branch, which only works on sheets
 *    that already have header rows.
 *  - `resourceMapper` (mode `update` / `upsert`) — node looks up the row
 *    by `columns.matchingColumns` and reads `columns.value` for the new
 *    values. The LLM sends a flat object that includes a `matchOn` key
 *    naming the matching column; we extract it, populate
 *    `matchingColumns`, and put the rest into `value` under
 *    `mappingMode: 'defineBelow'`.
 *
 * Anything the agent already sends in the structured form (e.g. an object
 * with `mode`/`value`) is left alone.
 */
function normalizeForExecutor(
	args: Record<string, unknown>,
	entry: OperationEntry,
): NormalizedInvocation {
	const out: Record<string, unknown> = { ...args };
	const items: IDataObject[] = [];

	for (const prop of entry.properties) {
		const v = out[prop.name];

		if (prop.type === 'resourceLocator' && typeof v === 'string') {
			out[prop.name] = { mode: pickResourceLocatorMode(prop), value: v };
			continue;
		}

		if (prop.type === 'resourceMapper' && isFlatMapOrArrayOfMaps(v)) {
			const rows = Array.isArray(v) ? v : [v];
			out[prop.name] = {
				mappingMode: 'autoMapInputData',
				value: null,
				schema: [],
				matchingColumns: [],
				attemptToConvertTypes: false,
				convertFieldsToString: false,
			};
			for (const row of rows) items.push(row as IDataObject);
			continue;
		}
	}

	const inputData = items.length > 0 ? items.map((json) => ({ json })) : [{ json: {} }];
	return { nodeParameters: out, inputData };
}

function pickResourceLocatorMode(property: INodeProperties): string {
	const modes = (property.modes ?? []) as Array<{ name: string }>;
	const names = modes.map((m) => m.name);
	if (names.includes('id')) return 'id';
	if (names.includes('url')) return 'url';
	return names[0] ?? 'id';
}

function isFlatMapOrArrayOfMaps(
	v: unknown,
): v is Record<string, unknown> | Array<Record<string, unknown>> {
	if (Array.isArray(v)) {
		return v.every((row) => isPlainObject(row));
	}
	if (!isPlainObject(v)) return false;
	// If the LLM already sent a structured resourceMapper, leave it alone.
	if ('mappingMode' in v) return false;
	return true;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function nodePropertyTypeToFromAIType(type: string | undefined): FromAIArgumentType {
	switch (type) {
		case 'number':
			return 'number';
		case 'boolean':
			return 'boolean';
		case 'collection':
		case 'fixedCollection':
		case 'resourceMapper':
		case 'json':
			return 'json';
		default:
			return 'string';
	}
}
