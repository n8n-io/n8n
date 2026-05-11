const mockExporterConfigs: unknown[] = [];
const mockBatchProcessorInputs: unknown[] = [];
const mockBatchProcessorInstances: Array<{
	forceFlush: jest.Mock<Promise<void>, []>;
	onStart: jest.Mock<void, [unknown, unknown]>;
	onEnd: jest.Mock<void, [unknown]>;
	shutdown: jest.Mock<Promise<void>, []>;
}> = [];
const mockProviderConfigs: unknown[] = [];
const mockAwaitPendingTraceBatches = jest.fn(async () => await Promise.resolve());
const mockTracer = { startSpan: jest.fn() };
const mockProvider = {
	getTracer: jest.fn(() => mockTracer),
	register: jest.fn(),
	forceFlush: jest.fn(),
	shutdown: jest.fn(),
};

jest.mock('langsmith/experimental/otel/exporter', () => ({
	LangSmithOTLPTraceExporter: jest.fn((config: unknown) => {
		mockExporterConfigs.push(config);
		return { type: 'exporter' };
	}),
}));

jest.mock('@opentelemetry/sdk-trace-base', () => ({
	BatchSpanProcessor: jest.fn((exporter: unknown) => {
		mockBatchProcessorInputs.push(exporter);
		const processor = {
			forceFlush: jest.fn(async () => await Promise.resolve()),
			onStart: jest.fn(),
			onEnd: jest.fn(),
			shutdown: jest.fn(async () => await Promise.resolve()),
		};
		mockBatchProcessorInstances.push(processor);
		return processor;
	}),
}));

jest.mock('langsmith', () => ({
	RunTree: {
		getSharedClient: jest.fn(() => ({
			awaitPendingTraceBatches: mockAwaitPendingTraceBatches,
		})),
	},
}));

jest.mock('@opentelemetry/sdk-trace-node', () => ({
	NodeTracerProvider: jest.fn((config: unknown) => {
		mockProviderConfigs.push(config);
		return mockProvider;
	}),
}));

import { LangSmithTelemetry } from '../integrations/langsmith';

