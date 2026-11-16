import { LangSmithOTLPTraceExporter } from 'langsmith/experimental/otel/exporter';

import { redactLangSmithTelemetrySpan } from '../langsmith-tracing';

type ExportedSpan = { attributes: Record<string, unknown> };

/** Runs one span through the real LangSmith exporter with our transform and returns what it would send. */
async function exportThroughLangSmith(attributes: Record<string, unknown>): Promise<ExportedSpan> {
	const sent: ExportedSpan[] = [];
	// The LangSmith exporter hands the mapped spans to its OTLP parent; capture them there.
	const parentExporter = Object.getPrototypeOf(LangSmithOTLPTraceExporter.prototype) as {
		export: (spans: ExportedSpan[], done: (result: { code: number }) => void) => void;
	};
	const exportSpy = vi
		.spyOn(parentExporter, 'export')
		.mockImplementation((spans: ExportedSpan[], done: (result: { code: number }) => void) => {
			sent.push(...spans);
			done({ code: 0 });
		});
	const exporter = new LangSmithOTLPTraceExporter({
		apiKey: 'test-key',
		transformExportedSpan: (span) => redactLangSmithTelemetrySpan(span) as typeof span,
	});

	try {
		await new Promise<void>((resolve) => {
			const span = { name: 'ai.streamText.doStream', status: { code: 0 }, attributes };
			exporter.export([span as unknown as Parameters<typeof exporter.export>[0][number]], () =>
				resolve(),
			);
		});
	} finally {
		exportSpy.mockRestore();
	}
	return sent[0];
}

function llmStepAttributes(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		'ai.operationId': 'ai.streamText.doStream',
		'ai.usage.inputTokens': 1_000,
		'ai.usage.outputTokens': 1_607,
		'ai.response.text': 'Here is the plan.',
		...overrides,
	};
}

function readJson(value: unknown): unknown {
	expect(typeof value).toBe('string');
	return JSON.parse(String(value));
}

describe('LangSmith export of LLM step spans', () => {
	const originalTracing = process.env.LANGSMITH_TRACING;

	beforeAll(() => {
		process.env.LANGSMITH_TRACING = 'true';
	});

	afterAll(() => {
		if (originalTracing === undefined) delete process.env.LANGSMITH_TRACING;
		else process.env.LANGSMITH_TRACING = originalTracing;
	});

	it('reports reasoning tokens in the usage metadata', async () => {
		const span = await exportThroughLangSmith(
			llmStepAttributes({ 'ai.usage.outputTokenDetails.reasoningTokens': 666 }),
		);

		expect(readJson(span.attributes['langsmith.usage_metadata'])).toEqual(
			expect.objectContaining({ output_tokens: 1_607, output_token_details: { reasoning: 666 } }),
		);
	});

	it('omits output token details when the provider reports no reasoning tokens', async () => {
		const span = await exportThroughLangSmith(llmStepAttributes());

		expect(readJson(span.attributes['langsmith.usage_metadata'])).not.toHaveProperty(
			'output_token_details',
		);
	});

	it('keeps long reasoning text whole in the outputs next to the answer text', async () => {
		const reasoning = 'Check the budget limits first. '.repeat(100);

		const span = await exportThroughLangSmith(
			llmStepAttributes({ 'ai.response.reasoning': reasoning }),
		);

		expect(readJson(span.attributes['gen_ai.completion'])).toEqual({
			text: 'Here is the plan.',
			reasoning,
		});
	});

	it('keeps the tool calls as the output text of a tool-call step with reasoning', async () => {
		const toolCalls = JSON.stringify([{ toolName: 'workspace_execute_command', input: {} }]);

		const span = await exportThroughLangSmith(
			llmStepAttributes({
				'ai.response.toolCalls': toolCalls,
				'ai.response.reasoning': 'Run the script.',
			}),
		);

		expect(readJson(span.attributes['gen_ai.completion'])).toEqual({
			text: toolCalls,
			assistant_text: 'Here is the plan.',
			reasoning: 'Run the script.',
		});
	});

	it('keeps the visible text of a tool-call step next to the tool calls', async () => {
		const toolCalls = JSON.stringify([{ toolName: 'workspace_execute_command', input: {} }]);
		const visibleText = "I'll check which limits the saved drafts read. ".repeat(20);

		const span = await exportThroughLangSmith(
			llmStepAttributes({ 'ai.response.text': visibleText, 'ai.response.toolCalls': toolCalls }),
		);

		expect(readJson(span.attributes['gen_ai.completion'])).toEqual({
			text: toolCalls,
			assistant_text: visibleText,
		});
	});

	it('leaves the tool calls as the output text when a tool-call step has no visible text', async () => {
		const toolCalls = JSON.stringify([{ toolName: 'workspace_execute_command', input: {} }]);

		const span = await exportThroughLangSmith(
			llmStepAttributes({ 'ai.response.text': '', 'ai.response.toolCalls': toolCalls }),
		);

		expect(span.attributes['gen_ai.completion']).toBe(toolCalls);
	});

	it('leaves the output text unchanged when a step has no reasoning text', async () => {
		const span = await exportThroughLangSmith(llmStepAttributes());

		expect(span.attributes['gen_ai.completion']).toBe('Here is the plan.');
	});
});
