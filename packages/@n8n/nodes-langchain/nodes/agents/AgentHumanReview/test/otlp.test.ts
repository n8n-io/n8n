import { newSpanId, newTraceId, toOtlp } from '../helpers/otlp';
import type { AgentTrace } from '../helpers/trace';

const trace: AgentTrace = {
	schemaVersion: 2,
	startedAt: '2026-09-19T10:00:00.000Z',
	endedAt: '2026-09-19T10:00:03.500Z',
	latencyMs: 3500,
	model: { provider: 'anthropic', name: 'claude-sonnet-4-6', params: { maxTokens: 16384 } },
	prompt: { input: 'What is 17 times 23?', systemMessage: 'Be brief' },
	llmCalls: [
		{
			index: 0,
			model: 'claude-sonnet-4-6',
			provider: 'anthropic',
			startedAt: '2026-09-19T10:00:00.100Z',
			latencyMs: 2000,
			input: [
				{ role: 'system', content: 'Be brief' },
				{ role: 'human', content: 'What is 17 times 23?' },
			],
			output: '',
			toolCallsRequested: [{ name: 'Calculator', args: { input: '17 * 23' } }],
			stopReason: 'tool_use',
			usage: { input: 600, output: 50, cacheRead: 0, cacheWrite: 0, total: 650 },
			cost: { input: 0.0018, output: 0.00075, cache: 0, total: 0.00255, currency: 'USD' },
		},
	],
	toolCalls: [
		{
			index: 0,
			name: 'Calculator',
			input: '{"input":"17 * 23"}',
			output: '391',
			startedAt: '2026-09-19T10:00:02.150Z',
			latencyMs: 3,
		},
	],
	usage: { input: 600, output: 50, cacheRead: 0, cacheWrite: 0, total: 650, llmCalls: 1 },
	cost: {
		input: 0.0018,
		output: 0.00075,
		cache: 0,
		total: 0.00255,
		currency: 'USD',
		pricing: {
			source: 'builtin',
			model: 'claude-sonnet-4-6',
			ratesPer1M: { input: 3, output: 15 },
		},
	},
	tools: {
		available: [{ name: 'Calculator', description: 'math' }],
		memory: { connected: false },
		outputParser: { connected: false },
	},
	context: {
		executionId: '81',
		workflowId: 'wf-1',
		nodeName: 'AI Agent with Human Review',
		nodeId: 'a1',
		round: 0,
		agentId: 'support-assistant',
		agentName: 'Support Assistant',
		attributes: { team: 'support' },
	},
	errors: [],
};

const attr = (span: { attributes: Array<{ key: string; value: unknown }> }, key: string) =>
	span.attributes.find((a) => a.key === key)?.value;

describe('toOtlp', () => {
	const ids = { traceId: newTraceId(), rootSpanId: newSpanId() };
	const payload = toOtlp(
		trace,
		ids,
		{ requestId: 'req-1', threadId: 'thread-1', round: 0 },
		{ recordContent: true, serviceName: 'n8n' },
	);
	const spans = payload.resourceSpans[0].scopeSpans[0].spans;

	it('should generate W3C-sized ids', () => {
		expect(ids.traceId).toMatch(/^[0-9a-f]{32}$/);
		expect(ids.rootSpanId).toMatch(/^[0-9a-f]{16}$/);
	});

	it('should emit a root agent span with a child per LLM and tool call, all in one trace', () => {
		expect(spans).toHaveLength(3);
		expect(spans.map((s) => s.name)).toEqual([
			'invoke_agent AI Agent with Human Review',
			'chat claude-sonnet-4-6',
			'execute_tool Calculator',
		]);
		expect(spans.every((s) => s.traceId === ids.traceId)).toBe(true);
		expect(spans[0].parentSpanId).toBeUndefined();
		expect(spans[1].parentSpanId).toBe(ids.rootSpanId);
		expect(spans[2].parentSpanId).toBe(ids.rootSpanId);
	});

	it('should use nanosecond epoch strings for time', () => {
		expect(spans[0].startTimeUnixNano).toBe(`${Date.parse(trace.startedAt)}000000`);
		expect(spans[1].endTimeUnixNano).toBe(`${Date.parse('2026-09-19T10:00:02.100Z')}000000`);
	});

	it('should carry GenAI semantic-convention attributes and correlation ids', () => {
		expect(attr(spans[0], 'gen_ai.operation.name')).toEqual({ stringValue: 'invoke_agent' });
		expect(attr(spans[0], 'gen_ai.usage.input_tokens')).toEqual({ intValue: '600' });
		expect(attr(spans[0], 'gen_ai.usage.cost.total_usd')).toEqual({ doubleValue: 0.00255 });
		expect(attr(spans[0], 'hitl.request_id')).toEqual({ stringValue: 'req-1' });
		expect(attr(spans[0], 'hitl.attr.team')).toEqual({ stringValue: 'support' });
		expect(attr(spans[0], 'hitl.agent_id')).toEqual({ stringValue: 'support-assistant' });
		expect(attr(spans[0], 'gen_ai.agent.id')).toEqual({ stringValue: 'support-assistant' });
		expect(attr(spans[0], 'gen_ai.agent.name')).toEqual({ stringValue: 'Support Assistant' });
		expect(attr(spans[0], 'n8n.execution.id')).toEqual({ stringValue: '81' });
		expect(attr(spans[1], 'gen_ai.request.model')).toEqual({ stringValue: 'claude-sonnet-4-6' });
		expect(attr(spans[2], 'gen_ai.tool.name')).toEqual({ stringValue: 'Calculator' });
		expect(payload.resourceSpans[0].resource.attributes).toContainEqual({
			key: 'service.name',
			value: { stringValue: 'n8n' },
		});
	});

	it('should record prompts as message events and the answer as a choice event', () => {
		expect(spans[1].events.map((e) => e.name)).toEqual([
			'gen_ai.system.message',
			'gen_ai.user.message',
			'gen_ai.choice',
		]);
	});

	it('should drop content when recordContent is off', () => {
		const metricsOnly = toOtlp(
			trace,
			ids,
			{ requestId: 'req-1' },
			{ recordContent: false, serviceName: 'n8n' },
		);
		const s = metricsOnly.resourceSpans[0].scopeSpans[0].spans;
		expect(attr(s[0], 'gen_ai.prompt')).toBeUndefined();
		expect(s[1].events).toEqual([]);
		expect(attr(s[2], 'gen_ai.tool.call.arguments')).toBeUndefined();
		expect(attr(s[0], 'gen_ai.usage.input_tokens')).toEqual({ intValue: '600' });
	});

	it('should mark failed calls with an error status', () => {
		const failing: AgentTrace = {
			...trace,
			toolCalls: [{ ...trace.toolCalls[0], error: 'boom', output: '' }],
			errors: [{ stage: 'tool:Calculator', message: 'boom' }],
		};
		const s = toOtlp(failing, ids, {}, { recordContent: true, serviceName: 'n8n' }).resourceSpans[0]
			.scopeSpans[0].spans;
		expect(s[2].status).toEqual({ code: 2, message: 'boom' });
		expect(s[0].status.code).toBe(2);
		expect(s[0].events[0].name).toBe('exception');
	});
});
