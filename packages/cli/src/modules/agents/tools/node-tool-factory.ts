import type { BuiltTool } from '@n8n/agents';
import { Tool } from '@n8n/agents';
import { createZodSchemaFromArgs, extractFromAIParameters } from '@n8n/ai-utilities';
import type { JSONSchema7 } from 'json-schema';
import type { IDataObject, INodeParameters } from 'n8n-workflow';
import { isToolType, nodeNameToToolName } from 'n8n-workflow';
import type { z } from 'zod';

import type { EphemeralNodeExecutor } from '@/node-execution';
import { NodeTypes } from '@/node-types';
import { Container } from '@n8n/di';

import type { AgentJsonToolConfig } from '../json-config/agent-json-config';

type NodeToolInputSchema = JSONSchema7 | z.ZodType;

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
 * Native tool nodes expose a LangChain tool via `supplyData`. The shape of its
 * schema depends on the class:
 *   - Base `Tool` / `DynamicTool` (toolWikipedia, toolCalculator, etc.) has no
 *     `.schema` — the input contract is the implicit `{ input: string }`.
 *   - `StructuredTool` / `DynamicStructuredTool` / `N8nTool` (ToolCode with a
 *     configured schema, ToolWorkflow v1/v2, McpClientTool) carries a Zod
 *     `.schema` with multi-field requirements.
 *
 * Strategy:
 *   1. If nodeParameters contain `$fromAI(...)`, derive the schema from those
 *      placeholders so the tool schema cannot drift from runtime params.
 *   2. Otherwise, ask the executor to instantiate the LangChain tool and
 *      report its `.schema`. Zod and JSON schemas can be handed to the SDK as-is.
 *   3. Fall back to the `{ input: string }` shape for plain `Tool` nodes.
 */
async function resolveInputSchema(
	toolSchema: Extract<AgentJsonToolConfig, { type: 'node' }>,
	ctx: NodeToolFactoryContext,
): Promise<NodeToolInputSchema> {
	const collectedArguments = extractFromAIParameters(
		(toolSchema.node.nodeParameters ?? {}) as INodeParameters,
	);
	if (collectedArguments.length > 0) return createZodSchemaFromArgs(collectedArguments);

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
		return { type: 'object', properties: {} };
	}

	if (typeof nodeType.supplyData === 'function') {
		const introspected = await ctx.executor.introspectSupplyDataToolSchema({
			projectId: ctx.projectId,
			nodeType: nodeTypeName,
			nodeTypeVersion: toolSchema.node.nodeTypeVersion,
			nodeParameters: toolSchema.node.nodeParameters as INodeParameters,
			credentials: toExecutorCredentials(toolSchema.node.credentials) ?? null,
		});

		if (introspected) return introspected as NodeToolInputSchema;

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

	return { type: 'object', properties: {} };
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

	const built = new Tool(sanitizedName)
		.description(toolSchema.description ?? `Execute the ${nodeType} node`)
		.input(await resolveInputSchema(toolSchema, ctx))
		.handler(async (input: Record<string, unknown>) => {
			const result = await ctx.executor.executeInline({
				nodeType,
				nodeTypeVersion: toolSchema.node.nodeTypeVersion,
				nodeParameters: toolSchema.node.nodeParameters as INodeParameters,
				credentialDetails: toExecutorCredentials(toolSchema.node.credentials),
				inputData: [{ json: input as IDataObject }],
				projectId: ctx.projectId,
			});
			// Throw on the executor's structured error so the agent runtime
			// flags the tool-result with `isError: true` and the recorder
			// marks the timeline entry as a failed call. Returning the error
			// object normally would otherwise read as a successful tool call.
			if (result.status === 'error') {
				throw new Error(result.error ?? `Node "${toolSchema.node.nodeType}" failed to execute`);
			}
			return result;
		})
		.build();

	return {
		...built,
		metadata: {
			kind: 'node',
			nodeType: toolSchema.node.nodeType,
			nodeTypeVersion: toolSchema.node.nodeTypeVersion,
			displayName: toolSchema.name,
			// Preserve the configured node parameters (channel, operation,
			// `$fromAI(...)` templates, etc.) so the session-detail timeline
			// can render the real node config alongside the LLM's runtime
			// input. Without this the synthetic execution viewer shows empty
			// parameters and input/output read as the same thing.
			nodeParameters: toolSchema.node.nodeParameters as INodeParameters,
		},
	};
}
