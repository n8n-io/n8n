import type { BuiltTool } from '@n8n/agents';
import { Tool } from '@n8n/agents';
import type { JSONSchema7 } from 'json-schema';
import type { IDataObject, INodeParameters } from 'n8n-workflow';
import { nodeNameToToolName } from 'n8n-workflow';
import type { ZodType } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import type { EphemeralNodeExecutor } from '@/node-execution';
import { NodeTypes } from '@/node-types';
import { Container } from '@n8n/di';

import type { AgentJsonToolConfig } from '../json-config/agent-json-config';

export interface NodeToolFactoryContext {
	executor: EphemeralNodeExecutor;
	projectId: string;
}

function isZodSchema(value: unknown): value is ZodType {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as { safeParse?: unknown }).safeParse === 'function'
	);
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
 *   1. If the config carries a non-empty schema, trust it.
 *   2. Otherwise, ask the executor to instantiate the LangChain tool and
 *      report its `.schema`. If it's a Zod schema, convert to JSON Schema.
 *   3. Fall back to the `{ input: string }` shape for plain `Tool` nodes.
 */
async function resolveInputSchema(
	toolSchema: Extract<AgentJsonToolConfig, { type: 'node' }>,
	ctx: NodeToolFactoryContext,
): Promise<JSONSchema7> {
	const configured = toolSchema.inputSchema as JSONSchema7 | undefined;
	const properties = (configured?.properties ?? {}) as Record<string, unknown>;
	const hasProps = Object.keys(properties).length > 0;
	if (hasProps) return configured as JSONSchema7;

	try {
		const nodeType = Container.get(NodeTypes).getByNameAndVersion(
			toolSchema.node.nodeType,
			toolSchema.node.nodeTypeVersion,
		);
		if (typeof nodeType.supplyData === 'function') {
			const introspected = await ctx.executor.introspectSupplyDataToolSchema({
				projectId: ctx.projectId,
				nodeType: toolSchema.node.nodeType,
				nodeTypeVersion: toolSchema.node.nodeTypeVersion,
				nodeParameters: toolSchema.node.nodeParameters as INodeParameters,
				credentials: toolSchema.node.credentials
					? Object.fromEntries(
							Object.entries(toolSchema.node.credentials).map(([slot, ref]) => [
								slot,
								{ id: ref.id, name: ref.name },
							]),
						)
					: null,
			});

			if (isZodSchema(introspected)) {
				return zodToJsonSchema(introspected) as JSONSchema7;
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
	} catch {
		// If the node type can't be resolved here, fall through — the executor
		// will surface a clearer error at invocation time.
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

	return new Tool(sanitizedName)
		.description(toolSchema.description ?? `Execute the ${toolSchema.node.nodeType} node`)
		.input(await resolveInputSchema(toolSchema, ctx))
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
