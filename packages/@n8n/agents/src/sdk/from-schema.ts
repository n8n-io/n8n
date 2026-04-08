import type { JSONSchema7 } from 'json-schema';
import type { ZodType } from 'zod';

import type { BuiltEval, BuiltGuardrail, BuiltTelemetry, BuiltTool } from '../types';
import { McpClient } from './mcp-client';
import { Memory } from './memory';
import { wrapToolForApproval } from './tool';
import type { AgentBuilder } from '../types/sdk/agent-builder';
import type { CredentialProvider } from '../types/sdk/credential-provider';
import type { EvalInput, EvalScore, JudgeInput } from '../types/sdk/eval';
import type { HandlerExecutor } from '../types/sdk/handler-executor';
import type { McpServerConfig } from '../types/sdk/mcp';
import type { AgentMessage } from '../types/sdk/message';
import type {
	AgentSchema,
	EvalSchema,
	GuardrailSchema,
	McpServerSchema,
	ProviderToolSchema,
	TelemetrySchema,
	ToolSchema,
} from '../types/sdk/schema';
import type { InterruptibleToolContext, ToolContext } from '../types/sdk/tool';
import type { JSONObject } from '../types/utils/json';

export interface FromSchemaOptions {
	handlerExecutor: HandlerExecutor;
	credentialProvider?: CredentialProvider;
}

/** Sentinel used to signal that a sandboxed handler called ctx.suspend(). */
const SUSPEND_MARKER = Symbol.for('n8n.agent.suspend');

interface SuspendResult {
	[key: symbol]: true;
	payload: unknown;
}

export function isSuspendResult(value: unknown): value is SuspendResult {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Record<symbol, unknown>)[SUSPEND_MARKER] === true
	);
}

/**
 * Reconstruct a live Agent from an AgentSchema JSON.
 *
 * This is the inverse of `Agent.describe()` — it takes a serialised schema
 * (produced by `describe()` or stored in the database) and rebuilds a
 * fully-configured Agent instance with proxy handlers that delegate tool
 * execution to the provided `HandlerExecutor`.
 *
 * All source expressions in the schema (provider tools, MCP configs,
 * telemetry, structured output, suspend/resume schemas) are evaluated
 * via `HandlerExecutor.evaluateExpression()` / `evaluateSchema()`.
 *
 * The `agent` parameter is the Agent instance to configure (avoids circular import).
 */
export async function fromSchema(
	agent: AgentBuilder,
	schema: AgentSchema,
	options: FromSchemaOptions,
): Promise<void> {
	const { handlerExecutor } = options;

	applyModel(agent, schema.model);

	if (schema.credential !== null) {
		agent.credential(schema.credential);
	}

	if (schema.instructions !== null) {
		agent.instructions(schema.instructions);
	}

	await applyTools(agent, schema.tools, handlerExecutor);
	await applyProviderTools(agent, schema.providerTools, handlerExecutor);
	applyConfig(agent, schema.config);
	applyMemory(agent, schema);
	applyGuardrails(agent, schema.guardrails);
	applyEvals(agent, schema.evaluations, handlerExecutor);
	await applyStructuredOutput(agent, schema.config.structuredOutput, handlerExecutor);

	if (options.credentialProvider) {
		agent.credentialProvider(options.credentialProvider);
	}

	await applyMcpServers(agent, schema.mcp, handlerExecutor);
	await applyTelemetry(agent, schema.telemetry, handlerExecutor);
}

// ---------------------------------------------------------------------------
//  Helpers – each handles one section of the AgentSchema
// ---------------------------------------------------------------------------

function applyModel(agent: AgentBuilder, model: AgentSchema['model']): void {
	if (model.provider && model.name) {
		agent.model(model.provider, model.name);
	} else if (model.name) {
		agent.model(model.name);
	}
}

