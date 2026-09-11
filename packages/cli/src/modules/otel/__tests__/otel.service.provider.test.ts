import type { Logger } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import type { Context } from '@opentelemetry/api';
import {
	context,
	createContextKey,
	propagation,
	ProxyTracerProvider,
	ROOT_CONTEXT,
	trace,
} from '@opentelemetry/api';
import type { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import {
	InMemorySpanExporter,
	NodeTracerProvider,
	SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-node';
import { mock } from 'vitest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { OtelSettingsService } from '../otel-settings.service';
import type { OtelConfig } from '../otel.config';
import { ATTR } from '../otel.constants';
import { OtelService } from '../otel.service';

import { N8N_VERSION } from '@/constants';

const { exportedSpans } = vi.hoisted(() => ({ exportedSpans: [] as ReadableSpan[] }));

vi.mock('@opentelemetry/exporter-trace-otlp-proto', () => ({
	OTLPTraceExporter: vi.fn().mockImplementation(function () {
		return {
			export: (spans: ReadableSpan[], resultCallback: (result: { code: number }) => void) => {
				exportedSpans.push(...spans);
				resultCallback({ code: 0 });
			},
			shutdown: async () => {},
			forceFlush: async () => {},
		};
	}),
}));

vi.mock('@opentelemetry/sdk-trace-base', async (importActual) => {
	const actual = await importActual<typeof import('@opentelemetry/sdk-trace-base')>();
	return { ...actual, BatchSpanProcessor: actual.SimpleSpanProcessor };
});

vi.mock('@opentelemetry/resources', async (importActual) => {
	const actual = await importActual<typeof import('@opentelemetry/resources')>();
	return { ...actual, detectResources: () => actual.emptyResource() };
});

const enabledSettings: OtelConfig = {
	enabled: true,
	exporterProtocol: 'http/protobuf',
	exporterEndpoint: 'http://localhost:4318',
	exporterTracingPath: '/v1/traces',
	exporterHeaders: '',
	exporterServiceName: 'n8n',
	tracesSampleRate: 1,
	startupConnectivityTimeoutMs: 2_000,
	includeNodeSpans: true,
	injectOutbound: true,
	productionExecutionsOnly: true,
};

const disabledSettings: OtelConfig = { ...enabledSettings, enabled: false };

const traceparentPattern = /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/;
const markedContext = ROOT_CONTEXT.setValue(createContextKey('marker'), 'marked');

function activeContextInside(ctx: Context): Context {
	return context.with(ctx, () => context.active());
}

function globalTracerProviderDelegate() {
	const globalProvider = trace.getTracerProvider();
	return globalProvider instanceof ProxyTracerProvider
		? globalProvider.getDelegate()
		: globalProvider;
}

function registerForeignProvider() {
	const exporter = new InMemorySpanExporter();
	const provider = new NodeTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });
	provider.register();
	return { provider, exporter };
}

function exportedSpanNames() {
	return exportedSpans.map((span) => span.name);
}

