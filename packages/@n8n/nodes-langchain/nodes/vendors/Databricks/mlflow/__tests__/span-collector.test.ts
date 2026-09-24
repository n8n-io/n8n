import { CallbackManager } from '@langchain/core/callbacks/manager';
import { Document } from '@langchain/core/documents';
import type { Serialized } from '@langchain/core/load/serializable';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { LLMResult } from '@langchain/core/outputs';

import { MlflowSpanCollector } from '../span-collector';
import { MLFLOW_ATTRIBUTE } from '../types';
import type { MlflowSpan } from '../types';

function serialized(...id: string[]): Serialized {
	return { lc: 1, type: 'not_implemented', id } as Serialized;
}

const AGENT_EXECUTOR = serialized('langchain', 'agents', 'AgentExecutor');
const RUNNABLE = serialized('langchain_core', 'runnables', 'RunnableSequence');
const CHAT_MODEL = serialized('langchain', 'chat_models', 'ChatOpenAI');
const SEARCH_TOOL = serialized('langchain', 'tools', 'Calculator');

const RUN_METADATA = {
	execution_id: '1522',
	workflow: { id: 'NnRSpllYYU2NtmPT', name: 'trace check' },
	node: 'Databricks AI Agent',
};

function llmResult(llmOutput?: Record<string, unknown>, generationInfo?: Record<string, unknown>) {
	return {
		generations: [[{ text: 'the answer', generationInfo }]],
		llmOutput,
	} as LLMResult;
}

function inputsOf(span: MlflowSpan): unknown {
	return JSON.parse(span.attributes[MLFLOW_ATTRIBUTE.SpanInputs]);
}

function outputsOf(span: MlflowSpan): unknown {
	return JSON.parse(span.attributes[MLFLOW_ATTRIBUTE.SpanOutputs]);
}

function typeOf(span: MlflowSpan): unknown {
	return JSON.parse(span.attributes[MLFLOW_ATTRIBUTE.SpanType]);
}

/** Root agent chain, an inner plumbing chain, one model call and one tool call. */
function collectRun() {
	const collector = new MlflowSpanCollector();
	collector.handleChainStart(
		AGENT_EXECUTOR,
		{ input: 'hi', system_message: 'be helpful', formatting_instructions: 'noise', steps: [] },
		'root',
		undefined,
		[],
		RUN_METADATA,
		undefined,
		'[trace check] Databricks AI Agent',
	);
	collector.handleChainStart(RUNNABLE, {}, 'inner', 'root');
	collector.handleChatModelStart(CHAT_MODEL, [[new HumanMessage('hi')]], 'model', 'inner');
	collector.handleLLMEnd(
		llmResult({ tokenUsage: { promptTokens: 183, completionTokens: 67 } }),
		'model',
	);
	collector.handleToolStart(SEARCH_TOOL, '2+2', 'tool', 'inner');
	collector.handleToolEnd('4', 'tool');
	collector.handleChainEnd({ input: 'hi', output: 'it is 4' }, 'root');
	return collector;
}

