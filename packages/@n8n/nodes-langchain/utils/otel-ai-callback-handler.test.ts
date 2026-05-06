import type { Serialized } from '@langchain/core/load/serializable';
import type { LLMResult } from '@langchain/core/outputs';
import { propagation, SpanStatusCode, trace } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import {
	BasicTracerProvider,
	InMemorySpanExporter,
	SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { OtelAiCallbackHandler } from './otel-ai-callback-handler';

describe('OtelAiCallbackHandler', () => {
	let provider: BasicTracerProvider;
	let exporter: InMemorySpanExporter;

	beforeAll(() => {
		exporter = new InMemorySpanExporter();
		provider = new BasicTracerProvider({
			spanProcessors: [new SimpleSpanProcessor(exporter)],
		});
		trace.setGlobalTracerProvider(provider);
		propagation.setGlobalPropagator(new W3CTraceContextPropagator());
	});

	afterEach(() => {
		exporter.reset();
	});

	afterAll(async () => {
		exporter.reset();
		await provider.shutdown();
		trace.disable();
		propagation.disable();
	});

	function makeLlmSerialized(id: string[] = ['langchain', 'chat_models', 'openai']): Serialized {
		return { lc: 1, type: 'constructor', id, kwargs: { model: 'gpt-4' } } as Serialized;
	}

	function makeToolSerialized(name: string = 'calculator'): Serialized {
		return { lc: 1, type: 'not_implemented', id: ['langchain', 'tools', name] } as Serialized;
	}

	function makeChainSerialized(type: string = 'AgentExecutor'): Serialized {
		return { lc: 1, type: 'not_implemented', id: ['langchain', 'chains', type] } as Serialized;
	}

	function makeRetrieverSerialized(type: string = 'pinecone'): Serialized {
		return {
			lc: 1,
			type: 'not_implemented',
			id: ['langchain', 'retrievers', type],
		} as Serialized;
	}

	describe('LLM spans', () => {
		it('should create and end an LLM span with correct attributes', async () => {
			const handler = new OtelAiCallbackHandler();

			await handler.handleLLMStart(
				makeLlmSerialized(),
				['Hello, how are you?'],
				'run-1',
				undefined,
				{ temperature: 0.7, max_tokens: 100 },
			);

			await handler.handleLLMEnd(
				{
					generations: [[{ text: 'I am fine', generationInfo: {} }]],
					llmOutput: { tokenUsage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 } },
				} as LLMResult,
				'run-1',
			);

			const spans = exporter.getFinishedSpans();
			expect(spans).toHaveLength(1);

			const span = spans[0];
			expect(span.name).toBe('ai.llm.call');
			expect(span.status.code).toBe(SpanStatusCode.OK);
			expect(span.attributes['gen_ai.system']).toBe('openai');
			expect(span.attributes['gen_ai.request.model']).toBe('gpt-4');
			expect(span.attributes['gen_ai.prompt.length']).toBe(19);
			expect(span.attributes['gen_ai.request.temperature']).toBe(0.7);
			expect(span.attributes['gen_ai.request.max_tokens']).toBe(100);
			expect(span.attributes['gen_ai.usage.input_tokens']).toBe(10);
			expect(span.attributes['gen_ai.usage.output_tokens']).toBe(5);
			expect(span.attributes['gen_ai.usage.total_tokens']).toBe(15);
		});

		it('should handle LLM error with error status and exception event', async () => {
			const handler = new OtelAiCallbackHandler();

			await handler.handleLLMStart(makeLlmSerialized(), ['test'], 'run-err');
			await handler.handleLLMError(new Error('Rate limit exceeded'), 'run-err');

			const spans = exporter.getFinishedSpans();
			expect(spans).toHaveLength(1);

			const span = spans[0];
			expect(span.name).toBe('ai.llm.call');
			expect(span.status.code).toBe(SpanStatusCode.ERROR);
			expect(span.status.message).toBe('Rate limit exceeded');

			const events = span.events;
			expect(events).toHaveLength(1);
			expect(events[0].name).toBe('exception');
			expect(events[0].attributes?.['exception.message']).toBe('Rate limit exceeded');
			expect(events[0].attributes?.['exception.type']).toBe('Error');
		});

		it('should handle LLM end without token usage gracefully', async () => {
			const handler = new OtelAiCallbackHandler();

			await handler.handleLLMStart(makeLlmSerialized(), ['test'], 'run-no-tokens');
			await handler.handleLLMEnd(
				{ generations: [[{ text: 'response', generationInfo: {} }]] } as LLMResult,
				'run-no-tokens',
			);

			const spans = exporter.getFinishedSpans();
			expect(spans).toHaveLength(1);
			expect(spans[0].status.code).toBe(SpanStatusCode.OK);
			expect(spans[0].attributes['gen_ai.usage.input_tokens']).toBeUndefined();
		});

		it('should extract model name from extraParams', async () => {
			const handler = new OtelAiCallbackHandler();
			const llm = {
				lc: 1,
				type: 'not_implemented',
				id: ['langchain', 'llms', 'base'],
			} as Serialized;

			await handler.handleLLMStart(llm, ['test'], 'run-model', undefined, {
				model: 'claude-3-opus',
			});
			await handler.handleLLMEnd(
				{ generations: [[{ text: 'ok', generationInfo: {} }]] } as LLMResult,
				'run-model',
			);

			const spans = exporter.getFinishedSpans();
			expect(spans[0].attributes['gen_ai.request.model']).toBe('claude-3-opus');
		});
	});

	describe('Tool spans', () => {
		it('should create and end a tool span with correct attributes', async () => {
			const handler = new OtelAiCallbackHandler();

			await handler.handleToolStart(
				makeToolSerialized('calculator'),
				'What is 2+2?',
				'tool-1',
				undefined,
				undefined,
				undefined,
				'calculator',
			);
			await handler.handleToolEnd('4', 'tool-1');

			const spans = exporter.getFinishedSpans();
			expect(spans).toHaveLength(1);

			const span = spans[0];
			expect(span.name).toBe('ai.tool.call');
			expect(span.status.code).toBe(SpanStatusCode.OK);
			expect(span.attributes['n8n.ai.tool.name']).toBe('calculator');
			expect(span.attributes['n8n.ai.tool.input.length']).toBe(12);
			expect(span.attributes['n8n.ai.tool.output.length']).toBe(1);
		});

		it('should use serialized id as fallback for tool name', async () => {
			const handler = new OtelAiCallbackHandler();

			await handler.handleToolStart(makeToolSerialized('web_search'), 'query', 'tool-2');
			await handler.handleToolEnd('results', 'tool-2');

			const spans = exporter.getFinishedSpans();
			expect(spans[0].attributes['n8n.ai.tool.name']).toBe('web_search');
		});

		it('should handle tool error', async () => {
			const handler = new OtelAiCallbackHandler();

			await handler.handleToolStart(makeToolSerialized(), 'input', 'tool-err');
			await handler.handleToolError(new Error('Tool failed'), 'tool-err');

			const spans = exporter.getFinishedSpans();
			expect(spans[0].status.code).toBe(SpanStatusCode.ERROR);
			expect(spans[0].status.message).toBe('Tool failed');
		});
	});

	describe('Chain spans', () => {
		it('should create and end a chain span', async () => {
			const handler = new OtelAiCallbackHandler();

			await handler.handleChainStart(makeChainSerialized('AgentExecutor'), {}, 'chain-1');
			await handler.handleChainEnd({ output: 'done' }, 'chain-1');

			const spans = exporter.getFinishedSpans();
			expect(spans).toHaveLength(1);

			const span = spans[0];
			expect(span.name).toBe('ai.chain.call');
			expect(span.status.code).toBe(SpanStatusCode.OK);
			expect(span.attributes['n8n.ai.chain.type']).toBe('AgentExecutor');
		});

		it('should handle chain error', async () => {
			const handler = new OtelAiCallbackHandler();

			await handler.handleChainStart(makeChainSerialized(), {}, 'chain-err');
			await handler.handleChainError(new Error('Chain broke'), 'chain-err');

			const spans = exporter.getFinishedSpans();
			expect(spans[0].status.code).toBe(SpanStatusCode.ERROR);
			expect(spans[0].status.message).toBe('Chain broke');
		});
	});

	describe('Retriever spans', () => {
		it('should create and end a retriever span with document count', async () => {
			const handler = new OtelAiCallbackHandler();

			await handler.handleRetrieverStart(
				makeRetrieverSerialized('pinecone'),
				'search query',
				'ret-1',
			);
			await handler.handleRetrieverEnd(
				[{ pageContent: 'doc1' }, { pageContent: 'doc2' }, { pageContent: 'doc3' }],
				'ret-1',
			);

			const spans = exporter.getFinishedSpans();
			expect(spans).toHaveLength(1);

			const span = spans[0];
			expect(span.name).toBe('ai.retriever.call');
			expect(span.status.code).toBe(SpanStatusCode.OK);
			expect(span.attributes['n8n.ai.retriever.type']).toBe('pinecone');
			expect(span.attributes['n8n.ai.retriever.query.length']).toBe(12);
			expect(span.attributes['n8n.ai.retriever.document_count']).toBe(3);
		});

		it('should handle retriever error', async () => {
			const handler = new OtelAiCallbackHandler();

			await handler.handleRetrieverStart(makeRetrieverSerialized(), 'query', 'ret-err');
			await handler.handleRetrieverError(new Error('Connection failed'), 'ret-err');

			const spans = exporter.getFinishedSpans();
			expect(spans[0].status.code).toBe(SpanStatusCode.ERROR);
		});
	});

	describe('Parent-child nesting', () => {
		it('should create all spans in a nested agent execution', async () => {
			const handler = new OtelAiCallbackHandler();

			// Simulate: chain -> llm -> tool -> llm (typical agent loop)
			await handler.handleChainStart(makeChainSerialized(), {}, 'chain-parent');
			await handler.handleLLMStart(makeLlmSerialized(), ['prompt'], 'llm-child', 'chain-parent');
			await handler.handleLLMEnd(
				{ generations: [[{ text: 'response', generationInfo: {} }]] } as LLMResult,
				'llm-child',
			);
			await handler.handleChainEnd({}, 'chain-parent');

			const spans = exporter.getFinishedSpans();
			expect(spans).toHaveLength(2);

			const llmSpan = spans.find((s) => s.name === 'ai.llm.call')!;
			const chainSpan = spans.find((s) => s.name === 'ai.chain.call')!;

			expect(llmSpan).toBeDefined();
			expect(chainSpan).toBeDefined();
		});

		it('should create spans for chain -> llm -> tool hierarchy', async () => {
			const handler = new OtelAiCallbackHandler();

			await handler.handleChainStart(makeChainSerialized(), {}, 'chain-1');
			await handler.handleLLMStart(makeLlmSerialized(), ['prompt'], 'llm-1', 'chain-1');
			await handler.handleToolStart(makeToolSerialized(), 'input', 'tool-1', 'llm-1');
			await handler.handleToolEnd('output', 'tool-1');
			await handler.handleLLMEnd(
				{ generations: [[{ text: 'done', generationInfo: {} }]] } as LLMResult,
				'llm-1',
			);
			await handler.handleChainEnd({}, 'chain-1');

			const spans = exporter.getFinishedSpans();
			expect(spans).toHaveLength(3);

			const toolSpan = spans.find((s) => s.name === 'ai.tool.call')!;
			const llmSpan = spans.find((s) => s.name === 'ai.llm.call')!;
			const chainSpan = spans.find((s) => s.name === 'ai.chain.call')!;

			expect(toolSpan).toBeDefined();
			expect(llmSpan).toBeDefined();
			expect(chainSpan).toBeDefined();

			// All spans should have valid span IDs (not be no-ops)
			expect(toolSpan.spanContext().spanId).toBeTruthy();
			expect(llmSpan.spanContext().spanId).toBeTruthy();
			expect(chainSpan.spanContext().spanId).toBeTruthy();
		});
	});

	describe('Edge cases', () => {
		it('should not throw when handleLLMEnd is called with unknown runId', async () => {
			const handler = new OtelAiCallbackHandler();
			await expect(
				handler.handleLLMEnd(
					{ generations: [[{ text: 'x', generationInfo: {} }]] } as LLMResult,
					'nonexistent',
				),
			).resolves.not.toThrow();
		});

		it('should not throw when handleToolEnd is called with unknown runId', async () => {
			const handler = new OtelAiCallbackHandler();
			await expect(handler.handleToolEnd('output', 'nonexistent')).resolves.not.toThrow();
		});

		it('should not throw when handleChainEnd is called with unknown runId', async () => {
			const handler = new OtelAiCallbackHandler();
			await expect(handler.handleChainEnd({}, 'nonexistent')).resolves.not.toThrow();
		});

		it('should handle non-Error objects in error handlers', async () => {
			const handler = new OtelAiCallbackHandler();

			await handler.handleLLMStart(makeLlmSerialized(), ['test'], 'run-obj-err');
			await handler.handleLLMError({ message: 'object error', code: 429 }, 'run-obj-err');

			const spans = exporter.getFinishedSpans();
			expect(spans[0].status.code).toBe(SpanStatusCode.ERROR);
			expect(spans[0].status.message).toBe('object error');
		});

		it('should accept a parent span in the constructor without errors', async () => {
			const tracer = trace.getTracer('test');
			const parentSpan = tracer.startSpan('node.execute');

			const handler = new OtelAiCallbackHandler(parentSpan);

			await handler.handleLLMStart(makeLlmSerialized(), ['test'], 'run-parent');
			await handler.handleLLMEnd(
				{ generations: [[{ text: 'ok', generationInfo: {} }]] } as LLMResult,
				'run-parent',
			);

			parentSpan.end();

			const spans = exporter.getFinishedSpans();
			const llmSpan = spans.find((s) => s.name === 'ai.llm.call')!;
			const nodeSpan = spans.find((s) => s.name === 'node.execute')!;

			// Both spans are created successfully
			expect(llmSpan).toBeDefined();
			expect(nodeSpan).toBeDefined();
			expect(llmSpan.status.code).toBe(SpanStatusCode.OK);
		});
	});
});
