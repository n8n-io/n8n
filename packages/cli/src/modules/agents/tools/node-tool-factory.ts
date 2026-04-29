import type { BuiltTool } from '@n8n/agents';
import { Tool, isZodSchema } from '@n8n/agents';
import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';
import type { IDataObject, INodeParameters } from 'n8n-workflow';
import { extractFromAIInputSchema, isToolType, nodeNameToToolName } from 'n8n-workflow';
import { zodToJsonSchema } from 'zod-to-json-schema';

import type { EphemeralNodeExecutor } from '@/node-execution';
import { NodeTypes } from '@/node-types';
import { Container } from '@n8n/di';

import type { AgentJsonToolConfig } from '../json-config/agent-json-config';

export interface NodeToolFactoryContext {
	executor: EphemeralNodeExecutor;
	projectId: string;
}

/**
 * Shape the config's credential map for the executor. Both introspection (at
 * tool-registration time) and invocation (at LLM-call time) need to hand the
 * executor a `Record<slot, { id, name }>`, and both want to drop entries whose
 * credential hasn't been persisted yet (no id).
 */
function toExecutorCredentials(
	credentials: Extract<AgentJsonToolConfig, { type: 'node' }>['node']['credentials'],
): Record<string, { id: string; name: string }> | undefined {
	if (!credentials) return undefined;
	const out: Record<string, { id: string; name: string }> = {};
	for (const [slot, ref] of Object.entries(credentials)) {
		if (ref.id) out[slot] = { id: ref.id, name: ref.name };
	}
	return Object.keys(out).length > 0 ? out : undefined;
}

function isObjectSchema(value: JSONSchema7Definition): value is JSONSchema7 {
	return typeof value === 'object' && value !== null && value.type === 'object';
}

function mergeAllOfObjects(members: JSONSchema7[]): JSONSchema7 {
	const properties: Record<string, JSONSchema7Definition> = {};
	const required: string[] = [];
	for (const member of members) {
		Object.assign(properties, member.properties ?? {});
		if (Array.isArray(member.required)) required.push(...member.required);
	}
	return {
		type: 'object',
		properties,
		...(required.length > 0 && { required: Array.from(new Set(required)) }),
	};
}

function resolveToolNodeType(nodeType: string, nodeTypeVersion: number): string {
	if (isToolType(nodeType)) return nodeType;

	const toolNodeType = `${nodeType}Tool`;
	try {
		Container.get(NodeTypes).getByNameAndVersion(toolNodeType, nodeTypeVersion);
		return toolNodeType;
	} catch {
		return nodeType;
	}
}

/**
 * Coerce any `zodToJsonSchema` output into a top-level `{ type: "object" }`
 * without dropping field guidance — Anthropic rejects any other root, but
 * simply flattening unions would strip the per-branch shapes the LLM relies
 * on. Branches:
 *
 *   - `type: 'object'` → pass through.
 *   - `allOf` of objects → merge into one object (lossless for z.intersection).
 *   - `anyOf`/`oneOf` of objects → hoist `type: 'object'` to the root but keep
 *     the union so discriminated-union branches survive.
 *   - Anything else → wrap in `{ input: <schema> }`. This covers single-type
 *     primitives / arrays, multi-type roots (e.g. `["string","null"]` from
 *     `z.string().nullable()`), `$ref`-only, `const`-only, `enum`-only,
 *     `not`-only, and bare `{}` schemas. The inner schema stays intact as a
 *     valid property-value — strictly more informative than an empty object.
 */
export function normalizeToObjectSchema(schema: JSONSchema7): JSONSchema7 {
	if (schema.type === 'object') return schema;

	if (Array.isArray(schema.allOf)) {
		const objectMembers = schema.allOf.filter(isObjectSchema);
		if (objectMembers.length > 0) return mergeAllOfObjects(objectMembers);
	}

	for (const key of ['anyOf', 'oneOf'] as const) {
		const members = schema[key];
		if (!Array.isArray(members) || members.length === 0) continue;
		const normalized = members
			.filter((m): m is JSONSchema7 => typeof m === 'object' && m !== null)
			.map((m) => normalizeToObjectSchema(m))
			.filter(isObjectSchema);
		if (normalized.length > 0) {
			return { type: 'object', [key]: normalized };
		}
	}

	return {
		type: 'object',
		properties: { input: schema },
		required: ['input'],
	};
}

