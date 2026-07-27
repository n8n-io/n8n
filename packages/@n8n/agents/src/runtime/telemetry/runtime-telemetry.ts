import type { TelemetrySettings } from 'ai';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { buildExperimentalTelemetry } from './telemetry-options';
import { Telemetry } from '../../sdk/telemetry';
import type { AttributeValue, BuiltProviderTool, BuiltTelemetry, BuiltTool } from '../../types';
import type { ExecutionOptions } from '../../types/sdk/agent';
import type { OpaqueSpanLink } from '../../types/telemetry';
import type { JSONValue } from '../../types/utils/json';
import { isZodSchema } from '../../utils/zod';
import type { AgentRuntimeConfig } from '../loop/agent-runtime';

interface TelemetrySpan {
	end(): void;
	recordException?(error: unknown): void;
	setAttributes?(attributes: Record<string, AttributeValue>): void;
	setStatus?(status: { code: number; message?: string }): void;
}

interface ActiveSpanTracer {
	startActiveSpan<T>(
		name: string,
		options: {
			attributes?: Record<string, AttributeValue>;
			root?: boolean;
			links?: OpaqueSpanLink[];
		},
		fn: (span: TelemetrySpan) => T,
	): T;
}

function isActiveSpanTracer(value: unknown): value is ActiveSpanTracer {
	return (
		value !== null &&
		typeof value === 'object' &&
		typeof Reflect.get(value, 'startActiveSpan') === 'function'
	);
}

function stringifyTelemetryValue(value: unknown): string | undefined {
	try {
		return JSON.stringify(value);
	} catch {
		return undefined;
	}
}

function getToolInputSchema(tool: BuiltTool | BuiltProviderTool): unknown {
	if (!tool.inputSchema) {
		return undefined;
	}

	return isZodSchema(tool.inputSchema) ? zodToJsonSchema(tool.inputSchema) : tool.inputSchema;
}

function summarizeToolForTelemetry(tool: BuiltTool): Record<string, unknown> {
	return {
		name: tool.name,
		description: tool.description,
		type: tool.mcpTool ? 'mcp' : 'local',
		...(tool.mcpServerName ? { mcp_server: tool.mcpServerName } : {}),
		...(tool.suspendSchema || tool.resumeSchema || tool.approval ? { approval: true } : {}),
		...(tool.inputSchema ? { input_schema: getToolInputSchema(tool) } : {}),
	};
}

function summarizeProviderToolForTelemetry(tool: BuiltProviderTool): Record<string, unknown> {
	const [provider] = tool.name.split('.');
	return {
		name: tool.name,
		provider,
		type: 'provider',
		args: tool.args,
		...(tool.inputSchema ? { input_schema: getToolInputSchema(tool) } : {}),
	};
}

/** Generic (backend-agnostic) root-span input attributes: the gen_ai.prompt summary. */
function buildAgentRootInputAttributes(config: AgentRuntimeConfig): Record<string, AttributeValue> {
	const tools = buildAgentToolSummary(config);
	const serialized = stringifyTelemetryValue({
		agent: config.name,
		tool_count: tools.length,
		tools,
	});

	return serialized ? { 'gen_ai.prompt': serialized } : {};
}

function buildAgentToolSummary(config: AgentRuntimeConfig): Array<Record<string, unknown>> {
	const localTools = (config.tools ?? []).map(summarizeToolForTelemetry);
	const providerTools = (config.providerTools ?? []).map(summarizeProviderToolForTelemetry);
	return [...localTools, ...providerTools];
}

/** LangSmith-specific tool catalog attribute — only emitted for LangSmith telemetry. */
function buildLangSmithToolCatalogAttributes(
	config: AgentRuntimeConfig,
): Record<string, AttributeValue> {
	const toolNames = buildAgentToolSummary(config)
		.map((tool) => (typeof tool.name === 'string' ? tool.name : undefined))
		.filter((name): name is string => name !== undefined);

	return toolNames.length > 0 ? { 'langsmith.metadata.available_tools': toolNames } : {};
}

