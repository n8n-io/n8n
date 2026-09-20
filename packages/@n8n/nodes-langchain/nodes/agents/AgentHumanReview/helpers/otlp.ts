import { randomBytes } from 'node:crypto';

import type { AgentTrace, LlmCall, ToolCall } from './trace';

/*
 * Serialises an AgentTrace as an OTLP/HTTP JSON `ExportTraceServiceRequest`
 * (OpenTelemetry protocol, JSON encoding) using the GenAI semantic conventions,
 * so any OTLP receiver — the review service, Langfuse, Jaeger, a collector —
 * can ingest it. Built by hand: the shape is plain JSON and pulling the OTel
 * SDK into a node package just for this is not worth the weight.
 */

export interface OtlpIds {
	traceId: string;
	rootSpanId: string;
}

type AnyValue =
	| { stringValue: string }
	| { intValue: string }
	| { doubleValue: number }
	| { boolValue: boolean };

interface KeyValue {
	key: string;
	value: AnyValue;
}

interface OtlpEvent {
	timeUnixNano: string;
	name: string;
	attributes: KeyValue[];
}

interface OtlpSpan {
	traceId: string;
	spanId: string;
	parentSpanId?: string;
	name: string;
	kind: number;
	startTimeUnixNano: string;
	endTimeUnixNano: string;
	attributes: KeyValue[];
	events: OtlpEvent[];
	status: { code: number; message?: string };
}

export interface ExportTraceServiceRequest {
	resourceSpans: Array<{
		resource: { attributes: KeyValue[] };
		scopeSpans: Array<{
			scope: { name: string; version: string };
			spans: OtlpSpan[];
		}>;
	}>;
}

const SPAN_KIND_INTERNAL = 1;
const SPAN_KIND_CLIENT = 3;
const STATUS_OK = 1;
const STATUS_ERROR = 2;
const SCOPE = { name: 'n8n.agent-human-review', version: '1.0.0' };

export const newTraceId = () => randomBytes(16).toString('hex');
export const newSpanId = () => randomBytes(8).toString('hex');

/** OTLP wants nanoseconds since the epoch as a decimal string. */
const nanos = (iso: string) => `${BigInt(new Date(iso).getTime())}000000`;
const nanosPlus = (iso: string, ms: number) =>
	`${BigInt(new Date(iso).getTime() + Math.max(0, Math.round(ms)))}000000`;

function attr(key: string, value: unknown): KeyValue | undefined {
	if (value === undefined || value === null || value === '') return undefined;
	if (typeof value === 'boolean') return { key, value: { boolValue: value } };
	if (typeof value === 'number') {
		return Number.isInteger(value)
			? { key, value: { intValue: String(value) } }
			: { key, value: { doubleValue: value } };
	}
	if (typeof value === 'string') return { key, value: { stringValue: value } };
	return { key, value: { stringValue: JSON.stringify(value) } };
}

function attrs(pairs: Record<string, unknown>): KeyValue[] {
	return Object.entries(pairs)
		.map(([key, value]) => attr(key, value))
		.filter((kv): kv is KeyValue => kv !== undefined);
}

function llmSpan(call: LlmCall, ids: OtlpIds, recordContent: boolean): OtlpSpan {
	const events: OtlpEvent[] = [];
	if (recordContent) {
		for (const message of call.input) {
			events.push({
				timeUnixNano: nanos(call.startedAt),
				name: `gen_ai.${message.role === 'human' ? 'user' : message.role}.message`,
				attributes: attrs({ 'gen_ai.system': call.provider, content: message.content }),
			});
		}
		events.push({
			timeUnixNano: nanosPlus(call.startedAt, call.latencyMs),
			name: 'gen_ai.choice',
			attributes: attrs({
				'gen_ai.system': call.provider,
				index: 0,
				finish_reason: call.stopReason,
				message: JSON.stringify({ content: call.output, tool_calls: call.toolCallsRequested }),
			}),
		});
	}
	return {
		traceId: ids.traceId,
		spanId: newSpanId(),
		parentSpanId: ids.rootSpanId,
		name: `chat ${call.model}`,
		kind: SPAN_KIND_CLIENT,
		startTimeUnixNano: nanos(call.startedAt),
		endTimeUnixNano: nanosPlus(call.startedAt, call.latencyMs),
		attributes: attrs({
			'gen_ai.operation.name': 'chat',
			'gen_ai.system': call.provider,
			'gen_ai.request.model': call.model,
			'gen_ai.response.model': call.model,
			'gen_ai.response.finish_reasons': call.stopReason ? [call.stopReason] : undefined,
			'gen_ai.usage.input_tokens': call.usage.input,
			'gen_ai.usage.output_tokens': call.usage.output,
			'gen_ai.usage.cache_read_input_tokens': call.usage.cacheRead || undefined,
			'gen_ai.usage.cache_creation_input_tokens': call.usage.cacheWrite || undefined,
			'gen_ai.usage.cost.total_usd': call.cost?.total,
			'gen_ai.tool_calls.requested': call.toolCallsRequested.map((t) => t.name),
			'n8n.llm_call.index': call.index,
		}),
		events,
		status: call.error ? { code: STATUS_ERROR, message: call.error } : { code: STATUS_OK },
	};
}

