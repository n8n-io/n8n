import type { BuiltTool, ToolContext } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import { createZodSchemaFromArgs, extractFromAIParameters } from '@n8n/ai-utilities/fromai-helpers';
import { extractNodeToolVariables } from '@n8n/api-types';
import type { AgentJsonToolConfig, NodeToolTrustedMetadata } from '@n8n/api-types';
import { Container } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import type { JSONSchema7 } from 'json-schema';
import type {
	IDataObject,
	INodeCredentialsDetails,
	INodeParameters,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { nodeNameToToolName, UserError, WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE } from 'n8n-workflow';
import { z } from 'zod';

import { resolveToolNodeType, type EphemeralNodeExecutor } from '@/node-execution';
import { NodeTypes } from '@/node-types';

import type { InstrumentToolAdditionalData } from '../agent-runtime-instrumentation';
import { toPolicyRefusalResult } from './policy-refusal';

type NodeToolInputSchema = JSONSchema7 | z.ZodType;

export interface NodeToolFactoryContext {
	executor: EphemeralNodeExecutor;
	projectId: string;
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
 * Fixed bindings of a node tool's trusted metadata, keyed by metadata name.
 * Undefined values cannot reach here through schema validation; the bound
 * `jsonValueSchema` still admits explicit `undefined` in a hand-edited
 * config, which is dropped rather than spread onto the model's arguments.
 */
export function getFixedNodeToolMetadata(
	metadata: NodeToolTrustedMetadata | undefined,
): Record<string, unknown> {
	if (!metadata) return {};
	const out: Record<string, unknown> = {};
	for (const [name, binding] of Object.entries(metadata)) {
		if (binding.mode === 'fixed' && binding.value !== undefined) out[name] = binding.value;
	}
	return out;
}

/** Expression bindings of a node tool's trusted metadata, keyed by metadata name. */
export function getExpressionNodeToolMetadata(
	metadata: NodeToolTrustedMetadata | undefined,
): Record<string, string> {
	if (!metadata) return {};
	const expressions: Record<string, string> = {};
	for (const [name, binding] of Object.entries(metadata)) {
		if (binding.mode === 'expression') expressions[name] = binding.value;
	}
	return expressions;
}

/**
 * Resolve a node tool's trusted metadata to concrete values: fixed bindings
 * immediately, expression bindings in the same trusted-input evaluation
 * context the workflow tool factory uses. That context carries no tool-call
 * input, so a metadata expression cannot read the model's arguments — the
 * "trusted" claim holds at runtime, not just by convention.
 *
 * Throws when an expression fails to resolve: metadata values must resolve or
 * the tool fails loudly. Falling back to the model's arguments would silently
 * replace a trusted value with a model-controlled one.
 */
export async function resolveNodeToolMetadata(
	metadata: NodeToolTrustedMetadata | undefined,
	ctx: NodeToolFactoryContext,
	toolName: string,
): Promise<Record<string, unknown>> {
	const expressions = getExpressionNodeToolMetadata(metadata);
	if (Object.keys(expressions).length === 0) return getFixedNodeToolMetadata(metadata);

	const resolved = await ctx.executor.evaluateExpressions(
		{
			projectId: ctx.projectId,
			nodeType: WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE,
			nodeTypeVersion: 2.2,
			nodeParameters: {},
			nodeName: toolName,
		},
		expressions,
		// No input items: expressions cannot resolve `$json`, tying the value to
		// runtime sources only ($vars, $env, ...) instead of model-generated data.
		[],
	);
	return { ...getFixedNodeToolMetadata(metadata), ...resolved };
}

function withoutEmpty(values: Record<string, unknown>): Record<string, unknown> {
	return Object.fromEntries(Object.entries(values).filter(([, value]) => hasValue(value)));
}

function hasValue(value: unknown): boolean {
	return value !== undefined && value !== null && value !== '';
}

/**
 * Select caller-mapped runtime values for the tool's declared trusted keys.
 * The declared set (the tool config's `trustedMetadata` names) stays the only
 * source of what counts as trusted, so a calling workflow can map values onto
 * existing bindings but never extend the set. Reads by name are safe; only
 * own properties of the runtime map are picked.
 */
function pickRuntimeTrustedValues(
	runtime: Record<string, unknown> | undefined,
	trustedKeys: ReadonlySet<string>,
): Record<string, unknown> {
	if (!runtime || trustedKeys.size === 0) return {};
	const picked: Record<string, unknown> = {};
	for (const key of trustedKeys) {
		// An empty mapping counts as "not provided", so the tool's default applies.
		if (Object.prototype.hasOwnProperty.call(runtime, key) && hasValue(runtime[key])) {
			picked[key] = runtime[key];
		}
	}
	return picked;
}

/**
 * Remove trusted keys from a model-facing schema so the model is never told it
 * can choose a trusted value — the runtime resolves those keys and always wins
 * over a same-named model argument. Objects are sanitized directly; unions,
 * intersections and optional/nullable wrappers (Zod) and `anyOf`/`oneOf`/`allOf`
 * (JSON schema) are sanitized in every variant. An unrecognized shape is
 * returned unchanged, where invocation-time precedence remains the guarantee.
 */
function withoutTrustedKeys(
	schema: NodeToolInputSchema,
	trustedKeys: ReadonlySet<string>,
): NodeToolInputSchema {
	if (trustedKeys.size === 0) return schema;
	if (schema instanceof z.ZodType) return sanitizeZodSchema(schema, trustedKeys);
	if (isRecord(schema)) return sanitizeJsonSchema(schema, trustedKeys);
	return schema;
}

function sanitizeZodSchema(schema: z.ZodTypeAny, trustedKeys: ReadonlySet<string>): z.ZodTypeAny {
	if (schema instanceof z.ZodObject) {
		const shape = { ...schema.shape };
		for (const key of trustedKeys) delete shape[key];
		const catchall = schema._def.catchall as z.ZodTypeAny | undefined;
		if (catchall && !(catchall instanceof z.ZodNever)) {
			return z.object(shape).catchall(catchall);
		}
		return z.object(shape);
	}
	if (schema instanceof z.ZodOptional) {
		return sanitizeZodSchema(schema.unwrap(), trustedKeys).optional();
	}
	if (schema instanceof z.ZodNullable) {
		return sanitizeZodSchema(schema.unwrap(), trustedKeys).nullable();
	}
	if (schema instanceof z.ZodDiscriminatedUnion) {
		// A discriminator that is itself trusted cannot stay; fall back to a plain
		// union of the sanitized variants so no variant advertises a trusted key.
		const variants = [...(schema.options as z.ZodTypeAny[])].map((option) =>
			sanitizeZodSchema(option, trustedKeys),
		);
		return variants.length >= 2
			? z.union(variants as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]])
			: (variants[0] ?? schema);
	}
	if (schema instanceof z.ZodUnion) {
		const variants = (schema.options as z.ZodTypeAny[]).map((option) =>
			sanitizeZodSchema(option, trustedKeys),
		);
		return z.union(variants as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
	}
	if (schema instanceof z.ZodIntersection) {
		return z.intersection(
			sanitizeZodSchema(schema._def.left as z.ZodTypeAny, trustedKeys),
			sanitizeZodSchema(schema._def.right as z.ZodTypeAny, trustedKeys),
		);
	}
	return schema;
}

function sanitizeJsonSchema(schema: JSONSchema7, trustedKeys: ReadonlySet<string>): JSONSchema7 {
	let out: JSONSchema7 = schema;
	if (isRecord(schema.properties) && Object.keys(schema.properties).length > 0) {
		out = {
			...out,
			properties: Object.fromEntries(
				Object.entries(schema.properties).filter(([key]) => !trustedKeys.has(key)),
			),
			required: (schema.required ?? []).filter((key) => !trustedKeys.has(key)),
		};
	}
	for (const keyword of ['anyOf', 'oneOf', 'allOf'] as const) {
		const variants = schema[keyword];
		if (Array.isArray(variants)) {
			out = {
				...out,
				[keyword]: variants.map((variant) =>
					isRecord(variant) ? sanitizeJsonSchema(variant as JSONSchema7, trustedKeys) : variant,
				),
			};
		}
	}
	return out;
}

/** Shorter trusted values are left alone to avoid mangling unrelated text. */
const MIN_REDACTED_LENGTH = 8;

/**
 * Replace trusted string values echoed in a node result, so a node that
 * returns its input cannot hand a trusted value back to the model. Returns a
 * copy; the original result is not mutated.
 */
function redactTrustedValues(value: unknown, secrets: ReadonlySet<string>): unknown {
	if (typeof value === 'string') return secrets.has(value) ? '[redacted]' : value;
	if (Array.isArray(value)) return value.map((item) => redactTrustedValues(item, secrets));
	if (isRecord(value)) {
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [key, redactTrustedValues(item, secrets)]),
		);
	}
	return value;
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
	trustedKeys: ReadonlySet<string>,
): Promise<NodeToolInputSchema> {
	const collectedArguments = extractFromAIParameters(
		(toolSchema.node.nodeParameters ?? {}) as INodeParameters,
	);
	if (collectedArguments.length > 0) {
		// A trusted key shares its name with a `$fromAI` placeholder when the node
		// reads that placeholder from `$json`. Advertising it would tell the model
		// it can choose it, so trusted keys stay out of the schema and the
		// placeholder resolves from the runtime-injected value.
		return createZodSchemaFromArgs(collectedArguments.filter((arg) => !trustedKeys.has(arg.key)));
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

		if (introspected) return withoutTrustedKeys(introspected as NodeToolInputSchema, trustedKeys);

		return createNativeStringToolInputSchema(
			toolSchema.description ??
				nodeType.description.description ??
				`The query or input text to pass to ${toolSchema.node.nodeType}.`,
		);
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
	const trustedMetadata = toolSchema.trustedMetadata;
	// Variables are the names the tool reads from `$json` plus any it declares a
	// default for. The model never supplies them.
	const variableNames = extractNodeToolVariables(toolSchema.node.nodeParameters);
	const trustedKeys = new Set([...Object.keys(trustedMetadata ?? {}), ...variableNames]);

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

	const built = new Tool(sanitizedName)
		.description(toolSchema.description ?? `Execute the ${nodeType} node`)
		.input(await resolveInputSchema(toolSchema, ctx, trustedKeys))
		.handler(async (input: Record<string, unknown>, toolCtx: ToolContext) => {
			// Trusted metadata is resolved at every call and spread after the
			// model's arguments — including any same-named key a schema allowed
			// through — so the model can never override or remove it. Caller
			// mappings (Message an Agent) go last: the workflow author mapped
			// that key for this invocation, so their value replaces the tool's
			// own binding. Only keys the tool config declares are picked (see
			// `pickRuntimeTrustedValues`). The merge result is the runtime's
			// execution input; telemetry records the pre-merge arguments, and the
			// node result is redacted of exact trusted values before it returns to
			// the model.
			const trusted = await resolveNodeToolMetadata(trustedMetadata, ctx, sanitizedName);
			const runtime = pickRuntimeTrustedValues(toolCtx.runtimeMetadata, trustedKeys);
			// Caller value wins, then the tool default. A variable with neither fails
			// loudly instead of running the tool with a blank value.
			const missing = variableNames.filter(
				(name) => !hasValue(runtime[name]) && !hasValue(trusted[name]),
			);
			if (missing.length > 0) {
				throw new UserError(
					`Tool "${sanitizedName}" needs a value for ${missing.map((name) => `"${name}"`).join(', ')}. Map it in the Message an Agent node. Runs without a calling workflow (chat, schedule, channels, tests) use the default value from the tool configuration, so set one there.`,
				);
			}
			const result = await ctx.executor.executeInline({
				nodeType,
				nodeTypeVersion: toolSchema.node.nodeTypeVersion,
				nodeParameters: toolSchema.node.nodeParameters as INodeParameters,
				credentialDetails: toExecutorCredentials(toolSchema.node.credentials),
				inputData: [{ json: { ...input, ...withoutEmpty(trusted), ...runtime } as IDataObject }],
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
			const secrets = new Set(
				Object.values({ ...withoutEmpty(trusted), ...runtime }).filter(
					(value): value is string =>
						typeof value === 'string' && value.length >= MIN_REDACTED_LENGTH,
				),
			);
			return secrets.size > 0 ? redactTrustedValues(result, secrets) : result;
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
