import type { BuiltTool } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import { createZodSchemaFromArgs, extractFromAIParameters } from '@n8n/ai-utilities/fromai-helpers';
import type { AgentJsonToolConfig } from '@n8n/api-types';
import { Container } from '@n8n/di';
import type { JSONSchema7 } from 'json-schema';
import type {
	IDataObject,
	INodeCredentialsDetails,
	INodeParameters,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { nodeNameToToolName } from 'n8n-workflow';
import { z } from 'zod';

import { resolveToolNodeType, type EphemeralNodeExecutor } from '@/node-execution';
import { NodeTypes } from '@/node-types';

import { AgentFileBridge, FILES_INPUT_SCHEMA } from '../agent-file-bridge.service';
import type { InstrumentToolAdditionalData } from '../evaluation/agent-evaluation.contracts';
import { toPolicyRefusalResult } from './policy-refusal';

type NodeToolInputSchema = JSONSchema7 | z.ZodType;

export interface NodeToolFactoryContext {
	executor: EphemeralNodeExecutor;
	projectId: string;
	/** Owner of the files that the tool returns. Absent for inline agents. */
	agentId?: string;
	/** Eval-only additionalData decoration — absent on every production path. */
	instrumentToolAdditionalData?: InstrumentToolAdditionalData;
}

/**
 * Shape the config's credential map for the executor. Both introspection (at
 * tool-registration time) and invocation (at LLM-call time) need to hand the
 * executor an `INodeCredentialsDetails` map, and both drop entries whose
 * credential hasn't been persisted yet (no id). n8n Connect managed slots have
 * no stored id — the executor mints them per execution — so they are carried
 * through by their `__aiGatewayManaged` flag rather than by id.
 */
function toExecutorCredentials(
	credentials: Extract<AgentJsonToolConfig, { type: 'node' }>['node']['credentials'],
): Record<string, INodeCredentialsDetails> | undefined {
	if (!credentials) return undefined;
	const out: Record<string, INodeCredentialsDetails> = {};
	for (const [slot, ref] of Object.entries(credentials)) {
		if ('__aiGatewayManaged' in ref) {
			out[slot] = { id: null, name: ref.name, __aiGatewayManaged: true };
		} else if (ref.id) {
			out[slot] = { id: ref.id, name: ref.name };
		}
	}
	return Object.keys(out).length > 0 ? out : undefined;
}

function createNativeStringToolInputSchema(description: string): z.ZodType {
	return z.preprocess(
		(value) => (typeof value === 'string' ? { input: value } : value),
		z.object({
			input: z.string().describe(description),
		}),
	);
}

/**
 * Native tool nodes expose a LangChain tool via `supplyData`. The shape of its
 * schema depends on the class:
 *   - Base `Tool` / `DynamicTool` (toolWikipedia, toolCalculator, etc.) is
 *     invoked by LangChain with a string but advertised to LLM providers as
 *     `{ input: string }`.
 *   - `StructuredTool` / `DynamicStructuredTool` / `N8nTool` (ToolCode with a
 *     configured schema, ToolWorkflow v1/v2, McpClientTool) carries a Zod
 *     `.schema` with multi-field requirements.
 *
 * Strategy:
 *   1. If nodeParameters contain `$fromAI(...)`, derive the schema from those
 *      placeholders so the tool schema cannot drift from runtime params.
 *   2. Otherwise, ask the executor to instantiate the LangChain tool and
 *      report its `.schema`. Zod and JSON schemas can be handed to the SDK as-is.
 *   3. Fall back to a string-compatible `{ input: string }` shape for plain
 *      `Tool` nodes. This keeps provider-facing schemas object-shaped while
 *      accepting raw string tool calls from models that emit the legacy shape.
 */
async function resolveInputSchema(
	toolSchema: Extract<AgentJsonToolConfig, { type: 'node' }>,
	ctx: NodeToolFactoryContext,
): Promise<{ schema: NodeToolInputSchema; acceptsFiles: boolean }> {
	const collectedArguments = extractFromAIParameters(
		(toolSchema.node.nodeParameters ?? {}) as INodeParameters,
	);
	// Supply-data tools take JSON only, so only these schemas accept files.
	// A `$fromAI('files')` argument keeps its meaning, so the tool then takes no files.
	if (collectedArguments.length > 0) {
		const schema = createZodSchemaFromArgs(collectedArguments);
		if (collectedArguments.some(({ key }) => key === 'files')) {
			return { schema, acceptsFiles: false };
		}
		return { schema: schema.extend({ files: FILES_INPUT_SCHEMA }), acceptsFiles: true };
	}

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
		return { schema: { type: 'object', properties: {} }, acceptsFiles: false };
	}

	if (typeof nodeType.supplyData === 'function') {
		const introspected = await ctx.executor.introspectSupplyDataToolSchema({
			projectId: ctx.projectId,
			nodeType: nodeTypeName,
			nodeTypeVersion: toolSchema.node.nodeTypeVersion,
			nodeParameters: toolSchema.node.nodeParameters as INodeParameters,
			credentials: toExecutorCredentials(toolSchema.node.credentials) ?? null,
		});

		if (introspected) {
			return { schema: introspected as NodeToolInputSchema, acceptsFiles: false };
		}

		return {
			schema: createNativeStringToolInputSchema(
				toolSchema.description ??
					nodeType.description.description ??
					`The query or input text to pass to ${toolSchema.node.nodeType}.`,
			),
			acceptsFiles: false,
		};
	}

	return { schema: z.object({ files: FILES_INPUT_SCHEMA }).passthrough(), acceptsFiles: true };
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

	// When instrumented (eval runs), the ephemeral node is named after the tool
	// so hint lookup and request attribution key on the same identifier the
	// model calls.
	const instrument = ctx.instrumentToolAdditionalData;
	const instrumentedExecution = instrument
		? {
				nodeName: sanitizedName,
				configureAdditionalData: (additionalData: IWorkflowExecuteAdditionalData) =>
					instrument(additionalData, { toolName: sanitizedName, toolKind: 'node' }),
			}
		: {};

	const { schema, acceptsFiles } = await resolveInputSchema(toolSchema, ctx);
	const built = new Tool(sanitizedName)
		.description(toolSchema.description ?? `Execute the ${nodeType} node`)
		.input(schema)
		.handler(async (toolInput: Record<string, unknown>, toolCtx) => {
			const { files, ...rest } = toolInput;
			const input = acceptsFiles ? rest : toolInput;
			const inputFiles =
				acceptsFiles && files
					? await Container.get(AgentFileBridge).toBinary(files, {
							projectId: ctx.projectId,
							threadId: toolCtx.persistence?.threadId,
						})
					: undefined;
			const result = await ctx.executor.executeInline({
				nodeType,
				nodeTypeVersion: toolSchema.node.nodeTypeVersion,
				nodeParameters: toolSchema.node.nodeParameters as INodeParameters,
				credentialDetails: toExecutorCredentials(toolSchema.node.credentials),
				inputData: [
					{ json: input as IDataObject, ...(inputFiles && { binary: inputFiles.binary }) },
				],
				projectId: ctx.projectId,
				...instrumentedExecution,
			});
			// A refusal is returned, not thrown: thrown errors reach the chat as plain text.
			if (result.status === 'error' && result.violations) {
				return toPolicyRefusalResult(
					result.error ?? result.violations[0].message,
					result.violations,
				);
			}
			// Throw on the executor's structured error so the agent runtime
			// flags the tool-result with `isError: true` and the recorder
			// marks the timeline entry as a failed call. Returning the error
			// object normally would otherwise read as a successful tool call.
			if (result.status === 'error') {
				throw new Error(result.error ?? `Node "${toolSchema.node.nodeType}" failed to execute`);
			}
			if (!result.data.some((item) => item.binary)) return result;
			// Without a thread there is no scope for the files, so the binary is dropped.
			const threadId = toolCtx.persistence?.threadId;
			if (!threadId) return { ...result, data: result.data.map(({ json }) => ({ json })) };
			const adopted = await Container.get(AgentFileBridge).adoptFromItems(
				result.data,
				{ agentId: ctx.agentId ?? null, projectId: ctx.projectId, threadId },
				inputFiles?.stored,
			);
			return {
				...result,
				data: adopted.items,
				files: adopted.files,
				...(adopted.skippedFiles.length > 0 && { skippedFiles: adopted.skippedFiles }),
			};
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
			nodeParameters: toolSchema.node.nodeParameters,
		},
	};
}