describe('MlflowSpanCollector', () => {
	describe('filtering', () => {
		it('keeps only the agent, model and tool steps', () => {
			const trace = collectRun().finish()!;

			expect(trace.spans.map((span) => [typeOf(span), span.name])).toEqual([
				['AGENT', '[trace check] Databricks AI Agent'],
				['CHAT_MODEL', 'ChatOpenAI'],
				['TOOL', 'Calculator'],
			]);
		});

		it('re-parents kept spans past the dropped chain to the agent', () => {
			const trace = collectRun().finish()!;
			const [root, model, tool] = trace.spans;

			expect(root.parent_span_id).toBeUndefined();
			expect(root.span_id).toBe(trace.rootSpanId);
			expect(model.parent_span_id).toBe(root.span_id);
			expect(tool.parent_span_id).toBe(root.span_id);
		});

		it('nests through several dropped chains', () => {
			const collector = new MlflowSpanCollector();
			collector.handleChainStart(AGENT_EXECUTOR, {}, 'root', undefined);
			collector.handleChainStart(RUNNABLE, {}, 'a', 'root');
			collector.handleToolStart(SEARCH_TOOL, 'x', 'outerTool', 'a');
			collector.handleChainStart(RUNNABLE, {}, 'b', 'outerTool');
			collector.handleChatModelStart(CHAT_MODEL, [[]], 'nestedModel', 'b');

			const trace = collector.finish()!;
			const tool = trace.spans.find((s) => typeOf(s) === 'TOOL')!;
			const model = trace.spans.find((s) => typeOf(s) === 'CHAT_MODEL')!;

			expect(tool.parent_span_id).toBe(trace.rootSpanId);
			expect(model.parent_span_id).toBe(tool.span_id);
		});

		it('drops the uninteresting agent invoke keys', () => {
			const trace = collectRun().finish()!;

			expect(inputsOf(trace.spans[0])).toEqual({ input: 'hi', system_message: 'be helpful' });
		});

		it('ignores a second parentless chain rather than starting a new root', () => {
			const collector = new MlflowSpanCollector();
			collector.handleChainStart(AGENT_EXECUTOR, {}, 'root', undefined);
			collector.handleChainStart(AGENT_EXECUTOR, {}, 'other', undefined);

			expect(collector.finish()!.spans).toHaveLength(1);
		});
	});

	describe('MLflow shape', () => {
		// MLflow rejects the wrong encoding per field: `TraceInfo.trace_id` must be
		// `tr-<hex>` ("was not a valid trace ID" otherwise), while span ids inside the
		// uploaded span data are base64 of the raw bytes.
		it('uses the tr-hex form for the trace and base64 for span ids', () => {
			const trace = collectRun().finish()!;
			const [root] = trace.spans;

			expect(trace.traceId).toMatch(/^tr-[0-9a-f]{32}$/);
			// 16 raw bytes base64-encode to 24 chars, 8 bytes to 12.
			expect(root.trace_id).toHaveLength(24);
			expect(root.trace_id).not.toBe(trace.traceId);
			expect(root.span_id).toHaveLength(12);
		});

		it('gives every span the same base64 trace id', () => {
			const spans = collectRun().finish()!.spans;

			expect(new Set(spans.map((span) => span.trace_id)).size).toBe(1);
		});

		it('emits nanosecond times', () => {
			const [root] = collectRun().finish()!.spans;

			expect(root.start_time_unix_nano).toMatch(/^\d+000000$/);
			expect(Number(root.end_time_unix_nano)).toBeGreaterThanOrEqual(
				Number(root.start_time_unix_nano),
			);
		});

		it('carries the span type and the client-facing trace id as attributes', () => {
			const trace = collectRun().finish()!;
			const [root] = trace.spans;

			expect(root.attributes[MLFLOW_ATTRIBUTE.SpanType]).toBe('"AGENT"');
			expect(JSON.parse(root.attributes[MLFLOW_ATTRIBUTE.TraceRequestId])).toBe(trace.traceId);
		});

		it('picks up the TraceInfo fields from run metadata', () => {
			const trace = collectRun().finish()!;

			expect(trace.executionId).toBe('1522');
			expect(trace.workflowId).toBe('NnRSpllYYU2NtmPT');
			expect(trace.nodeName).toBe('Databricks AI Agent');
		});
	});

	describe('token usage', () => {
		it.each([
			[
				'camelCase llmOutput.tokenUsage',
				{ tokenUsage: { promptTokens: 50, completionTokens: 100 } },
				150,
			],
			['snake_case llmOutput.usage', { usage: { input_tokens: 7, output_tokens: 3 } }, 10],
		])('reads %s', (_label, llmOutput, total) => {
			const collector = new MlflowSpanCollector();
			collector.handleChainStart(AGENT_EXECUTOR, {}, 'root', undefined);
			collector.handleChatModelStart(CHAT_MODEL, [[]], 'model', 'root');
			collector.handleLLMEnd(llmResult(llmOutput), 'model');

			expect(collector.finish()!.spans[1].tokenUsage?.totalTokens).toBe(total);
		});

		it('falls back to per-generation usage', () => {
			const collector = new MlflowSpanCollector();
			collector.handleChainStart(AGENT_EXECUTOR, {}, 'root', undefined);
			collector.handleChatModelStart(CHAT_MODEL, [[]], 'model', 'root');
			collector.handleLLMEnd(
				llmResult(undefined, { usage: { prompt_tokens: 2, completion_tokens: 5 } }),
				'model',
			);

			expect(collector.finish()!.spans[1].tokenUsage).toEqual({
				inputTokens: 2,
				outputTokens: 5,
				totalTokens: 7,
			});
		});

		it('leaves usage unset when the provider reports none, rather than zero', () => {
			const collector = new MlflowSpanCollector();
			collector.handleChainStart(AGENT_EXECUTOR, {}, 'root', undefined);
			collector.handleChatModelStart(CHAT_MODEL, [[]], 'model', 'root');
			collector.handleLLMEnd(llmResult({ other: true }), 'model');

			expect(collector.finish()!.spans[1].tokenUsage).toBeUndefined();
		});

		it('keeps the real Databricks counts from a live run', () => {
			const trace = collectRun().finish()!;

			expect(trace.spans[1].tokenUsage).toEqual({
				inputTokens: 183,
				outputTokens: 67,
				totalTokens: 250,
			});
		});
	});

	describe('errors', () => {
		it.each([
			['tool', (c: MlflowSpanCollector, e: Error) => c.handleToolError(e, 'tool')],
			['model', (c: MlflowSpanCollector, e: Error) => c.handleLLMError(e, 'tool')],
		])('marks a failed %s span and the trace as ERROR', (_label, fail) => {
			const collector = new MlflowSpanCollector();
			collector.handleChainStart(AGENT_EXECUTOR, {}, 'root', undefined);
			collector.handleToolStart(SEARCH_TOOL, 'x', 'tool', 'root');

			fail(collector, new Error('it broke'));

			const trace = collector.finish()!;
			expect(trace.spans[1].status).toEqual({ code: 'ERROR', message: 'it broke' });
			expect(trace.state).toBe('ERROR');
		});

		it('reports a successful run as OK', () => {
			expect(collectRun().finish()!.state).toBe('OK');
		});

		it('scrubs credential material and URL queries from error text', () => {
			const collector = new MlflowSpanCollector();
			collector.handleChainStart(AGENT_EXECUTOR, {}, 'root', undefined);
			collector.handleChatModelStart(CHAT_MODEL, [[]], 'model', 'root');

			collector.handleLLMError(
				new Error(
					'GET https://adb-1.azuredatabricks.net/api?token=dapi0123456789abcdef failed: Bearer dapi0123456789abcdef',
				),
				'model',
			);

			const message = collector.finish()!.spans[1].status.message!;
			expect(message).not.toContain('dapi0123456789abcdef');
			expect(message).toContain('https://adb-1.azuredatabricks.net/api');
		});

		it('handles a thrown non-Error value', () => {
			const collector = new MlflowSpanCollector();
			collector.handleChainStart(AGENT_EXECUTOR, {}, 'root', undefined);
			collector.handleToolStart(SEARCH_TOOL, 'x', 'tool', 'root');

			collector.handleToolError('plain string' as unknown as Error, 'tool');

			expect(collector.finish()!.spans[1].status.message).toBe('plain string');
		});
	});

	describe('content handling', () => {
		it('exports prompts and tool results unchanged, which is the point of the feature', () => {
			const trace = collectRun().finish()!;
			const tool = trace.spans[2];

			expect(inputsOf(tool)).toBe('2+2');
			expect(outputsOf(tool)).toBe('4');
		});

		it('keeps deeply nested message content instead of truncating it', () => {
			const deep = { a: { b: { c: { d: { e: { f: { g: { h: 'survives' } } } } } } } };
			const collector = new MlflowSpanCollector();
			collector.handleChainStart(AGENT_EXECUTOR, {}, 'root', undefined);
			collector.handleToolStart(SEARCH_TOOL, 'x', 'tool', 'root');
			collector.handleToolEnd(deep, 'tool');

			expect(collector.finish()!.spans[1].attributes[MLFLOW_ATTRIBUTE.SpanOutputs]).toContain(
				'survives',
			);
		});

		// MLflow parses these attributes as JSON. Cutting the serialized text left a
		// half-finished string, and MLflow then rendered the raw text instead of the
		// transcript - which is what a 162k-char tool result looked like in practice.
		it('keeps an oversized payload valid JSON', () => {
			const collector = new MlflowSpanCollector();
			collector.handleChainStart(AGENT_EXECUTOR, {}, 'root', undefined);
			collector.handleToolStart(SEARCH_TOOL, 'x', 'tool', 'root');
			collector.handleToolEnd({ report: 'lorem ipsum '.repeat(20_000) }, 'tool');

			const outputs = collector.finish()!.spans[1].attributes[MLFLOW_ATTRIBUTE.SpanOutputs];
			expect(outputs.length).toBeLessThanOrEqual(100_000);
			const parsed = JSON.parse(outputs);
			expect(parsed.report).toContain('[truncated 240000 chars]');
		});

		it('leaves a payload that already fits untouched', () => {
			const collector = new MlflowSpanCollector();
			collector.handleChainStart(AGENT_EXECUTOR, {}, 'root', undefined);
			collector.handleToolStart(SEARCH_TOOL, 'x', 'tool', 'root');
			collector.handleToolEnd({ id: 7, body: 'y'.repeat(50_000), ok: true }, 'tool');

			const parsed = JSON.parse(
				collector.finish()!.spans[1].attributes[MLFLOW_ATTRIBUTE.SpanOutputs],
			);
			expect(parsed.body).toHaveLength(50_000);
		});

		it('keeps the structure around a shortened string', () => {
			const collector = new MlflowSpanCollector();
			collector.handleChainStart(AGENT_EXECUTOR, {}, 'root', undefined);
			collector.handleToolStart(SEARCH_TOOL, 'x', 'tool', 'root');
			collector.handleToolEnd({ id: 7, body: 'y'.repeat(150_000), ok: true }, 'tool');

			const parsed = JSON.parse(
				collector.finish()!.spans[1].attributes[MLFLOW_ATTRIBUTE.SpanOutputs],
			);
			expect(parsed.id).toBe(7);
			expect(parsed.ok).toBe(true);
			expect(parsed.body).toBe(`${'y'.repeat(4_000)}…[truncated 150000 chars]`);
		});

		it('replaces a payload that is still too big with a parseable note', () => {
			const many = Array.from({ length: 60_000 }, (_, i) => `item-${i}`);
			const collector = new MlflowSpanCollector();
			collector.handleChainStart(AGENT_EXECUTOR, {}, 'root', undefined);
			collector.handleToolStart(SEARCH_TOOL, 'x', 'tool', 'root');
			collector.handleToolEnd(many, 'tool');

			const parsed = JSON.parse(
				collector.finish()!.spans[1].attributes[MLFLOW_ATTRIBUTE.SpanOutputs],
			);
			expect(parsed).toEqual({ truncated: true, original_size_chars: expect.any(Number) });
		});

		it('survives a circular payload', () => {
			const cyclic: Record<string, unknown> = { name: 'loop' };
			cyclic.self = cyclic;

			const collector = new MlflowSpanCollector();
			collector.handleChainStart(AGENT_EXECUTOR, {}, 'root', undefined);
			collector.handleToolStart(SEARCH_TOOL, 'x', 'tool', 'root');

			expect(() => collector.handleToolEnd(cyclic, 'tool')).not.toThrow();
			expect(collector.finish()!.spans[1].attributes[MLFLOW_ATTRIBUTE.SpanOutputs]).toContain(
				'circular',
			);
		});

		it('records retriever documents', () => {
			const collector = new MlflowSpanCollector();
			collector.handleChainStart(AGENT_EXECUTOR, {}, 'root', undefined);
			collector.handleRetrieverStart(serialized('VectorStore'), 'pto policy', 'r', 'root');
			collector.handleRetrieverEnd([new Document({ pageContent: 'you get 25 days' })], 'r');

			const span = collector.finish()!.spans[1];
			expect(typeOf(span)).toBe('RETRIEVER');
			expect(span.attributes[MLFLOW_ATTRIBUTE.SpanOutputs]).toContain('you get 25 days');
		});
	});

	describe('robustness', () => {
		it('returns no trace when the agent never started', () => {
			const collector = new MlflowSpanCollector();
			collector.handleToolStart(SEARCH_TOOL, 'x', 'orphan', undefined);

			expect(collector.finish()).toBeUndefined();
		});

		it('ignores an end event for a run it never saw start', () => {
			const collector = collectRun();

			expect(() => collector.handleToolEnd('late', 'unknown')).not.toThrow();
			expect(collector.finish()!.spans).toHaveLength(3);
		});

		it('closes spans left open by a cancelled run', () => {
			const collector = new MlflowSpanCollector();
			collector.handleChainStart(AGENT_EXECUTOR, {}, 'root', undefined);
			collector.handleToolStart(SEARCH_TOOL, 'x', 'tool', 'root');

			const trace = collector.finish()!;

			expect(trace.endTimeMs).toBeGreaterThanOrEqual(trace.startTimeMs);
			for (const span of trace.spans) {
				expect(Number(span.end_time_unix_nano)).toBeGreaterThanOrEqual(
					Number(span.start_time_unix_nano),
				);
			}
		});
	});

	// LangChain's `.d.ts` puts `parentRunId` eighth on `handleChainStart` while the
	// callback manager passes it fourth. Both are `string | undefined`, so only a
	// run through the real manager catches an upgrade that changes the order.
	describe('against the real CallbackManager', () => {
		it('receives parentRunId where the manager actually passes it', async () => {
			const collector = new MlflowSpanCollector();
			const manager = CallbackManager.configure([collector])!;

			const chainRun = await manager.handleChainStart(AGENT_EXECUTOR, { input: 'hi' }, 'root');
			const [modelRun] = await chainRun
				.getChild()
				.handleChatModelStart(CHAT_MODEL, [[new HumanMessage('hi')]], 'model');
			await modelRun.handleLLMEnd(
				llmResult({ tokenUsage: { promptTokens: 1, completionTokens: 2 } }),
			);
			await chainRun.handleChainEnd({ output: 'done' });

			const trace = collector.finish()!;
			const [root, model] = trace.spans;

			expect(typeOf(root)).toBe('AGENT');
			expect(root.parent_span_id).toBeUndefined();
			expect(model.parent_span_id).toBe(root.span_id);
			expect(model.tokenUsage?.totalTokens).toBe(3);
		});
	});
});

