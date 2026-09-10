import { trace } from '@opentelemetry/api';
import * as aiModule from 'ai';
import type { Mock } from 'vitest';

import { OtelTestProvider } from './support/otel-test-provider';
import type { BuiltTelemetry } from '../../types/telemetry';
import { AgentRuntime } from '../loop/agent-runtime';
import { InMemoryMemory } from '../memory/memory-store';
import { AgentEventBus } from '../state/event-bus';

vi.mock('@ai-sdk/openai', () => ({
	createOpenAI: () =>
		Object.assign(() => ({ provider: 'openai', modelId: 'mock', specificationVersion: 'v3' }), {
			embeddingModel: () => ({ provider: 'openai', modelId: 'mock', specificationVersion: 'v2' }),
		}),
}));

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type AiImport = typeof import('ai');

vi.mock('ai', async () => {
	const actual = await vi.importActual<AiImport>('ai');
	return { ...actual, generateText: vi.fn(), streamText: vi.fn() };
});

const { generateText, streamText } = aiModule as unknown as {
	generateText: Mock;
	streamText: Mock;
};

const TEST_TRACER_NAME = 'agent-runtime-memory-otel-test';

function makeGenerateSuccess(text = 'OK') {
	return {
		finishReason: 'stop',
		usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
		response: { messages: [{ role: 'assistant', content: [{ type: 'text', text }] }] },
		toolCalls: [],
	};
}

function* makeChunkStream(
	chunks: Array<Record<string, unknown>>,
): Generator<Record<string, unknown>> {
	for (const c of chunks) {
		yield c;
	}
}

function makeStreamSuccess(text = 'OK') {
	return {
		stream: makeChunkStream([{ type: 'text-delta', id: 'text-1', text }]),
		finishReason: Promise.resolve('stop'),
		usage: Promise.resolve({ inputTokens: 10, outputTokens: 5, totalTokens: 15 }),
		response: Promise.resolve({
			messages: [{ role: 'assistant', content: [{ type: 'text', text }] }],
		}),
		toolCalls: Promise.resolve([]),
	};
}

async function drain(stream: ReadableStream<unknown>): Promise<void> {
	const reader = stream.getReader();
	while (true) {
		const { done } = await reader.read();
		if (done) break;
	}
}

function builtTelemetry(): BuiltTelemetry {
	return {
		enabled: true,
		recordInputs: true,
		recordOutputs: true,
		integrations: [],
		tracer: trace.getTracer(TEST_TRACER_NAME),
	};
}

// Deliberately does not mock '@opentelemetry/api': proves that memory spans
// created while building the message list (history load, eager input
// persist) nest under the run's `*.generate`/`*.stream` root span, exactly
// like tool spans do.
describe('AgentRuntime — memory span nesting under the root span (real OTel provider)', () => {
	it('nests query_memory (history load) and save_memory (eager input persist) under the generate root span', async () => {
		const otel = OtelTestProvider.create();
		try {
			generateText.mockResolvedValue(makeGenerateSuccess());
			const memory = new InMemoryMemory();
			const runtime = new AgentRuntime({
				name: 'memory-otel-agent',
				model: 'openai/gpt-4o-mini',
				instructions: 'You are a test assistant.',
				eventBus: new AgentEventBus(),
				memory,
				telemetry: builtTelemetry(),
			});

			await runtime.generate('hello', { persistence: { threadId: 't1', resourceId: 'u1' } });

			const spans = otel.getFinishedSpans();
			const rootSpan = spans.find((span) => span.name === 'memory-otel-agent.generate');
			const queryMemorySpan = spans.find((span) => span.name === 'query_memory');
			const saveMemorySpan = spans.find((span) => span.name === 'save_memory');

			expect(rootSpan).toBeDefined();
			expect(queryMemorySpan).toBeDefined();
			expect(queryMemorySpan?.parentSpanContext?.spanId).toBe(rootSpan?.spanContext().spanId);
			expect(queryMemorySpan?.spanContext().traceId).toBe(rootSpan?.spanContext().traceId);
			expect(saveMemorySpan).toBeDefined();
			expect(saveMemorySpan?.parentSpanContext?.spanId).toBe(rootSpan?.spanContext().spanId);
			expect(saveMemorySpan?.spanContext().traceId).toBe(rootSpan?.spanContext().traceId);
		} finally {
			await otel.shutdown();
		}
	});

	it('nests query_memory (history load) and save_memory (eager input persist) under the stream root span', async () => {
		const otel = OtelTestProvider.create();
		try {
			streamText.mockReturnValue(makeStreamSuccess());
			const memory = new InMemoryMemory();
			const runtime = new AgentRuntime({
				name: 'memory-otel-stream-agent',
				model: 'openai/gpt-4o-mini',
				instructions: 'You are a test assistant.',
				eventBus: new AgentEventBus(),
				memory,
				telemetry: builtTelemetry(),
			});

			const { stream } = await runtime.stream('hello', {
				persistence: { threadId: 't1', resourceId: 'u1' },
			});
			await drain(stream);

			// The consumer-visible stream closes mid-loop (inside `StreamSink.finishComplete`),
			// before the loop's promise settles and the root span's `finally` runs `span.end()` —
			// so draining the stream doesn't guarantee the root span has finished exporting yet.
			const spans = await vi.waitFor(() => {
				const finished = otel.getFinishedSpans();
				const rootSpan = finished.find((span) => span.name === 'memory-otel-stream-agent.stream');
				expect(rootSpan).toBeDefined();
				return finished;
			});
			const rootSpan = spans.find((span) => span.name === 'memory-otel-stream-agent.stream');
			const queryMemorySpan = spans.find((span) => span.name === 'query_memory');
			const saveMemorySpan = spans.find((span) => span.name === 'save_memory');

			expect(rootSpan).toBeDefined();
			expect(queryMemorySpan).toBeDefined();
			expect(queryMemorySpan?.parentSpanContext?.spanId).toBe(rootSpan?.spanContext().spanId);
			expect(queryMemorySpan?.spanContext().traceId).toBe(rootSpan?.spanContext().traceId);
			expect(saveMemorySpan).toBeDefined();
			expect(saveMemorySpan?.parentSpanContext?.spanId).toBe(rootSpan?.spanContext().spanId);
			expect(saveMemorySpan?.spanContext().traceId).toBe(rootSpan?.spanContext().traceId);
		} finally {
			await otel.shutdown();
		}
	});
});