/**
 * Generic OTel GenAI semantic-convention attributes for the root
 * `invoke_agent` span, readable on any plain OTLP backend — not
 * LangSmith-specific.
 */
function buildGenAiRootAttributes(
	config: AgentRuntimeConfig,
	t: BuiltTelemetry,
): Record<string, AttributeValue> {
	const modelId = t.metadata?.model_id;
	const threadId = t.metadata?.thread_id;
	return {
		'gen_ai.operation.name': 'invoke_agent',
		'gen_ai.agent.name': config.name,
		...(typeof modelId === 'string' ? { 'gen_ai.request.model': modelId } : {}),
		...(typeof threadId === 'string' ? { 'gen_ai.conversation.id': threadId } : {}),
	};
}

/**
 * Owns all telemetry concerns for a single agent runtime: resolving the
 * effective telemetry config, mapping it to the AI SDK's
 * `experimental_telemetry` shape, building LangSmith/AI-SDK span attributes,
 * and wrapping the generate/stream loops and tool calls in active spans.
 *
 * Keeps provider-specific attribute formatting out of the core loop. Holds a
 * live reference to the runtime config so `setTelemetry()` mutations are seen.
 */
export class RuntimeTelemetry {
	constructor(private readonly config: AgentRuntimeConfig) {}

	/**
	 * Resolve telemetry: own config wins, then inherited from options, then nothing.
	 * Own telemetry without an explicit `functionId` is stamped with the runtime's
	 * name, so auxiliary calls scheduled off this runtime (e.g. memory tasks) can
	 * suffix under the same base instead of falling back to a generic label.
	 */
	resolve(options?: ExecutionOptions): BuiltTelemetry | undefined {
		const own = this.config.telemetry;
		if (own) {
			return own.functionId ? own : { ...own, functionId: this.config.name };
		}
		const inherited = options?.telemetry;
		if (!inherited) return undefined;
		return { ...inherited, functionId: this.config.name };
	}

	/** Best-effort flush of telemetry provider. Never throws. */
	async flush(options?: ExecutionOptions): Promise<void> {
		await Telemetry.forceFlush(this.resolve(options));
	}

	/** Map resolved telemetry to AI SDK's experimental_telemetry shape. */
	buildTelemetryOptions(options?: ExecutionOptions): {
		experimental_telemetry?: TelemetrySettings;
	} {
		return buildExperimentalTelemetry(this.resolve(options), {
			fallbackFunctionId: this.config.name,
		});
	}

	async withRootSpan<T>(
		operation: 'generate' | 'stream',
		options: ExecutionOptions | undefined,
		runId: string,
		fn: () => Promise<T>,
		links?: OpaqueSpanLink[],
	): Promise<T> {
		const t = this.resolve(options);
		if (!t?.enabled || t.runtimeRootSpanEnabled === false || !isActiveSpanTracer(t.tracer)) {
			return await fn();
		}

		const spanName = `${t.functionId ?? this.config.name}.${operation}`;
		return await t.tracer.startActiveSpan(
			spanName,
			{
				// Self-contained trace regardless of ambient context by default, so
				// a top-level agent run's span tree is identical no matter how it was
				// invoked. `rootAnchored: false` (set by `deriveSubAgentTelemetry` for
				// delegated sub-agent runs) omits `root` instead, so the span nests
				// under whatever OTel context is already active — the parent's
				// delegate-tool-call span, when run in-process inside it.
				...(t.rootAnchored === false ? {} : { root: true }),
				...(links?.length ? { links } : {}),
				attributes: this.buildTelemetryRootAttributes(t, spanName, runId),
			},
			async (span) => {
				try {
					return await fn();
				} catch (error) {
					span.recordException?.(error);
					span.setStatus?.({ code: 2, message: String(error) });
					throw error;
				} finally {
					span.end();
				}
			},
		);
	}