describe('OtelService tracer provider', () => {
	const fetchMock = vi.fn();
	const outboundHttp = {
		transport: () => ({ asCustomFetch: () => fetchMock }),
	} as unknown as OutboundHttp;
	let otelSettingsService: ReturnType<typeof mock<OtelSettingsService>>;
	let logger: ReturnType<typeof mock<Logger>>;
	let service: OtelService;
	let foreign: ReturnType<typeof registerForeignProvider> | undefined;

	beforeEach(() => {
		exportedSpans.length = 0;
		fetchMock.mockResolvedValue({ ok: true });
		otelSettingsService = mock<OtelSettingsService>();
		otelSettingsService.loadSettings.mockResolvedValue(enabledSettings);
		logger = mock<Logger>();
		service = new OtelService(
			otelSettingsService,
			mock<InstanceSettings>({ instanceId: 'inst-1', instanceType: 'main' }),
			logger,
			outboundHttp,
		);
	});

	afterEach(async () => {
		await service.shutdown();
		await foreign?.provider.shutdown();
		foreign = undefined;
		trace.disable();
		context.disable();
		propagation.disable();
	});

	describe('when another library owns the global API', () => {
		beforeEach(() => {
			foreign = registerForeignProvider();
		});

		it('exports n8n spans through its own provider and leaves the foreign exporter empty', async () => {
			await service.init();

			service.getTracer('n8n-workflow').startSpan('workflow.execute').end();

			expect(exportedSpanNames()).toEqual(['workflow.execute']);
			expect(exportedSpans[0].resource.attributes).toMatchObject({
				[ATTR.OTEL_SERVICE_NAME]: 'n8n',
				[ATTR.OTEL_SERVICE_VERSION]: N8N_VERSION,
				[ATTR.INSTANCE_ID]: 'inst-1',
				[ATTR.INSTANCE_ROLE]: 'main',
			});
			expect(foreign?.exporter.getFinishedSpans()).toHaveLength(0);
		});

		it('keeps exporting after a restart and leaves the foreign globals in place', async () => {
			await service.init();
			await service.restart();

			service.getTracer('n8n-workflow').startSpan('workflow.execute').end();
			trace.getTracer('foreign').startSpan('GET /webhook').end();

			expect(exportedSpanNames()).toEqual(['workflow.execute']);
			expect(foreign?.exporter.getFinishedSpans().map((span) => span.name)).toEqual([
				'GET /webhook',
			]);
			expect(globalTracerProviderDelegate()).toBe(foreign?.provider);
			expect(activeContextInside(markedContext)).toBe(markedContext);
		});

		it('logs the foreign owner once for the lifetime of the service', async () => {
			await service.init();
			await service.restart();

			expect(logger.info).toHaveBeenCalledTimes(1);
			expect(logger.info).toHaveBeenCalledWith(
				expect.stringContaining('runs on its own tracer provider'),
			);
		});
	});

	describe('when the global API is free', () => {
		it('registers its provider, so third-party tracers export through the module', async () => {
			await service.init();

			trace.getTracer('third-party').startSpan('http.request').end();
			const headers: Record<string, string> = {};
			const span = service.getTracer('n8n-workflow').startSpan('workflow.execute');
			propagation.inject(trace.setSpan(context.active(), span), headers);
			span.end();

			expect(exportedSpanNames()).toEqual(['http.request', 'workflow.execute']);
			expect(headers.traceparent).toMatch(traceparentPattern);
			expect(activeContextInside(markedContext)).toBe(markedContext);
			expect(logger.info).not.toHaveBeenCalled();
		});

		it('swaps the registered provider on restart and keeps the context manager', async () => {
			await service.init();
			await service.restart();

			trace.getTracer('third-party').startSpan('http.request').end();

			expect(exportedSpanNames()).toEqual(['http.request']);
			expect(activeContextInside(markedContext)).toBe(markedContext);
		});

		it('keeps the context manager after shutdown and hands out no-op tracers', async () => {
			await service.init();
			await service.shutdown();

			expect(activeContextInside(markedContext)).toBe(markedContext);
			expect(service.getTracer('n8n-workflow').startSpan('workflow.execute').isRecording()).toBe(
				false,
			);
		});

		it('registers on the first enabled restart after a disabled boot', async () => {
			otelSettingsService.loadSettings
				.mockResolvedValueOnce(disabledSettings)
				.mockResolvedValueOnce(enabledSettings);
			await service.init();
			expect(service.getTracer('n8n-workflow').startSpan('workflow.execute').isRecording()).toBe(
				false,
			);

			await service.restart();
			service.getTracer('n8n-workflow').startSpan('workflow.execute').end();
			trace.getTracer('third-party').startSpan('http.request').end();

			expect(exportedSpanNames()).toEqual(['workflow.execute', 'http.request']);
		});
	});
});