async function applyTools(
	agent: AgentBuilder,
	tools: ToolSchema[],
	executor: HandlerExecutor,
): Promise<void> {
	const addedTools = new Set<string>();
	for (const ts of tools) {
		if (addedTools.has(ts.name)) {
			throw new Error(`Schema has multiple definitions of tool ${ts.name}`);
		}
		addedTools.add(ts.name);

		if (!ts.editable) {
			agent.tool({
				name: ts.name,
				description: ts.description,
				__workflowTool: true,
				workflowName: ts.name,
			} as unknown as BuiltTool);
			continue;
		}

		const schemas: { suspend?: ZodType; resume?: ZodType } = {};
		if (ts.suspendSchemaSource) {
			schemas.suspend = await executor.evaluateSchema(ts.suspendSchemaSource);
		}
		if (ts.resumeSchemaSource) {
			schemas.resume = await executor.evaluateSchema(ts.resumeSchemaSource);
		}

		const builtTool = buildToolFromSchema(ts, executor, schemas);
		agent.tool(builtTool);
	}
}

async function applyProviderTools(
	agent: AgentBuilder,
	providerTools: ProviderToolSchema[],
	executor: HandlerExecutor,
): Promise<void> {
	for (const pt of providerTools) {
		if (pt.source) {
			const evaluated = (await executor.evaluateExpression(pt.source)) as {
				name: `${string}.${string}`;
				args?: Record<string, unknown>;
			};
			agent.providerTool({
				name: evaluated.name,
				args: evaluated.args ?? {},
			});
		} else {
			agent.providerTool({
				name: pt.name as `${string}.${string}`,
				args: {},
			});
		}
	}
}

function applyConfig(agent: AgentBuilder, config: AgentSchema['config']): void {
	if (config.thinking !== null) {
		const { provider, ...thinkingConfig } = config.thinking;
		agent.thinking(provider, thinkingConfig);
	}

	if (config.toolCallConcurrency !== null) {
		agent.toolCallConcurrency(config.toolCallConcurrency);
	}

	if (config.requireToolApproval) {
		agent.requireToolApproval();
	}
}

function applyMemory(agent: AgentBuilder, schema: AgentSchema): void {
	if (schema.memory !== null) {
		const memory = new Memory();
		if (schema.memory.lastMessages !== null) {
			memory.lastMessages(schema.memory.lastMessages);
		}
		agent.memory(memory);
	}

	if (schema.checkpoint !== null) {
		agent.checkpoint(schema.checkpoint);
	}
}

function applyGuardrails(agent: AgentBuilder, guardrails: GuardrailSchema[]): void {
	for (const g of guardrails) {
		const builtGuardrail: BuiltGuardrail = {
			name: g.name,
			guardType: g.guardType,
			strategy: g.strategy,
			_config: g.config,
		};
		if (g.position === 'input') {
			agent.inputGuardrail(builtGuardrail);
		} else {
			agent.outputGuardrail(builtGuardrail);
		}
	}
}

function applyEvals(
	agent: AgentBuilder,
	evaluations: EvalSchema[],
	executor: HandlerExecutor,
): void {
	for (const evalSchema of evaluations) {
		const builtEval = buildEvalFromSchema(evalSchema, executor);
		agent.eval(builtEval);
	}
}

async function applyStructuredOutput(
	agent: AgentBuilder,
	structuredOutput: AgentSchema['config']['structuredOutput'],
	executor: HandlerExecutor,
): Promise<void> {
	if (structuredOutput.enabled && structuredOutput.schemaSource) {
		const outputSchema = await executor.evaluateSchema(structuredOutput.schemaSource);
		agent.structuredOutput(outputSchema);
	}
}

async function applyMcpServers(
	agent: AgentBuilder,
	mcp: McpServerSchema[] | null,
	executor: HandlerExecutor,
): Promise<void> {
	if (!mcp || mcp.length === 0) return;

	const mcpConfigs: McpServerConfig[] = [];
	for (const m of mcp) {
		if (m.configSource) {
			const config = (await executor.evaluateExpression(m.configSource)) as McpServerConfig;
			mcpConfigs.push(config);
		}
	}

	if (mcpConfigs.length > 0) {
		agent.mcp(new McpClient(mcpConfigs));
	}
}

