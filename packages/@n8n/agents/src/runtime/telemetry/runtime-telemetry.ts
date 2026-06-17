import type { TelemetrySettings } from 'ai';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { Telemetry } from '../../sdk/telemetry';
import type { AttributeValue, BuiltProviderTool, BuiltTelemetry, BuiltTool } from '../../types';
import type { ExecutionOptions } from '../../types/sdk/agent';
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
		options: { attributes?: Record<string, AttributeValue> },
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

function buildAgentRootInputAttributes(config: AgentRuntimeConfig): Record<string, AttributeValue> {
	const localTools = (config.tools ?? []).map(summarizeToolForTelemetry);
	const providerTools = (config.providerTools ?? []).map(summarizeProviderToolForTelemetry);
	const tools = [...localTools, ...providerTools];
	const toolNames = tools
		.map((tool) => (typeof tool.name === 'string' ? tool.name : undefined))
		.filter((name): name is string => name !== undefined);

	const serialized = stringifyTelemetryValue({
		agent: config.name,
		tool_count: tools.length,
		tools,
	});

	return {
		...(toolNames.length > 0 ? { 'langsmith.metadata.available_tools': toolNames } : {}),
		...(serialized ? { 'gen_ai.prompt': serialized } : {}),
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

	/** Resolve telemetry: own config wins, then inherited from options, then nothing. */
	resolve(options?: ExecutionOptions): BuiltTelemetry | undefined {
		if (this.config.telemetry) return this.config.telemetry;
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
		const t = this.resolve(options);
		if (!t?.enabled) return {};

		return {
			experimental_telemetry: {
				isEnabled: true,
				functionId: t.functionId ?? this.config.name,
				metadata: t.metadata,
				recordInputs: t.recordInputs,
				recordOutputs: t.recordOutputs,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
				tracer: t.tracer as any,
				integrations: t.integrations.length > 0 ? t.integrations : undefined,
			},
		};
	}

	async withRootSpan<T>(
		operation: 'generate' | 'stream',
		options: ExecutionOptions | undefined,
		runId: string,
		fn: () => Promise<T>,
	): Promise<T> {
		const t = this.resolve(options);
		if (!t?.enabled || t.runtimeRootSpanEnabled === false || !isActiveSpanTracer(t.tracer)) {
			return await fn();
		}

		const spanName = `${t.functionId ?? this.config.name}.${operation}`;
		return await t.tracer.startActiveSpan(
			spanName,
			{ attributes: this.buildTelemetryRootAttributes(t, spanName, runId) },
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
			'ai.toolCall',
			{
				attributes: {
					...this.buildAiSdkOperationAttributes('ai.toolCall', t),
					'ai.toolCall.name': toolName,
					'ai.toolCall.id': toolCallId,
					...(inputValue !== undefined ? { 'ai.toolCall.args': inputValue } : {}),
				},
			},
			async (span) => {
				try {
					const result = await fn();
					const shouldRecordOutputs = t.recordOutputs ?? true;
					const outputValue = shouldRecordOutputs ? stringifyTelemetryValue(result) : undefined;
					if (outputValue !== undefined) {
						span.setAttributes?.({ 'ai.toolCall.result': outputValue });
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
		const metadataAttributes = this.buildTelemetryMetadataAttributes(t, 'langsmith.metadata');

		return {
			'langsmith.traceable': 'true',
			'langsmith.trace.name': spanName,
			'langsmith.span.kind': 'chain',
			'langsmith.metadata.agent_name': this.config.name,
			'langsmith.metadata.agent_run_id': runId,
			...metadataAttributes,
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