describe('MlflowSpanCollector nanosecond integrity', () => {
	it('emits integer nanosecond strings for spans closed by finish()', () => {
		const collector = new MlflowSpanCollector();
		collector.handleChainStart(AGENT_EXECUTOR, {}, 'root', undefined);
		collector.handleToolStart(SEARCH_TOOL, 'x', 'tool', 'root');

		for (const span of collector.finish()!.spans) {
			expect(span.start_time_unix_nano).toMatch(/^\d+$/);
			expect(span.end_time_unix_nano).toMatch(/^\d+$/);
		}
	});
});

// The MLflow UI reads token counts from `mlflow.chat.tokenUsage` and decides how
// to render messages from `mlflow.message.format`. A bare field on the span
// object is ignored, so these keys are what make the data visible.
describe('MlflowSpanCollector MLflow chat conventions', () => {
	it('writes token usage as the attribute MLflow reads', () => {
		const model = collectRun().finish()!.spans[1];

		expect(JSON.parse(model.attributes[MLFLOW_ATTRIBUTE.TokenUsage])).toEqual({
			input_tokens: 183,
			output_tokens: 67,
			total_tokens: 250,
		});
	});

	it('marks only model spans with the message format', () => {
		const [agent, model, tool] = collectRun().finish()!.spans;

		expect(model.attributes[MLFLOW_ATTRIBUTE.MessageFormat]).toBe('openai');
		expect(agent.attributes[MLFLOW_ATTRIBUTE.MessageFormat]).toBeUndefined();
		expect(tool.attributes[MLFLOW_ATTRIBUTE.MessageFormat]).toBeUndefined();
	});

	it('reports prompts as OpenAI roles rather than LangChain objects', () => {
		const collector = new MlflowSpanCollector();
		collector.handleChainStart(AGENT_EXECUTOR, {}, 'root', undefined);
		collector.handleChatModelStart(
			CHAT_MODEL,
			[[new SystemMessage('be helpful'), new HumanMessage('hi')]],
			'model',
			'root',
		);

		expect(inputsOf(collector.finish()!.spans[1])).toEqual({
			messages: [
				{ role: 'system', content: 'be helpful' },
				{ role: 'user', content: 'hi' },
			],
		});
	});

	it('reports the completion, its tool calls and the finish reason', () => {
		const collector = new MlflowSpanCollector();
		collector.handleChainStart(AGENT_EXECUTOR, {}, 'root', undefined);
		collector.handleChatModelStart(CHAT_MODEL, [[]], 'model', 'root');
		collector.handleLLMEnd(
			{
				generations: [
					[
						{
							text: '',
							message: new AIMessage({
								content: '',
								tool_calls: [{ name: 'Calculator', args: { input: '2+2' }, id: 'call_1' }],
							}),
							generationInfo: { finish_reason: 'tool_calls' },
						},
					],
				],
			} as unknown as LLMResult,
			'model',
		);

		expect(outputsOf(collector.finish()!.spans[1])).toEqual({
			choices: [
				{
					message: {
						role: 'assistant',
						content: '',
						tool_calls: [
							{
								id: 'call_1',
								type: 'function',
								function: { name: 'Calculator', arguments: '{"input":"2+2"}' },
							},
						],
					},
					finish_reason: 'tool_calls',
				},
			],
		});
	});

	it('keeps reasoning content blocks intact', () => {
		const blocks = [
			{ type: 'reasoning', summary: [{ type: 'summary_text', text: 'thinking' }] },
			{ type: 'text', text: 'the answer' },
		];
		const collector = new MlflowSpanCollector();
		collector.handleChainStart(AGENT_EXECUTOR, {}, 'root', undefined);
		collector.handleChatModelStart(CHAT_MODEL, [[]], 'model', 'root');
		collector.handleLLMEnd(
			{
				generations: [[{ text: '', message: new AIMessage({ content: blocks }) }]],
			} as unknown as LLMResult,
			'model',
		);

		expect(JSON.stringify(outputsOf(collector.finish()!.spans[1]))).toContain('thinking');
	});
});

// The executor returns its inputs alongside the answer, so without this the
// Outputs panel repeats the Inputs and `response_preview` shows the question.
describe('MlflowSpanCollector agent output', () => {
	it('drops the echoed inputs from the agent outputs', () => {
		const agent = collectRun().finish()!.spans[0];

		expect(outputsOf(agent)).toEqual({ output: 'it is 4' });
	});

	it('exposes the question and the answer as plain-text previews', () => {
		const trace = collectRun().finish()!;

		expect(trace.requestPreview).toBe('hi');
		expect(trace.responsePreview).toBe('it is 4');
	});

	it('leaves the previews unset when the run never finished', () => {
		const collector = new MlflowSpanCollector();
		collector.handleChainStart(AGENT_EXECUTOR, {}, 'root', undefined);

		const trace = collector.finish()!;
		expect(trace.requestPreview).toBeUndefined();
		expect(trace.responsePreview).toBeUndefined();
	});
});