async function applyTelemetry(
	agent: AgentBuilder,
	telemetry: TelemetrySchema | null,
	executor: HandlerExecutor,
): Promise<void> {
	if (telemetry?.source) {
		const built = (await executor.evaluateExpression(telemetry.source)) as BuiltTelemetry;
		agent.telemetry(built);
	}
}

// ---------------------------------------------------------------------------
//  Tool & Eval builders
// ---------------------------------------------------------------------------

/**
 * Build a `BuiltTool` from a `ToolSchema` with a proxy handler that
 * delegates execution to the `HandlerExecutor`.
 *
 * For interruptible tools (hasSuspend), the proxy handles ctx.suspend at
 * the host level: the sandbox receives a stub suspend that records the
 * payload, and the proxy calls the real ctx.suspend on the host.
 */
function buildToolFromSchema(
	toolSchema: ToolSchema,
	executor: HandlerExecutor,
	preEvaluated?: { suspend?: ZodType; resume?: ZodType },
): BuiltTool {
	const handler = async (
		input: unknown,
		ctx: ToolContext | InterruptibleToolContext,
	): Promise<unknown> => {
		if (toolSchema.hasSuspend && 'suspend' in ctx) {
			// Interruptible tool: the real ctx.suspend is a host-side function.
			// We pass serialisable ctx data into the sandbox, and the sandbox
			// returns a marker if suspend was called. Then we call the real
			// ctx.suspend on the host.
			const interruptCtx = ctx;
			const result = await executor.executeTool(toolSchema.name, input, {
				resumeData: interruptCtx.resumeData,
				parentTelemetry: ctx.parentTelemetry,
			});

			if (isSuspendResult(result)) {
				return await interruptCtx.suspend(result.payload);
			}
			return result;
		}

		// Non-interruptible tool: pass ctx through directly (only serialisable
		// fields like parentTelemetry).
		return await executor.executeTool(toolSchema.name, input, {
			parentTelemetry: ctx.parentTelemetry,
		});
	};

	// toMessage: The runtime calls toMessage synchronously (agent-runtime.ts).
	// When the executor provides a sync variant (executeToMessageSync), use it
	// directly for an immediate result. Otherwise fall back to async with a
	// stale-cache workaround.
	let toMessage: ((output: unknown) => AgentMessage | undefined) | undefined;
	if (toolSchema.hasToMessage) {
		if (executor.executeToMessageSync) {
			const syncExecutor = executor.executeToMessageSync.bind(executor);
			toMessage = (output: unknown): AgentMessage | undefined => {
				return syncExecutor(toolSchema.name, output);
			};
		} else {
			throw new Error('Executor does not support executeToMessageSync');
		}
	}

	const built: BuiltTool = {
		name: toolSchema.name,
		description: toolSchema.description,
		inputSchema: (toolSchema.inputSchema as JSONSchema7) ?? undefined,
		handler,
		toMessage,
		suspendSchema: preEvaluated?.suspend,
		resumeSchema: preEvaluated?.resume,
		providerOptions: toolSchema.providerOptions
			? (toolSchema.providerOptions as Record<string, JSONObject>)
			: undefined,
	};

	// If the tool requires approval, wrap it with the approval gate.
	// This re-applies the same wrapping that Tool.build() does at define time.
	if (toolSchema.requireApproval) {
		return wrapToolForApproval(built, { requireApproval: true });
	}

	return built;
}

/**
 * Build a `BuiltEval` from an `EvalSchema` with a proxy _run function
 * that delegates execution to the `HandlerExecutor`.
 */
function buildEvalFromSchema(evalSchema: EvalSchema, executor: HandlerExecutor): BuiltEval {
	return {
		name: evalSchema.name,
		description: evalSchema.description ?? undefined,
		evalType: evalSchema.type,
		modelId: evalSchema.modelId ?? null,
		credentialName: evalSchema.credentialName ?? null,
		_run: async (evalInput: EvalInput): Promise<EvalScore> => {
			// For judge evals, the llm function is bound inside the module
			// when the full module runs in the sandbox. The executor passes
			// the input to _run() which already has llm in its closure.
			return await executor.executeEval(evalSchema.name, evalInput as EvalInput | JudgeInput);
		},
	};
}