/**
 * Native tool nodes expose a LangChain tool via `supplyData`. The shape of its
 * schema depends on the class:
 *   - Base `Tool` / `DynamicTool` (toolWikipedia, toolCalculator, etc.) has no
 *     `.schema` — the input contract is the implicit `{ input: string }`.
 *   - `StructuredTool` / `DynamicStructuredTool` / `N8nTool` (ToolCode with a
 *     configured schema, ToolWorkflow v1/v2, McpClientTool) carries a Zod
 *     `.schema` with multi-field requirements.
 *
 * If an existing `AgentJsonToolRef` persisted an empty `inputSchema` (the
 * default before this shape was known), we need to derive one that matches
 * what the runtime tool's `.invoke(args)` will zod-parse against — otherwise
 * the LLM is told one shape and the tool validates a different one.
 *
 * Strategy:
 *   1. If nodeParameters contain `$fromAI(...)`, derive the schema from those
 *      placeholders so persisted configs cannot drift from runtime params.
 *   2. If the config carries a non-empty schema, trust it.
 *   3. Otherwise, ask the executor to instantiate the LangChain tool and
 *      report its `.schema`. If it's a Zod schema, convert to JSON Schema.
 *   4. Fall back to the `{ input: string }` shape for plain `Tool` nodes.
 */
async function resolveInputSchema(
	toolSchema: Extract<AgentJsonToolConfig, { type: 'node' }>,
	ctx: NodeToolFactoryContext,
): Promise<JSONSchema7> {
	const fromAISchema = extractFromAIInputSchema(toolSchema.node.nodeParameters ?? {});
	if (fromAISchema) return fromAISchema as JSONSchema7;

	const configured = toolSchema.inputSchema as JSONSchema7 | undefined;
	const properties = (configured?.properties ?? {}) as Record<string, unknown>;
	const hasProps = Object.keys(properties).length > 0;
	if (hasProps) return configured as JSONSchema7;

	let nodeType;
	const nodeTypeName = resolveToolNodeType(
		toolSchema.node.nodeType,
		toolSchema.node.nodeTypeVersion,
	);
	try {
		nodeType = Container.get(NodeTypes).getByNameAndVersion(
			nodeTypeName,
			toolSchema.node.nodeTypeVersion,
		);
	} catch {
		// If the node type can't be resolved here, fall through — the executor
		// will surface a clearer error at invocation time.
		return configured ?? { type: 'object', properties: {} };
	}

	if (typeof nodeType.supplyData === 'function') {
		const introspected = await ctx.executor.introspectSupplyDataToolSchema({
			projectId: ctx.projectId,
			nodeType: nodeTypeName,
			nodeTypeVersion: toolSchema.node.nodeTypeVersion,
			nodeParameters: toolSchema.node.nodeParameters as INodeParameters,
			credentials: toExecutorCredentials(toolSchema.node.credentials) ?? null,
		});

		if (isZodSchema(introspected)) {
			return normalizeToObjectSchema(zodToJsonSchema(introspected) as JSONSchema7);
		}

		return {
			type: 'object',
			properties: {
				input: {
					type: 'string',
					description:
						toolSchema.description ??
						nodeType.description.description ??
						`The query or input text to pass to ${toolSchema.node.nodeType}.`,
				},
			},
			required: ['input'],
		};
	}

	return configured ?? { type: 'object', properties: {} };
}

/**
 * Convert a single {@link NodeToolDescriptor} marker (from `ToolFromNode.build()`) into
 * a real `BuiltTool` backed by {@link EphemeralNodeExecutor}.
 */
export async function resolveNodeTool(
	toolSchema: Extract<AgentJsonToolConfig, { type: 'node' }>,
	ctx: NodeToolFactoryContext,
): Promise<BuiltTool> {
	// Anthropic + OpenAI accept only `[a-zA-Z0-9_-]` (len ≤ 64/128) for tool
	// identifiers. The persisted `name` is a human-readable label (e.g. "Google
	// Drive") so we normalize it here — same helper the LangChain canvas path
	// uses (see `create-node-as-tool.ts:101`).
	const sanitizedName = nodeNameToToolName(toolSchema.name);
	const nodeType = resolveToolNodeType(toolSchema.node.nodeType, toolSchema.node.nodeTypeVersion);

	return new Tool(sanitizedName)
		.description(toolSchema.description ?? `Execute the ${nodeType} node`)
		.input(await resolveInputSchema(toolSchema, ctx))
		.handler(async (input: Record<string, unknown>) => {
			return await ctx.executor.executeInline({
				nodeType,
				nodeTypeVersion: toolSchema.node.nodeTypeVersion,
				nodeParameters: toolSchema.node.nodeParameters as INodeParameters,
				credentialDetails: toExecutorCredentials(toolSchema.node.credentials),
				inputData: [{ json: input as IDataObject }],
				projectId: ctx.projectId,
			});
		})
		.build();
}