describe('LangSmithTelemetry', () => {
	const previousTracingV2 = process.env.LANGCHAIN_TRACING_V2;

	beforeEach(() => {
		mockExporterConfigs.length = 0;
		mockBatchProcessorInputs.length = 0;
		mockBatchProcessorInstances.length = 0;
		mockProviderConfigs.length = 0;
		mockAwaitPendingTraceBatches.mockClear();
		mockProvider.getTracer.mockClear();
		mockProvider.register.mockClear();
		mockProvider.forceFlush.mockClear();
		mockProvider.shutdown.mockClear();
		delete process.env.LANGCHAIN_TRACING_V2;
	});

	afterAll(() => {
		if (previousTracingV2 === undefined) {
			delete process.env.LANGCHAIN_TRACING_V2;
		} else {
			process.env.LANGCHAIN_TRACING_V2 = previousTracingV2;
		}
	});

	it('passes proxy headers and derived OTLP URL to the LangSmith exporter', async () => {
		const transformExportedSpan = (span: unknown) => span;
		const getHeaders = jest.fn(async () => {
			await Promise.resolve();
			return { Authorization: 'Bearer proxy-token' } satisfies Record<string, string>;
		});
		const built = await new LangSmithTelemetry({
			apiKey: '-',
			project: 'instance-ai',
			endpoint: 'https://ai-proxy.test/langsmith',
			headers: getHeaders,
			transformExportedSpan,
		}).build();

		expect(getHeaders).toHaveBeenCalledTimes(1);
		expect(mockExporterConfigs).toEqual([
			{
				apiKey: '-',
				projectName: 'instance-ai',
				headers: { Authorization: 'Bearer proxy-token' },
				transformExportedSpan,
				url: 'https://ai-proxy.test/langsmith/otel/v1/traces',
			},
		]);
		expect(mockBatchProcessorInputs).toEqual([{ type: 'exporter' }]);
		expect(mockProviderConfigs).toHaveLength(1);
		const providerConfig = mockProviderConfigs[0] as { spanProcessors: unknown[] };
		expect(providerConfig.spanProcessors).toHaveLength(1);
		const spanProcessor = providerConfig.spanProcessors[0] as Record<string, unknown>;
		expect(typeof spanProcessor.forceFlush).toBe('function');
		expect(typeof spanProcessor.onStart).toBe('function');
		expect(typeof spanProcessor.onEnd).toBe('function');
		expect(typeof spanProcessor.shutdown).toBe('function');
		expect(mockProvider.register).toHaveBeenCalledWith({ propagator: null });
		expect(mockProvider.getTracer).toHaveBeenCalledWith('@n8n/agents');
		expect(built.tracer).toBe(mockTracer);
		expect(built.provider).toBe(mockProvider);
		expect(process.env.LANGCHAIN_TRACING_V2).toBe('true');
	});

	it('does not allow endpoint overrides when using an engine-resolved key', async () => {
		const telemetry = new LangSmithTelemetry({
			project: 'instance-ai',
			endpoint: 'https://should-not-be-used.test',
		});
		telemetry.resolvedApiKey = 'resolved-key';

		await telemetry.build();

		expect(mockExporterConfigs).toEqual([
			{
				apiKey: 'resolved-key',
				projectName: 'instance-ai',
			},
		]);
	});

	it('filters noisy AI SDK operation wrappers while preserving provider and tool spans', async () => {
		await new LangSmithTelemetry({
			apiKey: 'ls-test-key',
			project: 'instance-ai',
		}).build();

		const processor = mockProviderConfigs[0] as {
			spanProcessors: Array<{
				onStart(span: unknown, parentContext: unknown): void;
				onEnd(span: unknown): void;
			}>;
		};
		const filteredProcessor = processor.spanProcessors[0];
		const delegate = mockBatchProcessorInstances[0];
		const makeSpan = (
			spanId: string,
			attributes: Record<string, unknown>,
			parentSpanId?: string,
		) => ({
			attributes,
			spanContext: () => ({ traceId: 'trace-1', spanId }),
			...(parentSpanId ? { parentSpanContext: { spanId: parentSpanId } } : {}),
		});

		const root = makeSpan('1111111111111111', { 'langsmith.traceable': 'true' });
		const streamWrapper = makeSpan(
			'2222222222222222',
			{ 'ai.operationId': 'ai.streamText' },
			'1111111111111111',
		);
		const providerRequest = makeSpan(
			'3333333333333333',
			{ 'ai.operationId': 'ai.streamText.doStream' },
			'2222222222222222',
		);
		const toolCall = makeSpan(
			'4444444444444444',
			{ 'ai.operationId': 'ai.toolCall' },
			'2222222222222222',
		);

		filteredProcessor.onStart(root, {});
		filteredProcessor.onStart(streamWrapper, {});
		filteredProcessor.onStart(providerRequest, {});
		filteredProcessor.onStart(toolCall, {});
		filteredProcessor.onEnd(toolCall);
		filteredProcessor.onEnd(providerRequest);
		filteredProcessor.onEnd(streamWrapper);
		filteredProcessor.onEnd(root);

		expect(delegate.onStart).toHaveBeenCalledTimes(3);
		expect(delegate.onStart).toHaveBeenNthCalledWith(1, root, {});
		expect(delegate.onStart).toHaveBeenNthCalledWith(2, providerRequest, {});
		expect(delegate.onStart).toHaveBeenNthCalledWith(3, toolCall, {});
		expect(providerRequest.attributes).toEqual(
			expect.objectContaining({
				'langsmith.span.parent_id': '00000000-0000-0000-1111-111111111111',
				'langsmith.traceable_parent_otel_span_id': '1111111111111111',
			}),
		);
		expect(delegate.onEnd).toHaveBeenCalledTimes(3);
		expect(delegate.onEnd).not.toHaveBeenCalledWith(streamWrapper);
	});
});
