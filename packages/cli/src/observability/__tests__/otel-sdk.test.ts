import type { Logger } from '@n8n/backend-common';
import type { TracingSourcesConfig } from '@n8n/config';
import {
	context,
	createContextKey,
	diag,
	metrics,
	propagation,
	ROOT_CONTEXT,
	trace,
} from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import {
	AlwaysOnSampler,
	InMemorySpanExporter,
	SimpleSpanProcessor,
	type SpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { init as initSentry, close as closeSentry } from '@sentry/node';
import { mock } from 'vitest-mock-extended';

import { OtelSdk } from '../otel-sdk';
import { TRACING_OFF } from '../swappable-pipeline';

type OptIns = {
	daytona?: boolean;
	microsoftAgent365?: boolean;
};

let exporter: InMemorySpanExporter;
let processor: SimpleSpanProcessor;
let logger: ReturnType<typeof mock<Logger>>;

function createSdk({ daytona = false, microsoftAgent365 = false }: OptIns = {}) {
	logger = mock<Logger>();
	return new OtelSdk(
		logger,
		mock<TracingSourcesConfig>({
			daytonaTracingEnabled: daytona,
			microsoftAgent365TracingEnabled: microsoftAgent365,
		}),
	);
}

async function startWithExport(optIns: OptIns = {}) {
	const sdk = createSdk(optIns);
	sdk.start();
	await sdk.apply(exportingPipeline());
	return sdk;
}

function exportingPipeline() {
	exporter = new InMemorySpanExporter();
	processor = new SimpleSpanProcessor(exporter);
	return {
		spanProcessors: [processor],
		sampler: new AlwaysOnSampler(),
		propagator: new W3CTraceContextPropagator(),
	};
}

async function exportedSpans() {
	await processor.forceFlush();
	return exporter.getFinishedSpans();
}

describe('OtelSdk', () => {
	const originalDetectors = process.env.OTEL_NODE_RESOURCE_DETECTORS;

	beforeEach(() => {
		process.env.OTEL_NODE_RESOURCE_DETECTORS = 'env';
	});

	afterEach(() => {
		trace.disable();
		context.disable();
		propagation.disable();
		metrics.disable();
		diag.disable();
		delete process.env.OTEL_SDK_DISABLED;
		delete process.env.OTEL_LOG_LEVEL;
		process.env.OTEL_NODE_RESOURCE_DETECTORS = originalDetectors;
	});

	describe('tracer gate', () => {
		it("exports only n8n's own tracers when no opt-in is on", async () => {
			await startWithExport();

			for (const name of [
				'n8n-workflow',
				'@n8n/agents',
				'n8n-expression-runtime',
				'',
				'Agent365Sdk',
				'@microsoft/agents-telemetry',
				'some-library',
			]) {
				trace.getTracer(name).startSpan(`span from "${name}"`).end();
			}

			expect((await exportedSpans()).map((span) => span.instrumentationScope.name)).toEqual([
				'n8n-workflow',
				'@n8n/agents',
				'n8n-expression-runtime',
			]);
		});

		it.each<[keyof OptIns, string[]]>([
			['daytona', ['']],
			['microsoftAgent365', ['Agent365Sdk', '@microsoft/agents-telemetry']],
		])('brings the tracers of the %s opt-in back', async (optIn, tracerNames) => {
			await startWithExport({ [optIn]: true });

			for (const name of [...tracerNames, 'some-library']) {
				trace.getTracer(name).startSpan('library span').end();
			}

			expect((await exportedSpans()).map((span) => span.instrumentationScope.name)).toEqual(
				tracerNames,
			);
		});

		it('gates a tracer that a library took before the SDK started', async () => {
			const earlyLibraryTracer = trace.getTracer('some-library');
			const earlyWorkflowTracer = trace.getTracer('n8n-workflow');

			await startWithExport();

			expect(earlyLibraryTracer.startSpan('library span').isRecording()).toBe(false);
			expect(earlyWorkflowTracer.startSpan('workflow.execute').isRecording()).toBe(true);
		});

		it('keeps the real parent for an enabled span under a gated span', async () => {
			await startWithExport();

			const workflowSpan = trace.getTracer('n8n-workflow').startSpan('workflow.execute');
			const gatedSpan = trace
				.getTracer('some-library')
				.startSpan('library span', {}, trace.setSpan(ROOT_CONTEXT, workflowSpan));
			const agentSpan = trace
				.getTracer('@n8n/agents')
				.startSpan('agent.stream', {}, trace.setSpan(ROOT_CONTEXT, gatedSpan));
			agentSpan.end();
			gatedSpan.end();
			workflowSpan.end();

			const [exportedAgentSpan] = await exportedSpans();
			expect(exportedAgentSpan.parentSpanContext?.spanId).toBe(workflowSpan.spanContext().spanId);
		});
	});

	describe('global setup', () => {
		it('keeps the same tracer provider, context manager and propagator across applies', async () => {
			const sdk = await startWithExport();
			const workflowTracer = trace.getTracer('n8n-workflow');
			const globalPropagator = propagation['_getGlobalPropagator']();

			await sdk.apply(TRACING_OFF);
			await sdk.apply(exportingPipeline());

			const marked = ROOT_CONTEXT.setValue(createContextKey('marker'), 'marked');
			expect(trace.getTracer('n8n-workflow')).toBe(workflowTracer);
			expect(propagation['_getGlobalPropagator']()).toBe(globalPropagator);
			expect(context.with(marked, () => context.active())).toBe(marked);
		});

		it('records nothing and injects no header while the no-op parts are applied', async () => {
			const sdk = await startWithExport();
			await sdk.apply(TRACING_OFF);

			const span = trace.getTracer('n8n-workflow').startSpan('workflow.execute');
			const headers: Record<string, string> = {};
			propagation.inject(trace.setSpan(ROOT_CONTEXT, span), headers);
			span.end();

			expect(span.isRecording()).toBe(false);
			expect(headers).toEqual({});
		});

		it('injects only traceparent with an exporting pipeline', async () => {
			await startWithExport();

			const span = trace.getTracer('n8n-workflow').startSpan('workflow.execute');
			const headers: Record<string, string> = {};
			propagation.inject(trace.setSpan(ROOT_CONTEXT, span), headers);

			expect(Object.keys(headers)).toEqual(['traceparent']);
		});

		it('registers no meter provider', async () => {
			const meterProviderBeforeStart = metrics.getMeterProvider();

			await startWithExport();

			expect(metrics.getMeterProvider()).toBe(meterProviderBeforeStart);
		});

		it('registers nothing and logs one warning when OTEL_SDK_DISABLED is true', async () => {
			process.env.OTEL_SDK_DISABLED = 'true';

			await startWithExport();

			expect(trace.getTracer('n8n-workflow').startSpan('workflow.execute').isRecording()).toBe(
				false,
			);
			expect(logger.warn).toHaveBeenCalledTimes(1);
		});

		it('keeps applying when a replaced span processor fails to shut down', async () => {
			const sdk = createSdk();
			sdk.start();
			const failingProcessor = mock<SpanProcessor>();
			failingProcessor.shutdown.mockRejectedValue(new Error('ECONNREFUSED'));
			await sdk.apply({ ...exportingPipeline(), spanProcessors: [failingProcessor] });

			const shutdownErrors = await sdk.apply(exportingPipeline());
			trace.getTracer('n8n-workflow').startSpan('workflow.execute').end();

			expect(shutdownErrors).toEqual([new Error('ECONNREFUSED')]);
			expect(await exportedSpans()).toHaveLength(1);
		});

		it('does not replace or gate a tracer provider that another setup registered first', async () => {
			const foreignExporter = new InMemorySpanExporter();
			new NodeTracerProvider({
				spanProcessors: [new SimpleSpanProcessor(foreignExporter)],
			}).register();

			await startWithExport();
			trace.getTracer('some-library').startSpan('GET /webhook').end();
			trace.getTracer('n8n-workflow').startSpan('workflow.execute').end();

			expect(foreignExporter.getFinishedSpans().map((span) => span.name)).toEqual([
				'GET /webhook',
				'workflow.execute',
			]);
			expect(await exportedSpans()).toEqual([]);
			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.error).not.toHaveBeenCalled();
		});

		it('forwards OpenTelemetry diagnostics to the n8n logger', () => {
			createSdk().start();

			diag.error('duplicate registration');
			diag.info('not forwarded at the default level');

			expect(logger.error).toHaveBeenCalledWith('OpenTelemetry diagnostics error', {
				args: ['duplicate registration'],
			});
			expect(logger.info).not.toHaveBeenCalled();
		});

		it('forwards diagnostics at the OTEL_LOG_LEVEL level to the n8n logger', () => {
			process.env.OTEL_LOG_LEVEL = 'info';
			const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {});
			createSdk().start();

			diag.info('exporter ready');

			expect(logger.info).toHaveBeenCalledWith('OpenTelemetry diagnostics info', {
				args: ['exporter ready'],
			});
			expect(consoleInfo).not.toHaveBeenCalled();
		});

		it('keeps the diagnostics logger of a setup that another tool registered first', () => {
			new NodeTracerProvider().register();
			const foreignLogger = {
				error: vi.fn(),
				warn: vi.fn(),
				info: vi.fn(),
				debug: vi.fn(),
				verbose: vi.fn(),
			};
			diag.setLogger(foreignLogger);

			createSdk().start();
			diag.error('from a library');

			expect(foreignLogger.error).toHaveBeenCalledWith('from a library');
			expect(logger.error).not.toHaveBeenCalled();
		});

		it('starts the n8n setup after Sentry starts', async () => {
			initSentry({
				dsn: 'http://public@127.0.0.1:9/1',
				tracesSampleRate: 1,
				defaultIntegrations: false,
				enableRuntimeChannelInjection: false,
			});

			await startWithExport();
			trace.getTracer('n8n-workflow').startSpan('workflow.execute').end();

			expect(await exportedSpans()).toHaveLength(1);
			await closeSentry(0);
		});

		it('flushes and shuts down the span processors through the SDK', async () => {
			const sdk = createSdk();
			sdk.start();
			const exportingProcessor = mock<SpanProcessor>();
			await sdk.apply({ ...exportingPipeline(), spanProcessors: [exportingProcessor] });

			await sdk.shutdown();

			expect(exportingProcessor.shutdown).toHaveBeenCalledTimes(1);
		});

		it('rejects the shutdown with the first failed flush', async () => {
			const sdk = createSdk();
			sdk.start();
			const failingProcessor = mock<SpanProcessor>();
			failingProcessor.shutdown.mockRejectedValue(new Error('ECONNREFUSED'));
			await sdk.apply({ ...exportingPipeline(), spanProcessors: [failingProcessor] });

			await expect(sdk.shutdown()).rejects.toThrow('ECONNREFUSED');
		});
	});
});
