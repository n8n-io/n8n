import { redactOtlpTelemetrySpan, type OtlpSpanContent } from '../trace-payloads';

const SECRET = 'Bearer canaryTokenAbcdefghijklmnopqrstuvwxyz0123';

function llmSpan(): OtlpSpanContent {
	return {
		name: 'ai.streamText.doStream',
		attributes: {
			'ai.operationId': 'ai.streamText.doStream',
			'ai.model.id': 'claude-sonnet',
			'ai.prompt.messages': JSON.stringify([{ role: 'user', content: `use ${SECRET}` }]),
			'ai.response.text': `ok ${SECRET}`,
			'ai.response.msToFirstChunk': 120,
			'ai.usage.inputTokens': 10,
			'ai.usage.outputTokens': 5,
			'ai.telemetry.metadata.thread_id': 'thread-1',
			'ai.telemetry.metadata.user_id': 'user-1',
		},
		status: { code: 2, message: `failed with ${SECRET}` },
		events: [
			{
				name: 'exception',
				time: [0, 0],
				attributes: { 'exception.type': 'Error', 'exception.message': SECRET },
			},
		],
	};
}

describe('redactOtlpTelemetrySpan', () => {
	it('keeps only identifiers, model, token counts and timings by default', () => {
		const span = llmSpan();
		const redacted = redactOtlpTelemetrySpan(span, { includeContent: false });

		expect(redacted.attributes).toEqual({
			'ai.model.id': 'claude-sonnet',
			'ai.response.msToFirstChunk': 120,
			'ai.usage.inputTokens': 10,
			'ai.usage.outputTokens': 5,
			'ai.telemetry.metadata.thread_id': 'thread-1',
			'gen_ai.operation.name': 'chat',
			'gen_ai.usage.input_tokens': 10,
			'gen_ai.usage.output_tokens': 5,
			'gen_ai.usage.total_tokens': 15,
			'instance_ai.canonical_name': 'ai.streamText.doStream',
			'langsmith.metadata.instance_ai.canonical_name': 'ai.streamText.doStream',
		});
		expect(redacted.status).toEqual({ code: 2 });
		expect(redacted.events[0].attributes).toEqual({ 'exception.type': 'Error' });
		expect(span).toEqual(llmSpan());
	});

	it('keeps the source span name, not the tool display name, by default', () => {
		const toolSpan: OtlpSpanContent = {
			name: 'ai.toolCall',
			attributes: {
				'ai.operationId': 'ai.toolCall',
				'ai.toolCall.name': 'workspace',
				'ai.toolCall.args': JSON.stringify({ action: 'canary-plain-7f3a' }),
			},
			status: { code: 1 },
			events: [],
		};

		const redacted = redactOtlpTelemetrySpan(toolSpan, { includeContent: false });

		expect(redacted.name).toBe('ai.toolCall');
		expect(JSON.stringify(redacted)).not.toContain('canary-plain-7f3a');
		expect(redactOtlpTelemetrySpan(toolSpan, { includeContent: true }).name).toBe(
			'workspace[canary-plain-7f3a]',
		);
	});

	it('keeps scrubbed content with the content opt-in', () => {
		const redacted = redactOtlpTelemetrySpan(llmSpan(), { includeContent: true });

		expect(redacted.attributes['ai.prompt.messages']).toContain('use [REDACTED]');
		expect(redacted.status.message).toBe('failed with [REDACTED]');
		expect(JSON.stringify(redacted)).not.toContain('canaryToken');
	});
});