function toolSpan(call: ToolCall, ids: OtlpIds, recordContent: boolean): OtlpSpan {
	return {
		traceId: ids.traceId,
		spanId: newSpanId(),
		parentSpanId: ids.rootSpanId,
		name: `execute_tool ${call.name}`,
		kind: SPAN_KIND_INTERNAL,
		startTimeUnixNano: nanos(call.startedAt),
		endTimeUnixNano: nanosPlus(call.startedAt, call.latencyMs),
		attributes: attrs({
			'gen_ai.operation.name': 'execute_tool',
			'gen_ai.tool.name': call.name,
			'gen_ai.tool.call.arguments': recordContent ? call.input : undefined,
			'gen_ai.tool.call.result': recordContent ? call.output : undefined,
			'n8n.tool_call.index': call.index,
		}),
		events: [],
		status: call.error ? { code: STATUS_ERROR, message: call.error } : { code: STATUS_OK },
	};
}

/**
 * One root `invoke_agent` span per round with a child span per model call and
 * per tool call. `correlation` carries the review-service identifiers so the
 * receiver can attach the spans to the round they belong to.
 */
export function toOtlp(
	trace: AgentTrace,
	ids: OtlpIds,
	correlation: { requestId?: string; threadId?: string; round?: number },
	options: { recordContent: boolean; serviceName: string },
): ExportTraceServiceRequest {
	const ctx = trace.context;
	const root: OtlpSpan = {
		traceId: ids.traceId,
		spanId: ids.rootSpanId,
		name: `invoke_agent ${String(ctx.nodeName ?? 'agent')}`,
		kind: SPAN_KIND_INTERNAL,
		startTimeUnixNano: nanos(trace.startedAt),
		endTimeUnixNano: nanos(trace.endedAt),
		attributes: attrs({
			'gen_ai.operation.name': 'invoke_agent',
			'gen_ai.agent.name': ctx.agentName ?? ctx.nodeName,
			'gen_ai.system': trace.model.provider,
			'gen_ai.request.model': trace.model.name,
			'gen_ai.request.temperature': trace.model.params.temperature,
			'gen_ai.request.max_tokens':
				trace.model.params.maxTokens ?? trace.model.params.maxTokensToSample,
			'gen_ai.usage.input_tokens': trace.usage.input,
			'gen_ai.usage.output_tokens': trace.usage.output,
			'gen_ai.usage.cache_read_input_tokens': trace.usage.cacheRead || undefined,
			'gen_ai.usage.cache_creation_input_tokens': trace.usage.cacheWrite || undefined,
			'gen_ai.usage.cost.total_usd': trace.cost?.total,
			'gen_ai.usage.cost.currency': trace.cost?.currency,
			'gen_ai.usage.cost.pricing_source': trace.cost?.pricing.source,
			'gen_ai.prompt': options.recordContent ? trace.prompt.input : undefined,
			'gen_ai.system_instructions': options.recordContent ? trace.prompt.systemMessage : undefined,
			'gen_ai.completion': options.recordContent
				? JSON.stringify(trace.llmCalls.at(-1)?.output ?? '')
				: undefined,
			'gen_ai.tools.available': trace.tools.available.map((t) => t.name),
			'gen_ai.memory.connected': trace.tools.memory.connected,
			'gen_ai.output_parser.connected': trace.tools.outputParser.connected,
			'n8n.execution.id': ctx.executionId,
			'n8n.execution.mode': ctx.executionMode,
			'n8n.workflow.id': ctx.workflowId,
			'n8n.workflow.name': ctx.workflowName,
			'n8n.node.id': ctx.nodeId,
			'n8n.node.name': ctx.nodeName,
			'n8n.node.type': ctx.nodeType,
			'n8n.instance.id': ctx.instanceId,
			'n8n.agent.max_iterations': ctx.maxIterations,
			'n8n.agent.llm_calls': trace.usage.llmCalls,
			'n8n.agent.tool_calls': trace.toolCalls.length,
			'n8n.agent.schema_version': trace.schemaVersion,
			'hitl.request_id': correlation.requestId,
			'hitl.thread_id': correlation.threadId ?? ctx.threadId,
			'hitl.round': correlation.round ?? ctx.round,
			'hitl.session_id': ctx.sessionId,
			'hitl.agent_id': ctx.agentId,
			'gen_ai.agent.id': ctx.agentId,
			'hitl.reviewer_feedback': options.recordContent ? ctx.reviewerFeedback : undefined,
			// Custom attributes ride along namespaced, like Langfuse metadata
			...Object.fromEntries(
				Object.entries((ctx.attributes as Record<string, unknown> | undefined) ?? {}).map(
					([k, v]) => [`hitl.attr.${k}`, v],
				),
			),
		}),
		events: trace.errors.map((e) => ({
			timeUnixNano: nanos(trace.endedAt),
			name: 'exception',
			attributes: attrs({ 'exception.type': e.stage, 'exception.message': e.message }),
		})),
		status: trace.errors.length
			? { code: STATUS_ERROR, message: trace.errors[0].message }
			: { code: STATUS_OK },
	};

	return {
		resourceSpans: [
			{
				resource: {
					attributes: attrs({
						'service.name': options.serviceName,
						'service.namespace': 'n8n',
						'n8n.instance.id': ctx.instanceId,
					}),
				},
				scopeSpans: [
					{
						scope: SCOPE,
						spans: [
							root,
							...trace.llmCalls.map((c) => llmSpan(c, ids, options.recordContent)),
							...trace.toolCalls.map((c) => toolSpan(c, ids, options.recordContent)),
						],
					},
				],
			},
		],
	};
}
