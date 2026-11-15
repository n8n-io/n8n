import type { Tracer } from '@opentelemetry/api';
import { context, ROOT_CONTEXT, trace } from '@opentelemetry/api';
import type { ReadableSpan } from '@opentelemetry/sdk-trace-base';

import { LangSmithTelemetry } from '../integrations/langsmith';

const { exportedSpans } = vi.hoisted(() => ({ exportedSpans: [] as ReadableSpan[] }));

vi.mock('langsmith/experimental/otel/exporter', () => ({
	LangSmithOTLPTraceExporter: vi.fn(function () {
		return {
			export: (spans: ReadableSpan[], resultCallback: (result: { code: number }) => void) => {
				exportedSpans.push(...spans);
				resultCallback({ code: 0 });
			},
			shutdown: async () => {},
		};
	}),
}));

vi.mock('langsmith', () => ({
	RunTree: { getSharedClient: () => ({ awaitPendingTraceBatches: async () => {} }) },
}));

const traceable = { attributes: { 'langsmith.traceable': 'true' } };

describe('LangSmithTelemetry in a process without an OpenTelemetry setup', () => {
	afterEach(() => {
		exportedSpans.length = 0;
		context.disable();
	});

	it('exports spans that Instance AI nests with context.with as one trace', async () => {
		const built = await new LangSmithTelemetry({ apiKey: 'ls-key' }).build();
		const tracer = built.tracer as Tracer;

		const turnSpan = tracer.startSpan('turn', traceable, ROOT_CONTEXT);
		await context.with(trace.setSpan(ROOT_CONTEXT, turnSpan), async () => {
			await new Promise((resolve) => setImmediate(resolve));
			tracer.startSpan('tool', traceable).end();
		});
		turnSpan.end();
		await built.provider?.forceFlush();

		const [toolSpan, exportedTurnSpan] = exportedSpans;
		expect(toolSpan.spanContext().traceId).toBe(exportedTurnSpan.spanContext().traceId);
		expect(toolSpan.parentSpanContext?.spanId).toBe(exportedTurnSpan.spanContext().spanId);
	});
});