	async withToolSpan<T>(
		toolCallId: string,
		toolName: string,
		input: JSONValue,
		t: BuiltTelemetry | undefined,
		fn: () => Promise<T>,
	): Promise<T> {
		if (!t?.enabled || !isActiveSpanTracer(t.tracer)) {
			return await fn();
		}

		const shouldRecordInputs = t.recordInputs ?? true;
		const inputValue = shouldRecordInputs ? stringifyTelemetryValue(input) : undefined;

		return await t.tracer.startActiveSpan(
			// OTel GenAI semconv span-name convention: `execute_tool {tool name}`.
			`execute_tool ${toolName}`,
			{
				attributes: {
					...this.buildAiSdkOperationAttributes('ai.toolCall', t),
					'gen_ai.operation.name': 'execute_tool',
					'gen_ai.tool.name': toolName,
					'gen_ai.tool.call.id': toolCallId,
					'gen_ai.agent.name': this.config.name,
					'ai.toolCall.name': toolName,
					'ai.toolCall.id': toolCallId,
					...(inputValue !== undefined
						? { 'ai.toolCall.args': inputValue, 'gen_ai.tool.call.arguments': inputValue }
						: {}),
				},
			},
			async (span) => {
				try {
					const result = await fn();
					const shouldRecordOutputs = t.recordOutputs ?? true;
					const outputValue = shouldRecordOutputs ? stringifyTelemetryValue(result) : undefined;
					if (outputValue !== undefined) {
						span.setAttributes?.({
							'ai.toolCall.result': outputValue,
							'gen_ai.tool.call.result': outputValue,
						});
					}
					return result;
				} catch (error) {
					span.recordException?.(error);
					span.setStatus?.({ code: 2, message: String(error) });
					throw error;
				} finally {
					span.end();
				}
			},
		);
	}

	private buildTelemetryRootAttributes(
		t: BuiltTelemetry,
		spanName: string,
		runId: string,
	): Record<string, AttributeValue> {
		// Only tag spans with LangSmith-specific descriptors when the telemetry
		// was actually built for LangSmith — otherwise a plain OTLP backend would
		// see langsmith.* as the only descriptors on the span, which defeats the
		// point of the generic gen_ai.* attributes below.
		const isLangSmith = t.isLangSmith === true;
		const langSmithMetadataAttributes = this.buildTelemetryMetadataAttributes(
			t,
			'langsmith.metadata',
		);
		const genericMetadataAttributes = this.buildTelemetryMetadataAttributes(
			t,
			'ai.telemetry.metadata',
		);

		return {
			...buildGenAiRootAttributes(this.config, t),
			...(isLangSmith
				? {
						'langsmith.traceable': 'true',
						'langsmith.trace.name': spanName,
						'langsmith.span.kind': 'chain',
						'langsmith.metadata.agent_name': this.config.name,
						'langsmith.metadata.agent_run_id': runId,
						...langSmithMetadataAttributes,
						...buildLangSmithToolCatalogAttributes(this.config),
					}
				: {}),
			...genericMetadataAttributes,
			...buildAgentRootInputAttributes(this.config),
		};
	}

	private buildTelemetryMetadataAttributes(
		t: BuiltTelemetry,
		prefix: string,
	): Record<string, AttributeValue> {
		return Object.fromEntries(
			Object.entries(t.metadata ?? {}).map(([key, value]) => [`${prefix}.${key}`, value]),
		);
	}

	private buildAiSdkOperationAttributes(
		operationId: string,
		t: BuiltTelemetry,
	): Record<string, AttributeValue> {
		const functionId = t.functionId ?? this.config.name;
		return {
			'operation.name': `${operationId} ${functionId}`,
			'resource.name': functionId,
			'ai.operationId': operationId,
			'ai.telemetry.functionId': functionId,
			...this.buildTelemetryMetadataAttributes(t, 'ai.telemetry.metadata'),
		};
	}
}
