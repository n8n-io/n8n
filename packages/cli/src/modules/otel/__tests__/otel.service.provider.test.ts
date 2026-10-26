import type { Logger } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import type { Context } from '@opentelemetry/api';
import { context, createContextKey, propagation, ROOT_CONTEXT, trace } from '@opentelemetry/api';
import { AlwaysOffSampler, type ReadableSpan } from '@opentelemetry/sdk-trace-base';
import {
	InMemorySpanExporter,
	NodeTracerProvider,
	SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-node';
import { mock } from 'vitest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { withExecutionIdentity } from '../execution-identity';
import { OtelConfigureHook, type OtelConfigureHookApi } from '../otel-configure-hook';
import type { OtelSettingsService } from '../otel-settings.service';
import type { OtelConfig } from '../otel.config';
import { ATTR } from '../otel.constants';
import { OtelService } from '../otel.service';

import { N8N_VERSION } from '@/constants';
import type { ExternalHooks } from '@/external-hooks';

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
	emitWorkflowStartSpan: false,
	emitNodeStartSpan: false,
	injectOutbound: true,
	productionExecutionsOnly: true,
};

const disabledSettings: OtelConfig = { ...enabledSettings, enabled: false };

const traceparentPattern = /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/;
const markedContext = ROOT_CONTEXT.setValue(createContextKey('marker'), 'marked');

function activeContextInside(ctx: Context): Context {
	return context.with(ctx, () => context.active());
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
	let externalHooks: ReturnType<typeof mock<ExternalHooks>>;
	let configureHook: OtelConfigureHook;

	const onConfigure = (configure: (api: OtelConfigureHookApi) => void) =>
		externalHooks.run.mockImplementation(async (_hookName, params) =>
			configure((params as [OtelConfigureHookApi])[0]),
		);

	beforeEach(() => {
		exportedSpans.length = 0;
		fetchMock.mockResolvedValue({ ok: true });
		otelSettingsService = mock<OtelSettingsService>();
		otelSettingsService.loadSettings.mockResolvedValue(enabledSettings);
		logger = mock<Logger>();
		externalHooks = mock<ExternalHooks>();
		configureHook = new OtelConfigureHook(logger);
		service = new OtelService(
			otelSettingsService,
			mock<InstanceSettings>({ instanceId: 'inst-1', instanceType: 'main' }),
			logger,
			outboundHttp,
			externalHooks,
			configureHook,
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
			expect(activeContextInside(markedContext)).toBe(markedContext);

			await service.shutdown();
			expect(service.getTracer('n8n-workflow').startSpan('workflow.execute').isRecording()).toBe(
				false,
			);
			expect(trace.getTracer('foreign').startSpan('another request').isRecording()).toBe(true);
		});

		it('does not replace a foreign provider that samples no spans', async () => {
			await foreign?.provider.shutdown();
			trace.disable();
			const provider = new NodeTracerProvider({ sampler: new AlwaysOffSampler() });
			provider.register();
			foreign = { provider, exporter: new InMemorySpanExporter() };

			await service.init();
			await service.restart();

			expect(trace.getTracer('foreign').startSpan('test').isRecording()).toBe(false);
			service.getTracer('n8n-workflow').startSpan('workflow.execute').end();
			expect(exportedSpanNames()).toEqual(['workflow.execute']);
			expect(logger.info).toHaveBeenCalledTimes(1);
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
			expect(externalHooks.run).toHaveBeenCalledExactlyOnceWith('otel.configure', [
				configureHook.api,
			]);
			expect(exportedSpans[1].resource.attributes['project.id']).toBeUndefined();
			expect(configureHook.buildOutboundBaggage({ [ATTR.PROJECT_ID]: 'p1' })).toEqual({});
		});

		it('adds the resource attributes of the otel.configure hook to matching spans and lets the n8n attributes win', async () => {
			onConfigure((api) =>
				api.registerResourceAttributeMapper((attrs): Record<string, string> => {
					const projectId = attrs[ATTR.PROJECT_ID];
					if (typeof projectId !== 'string') return {};
					return { 'project.id': projectId, [ATTR.OTEL_SERVICE_NAME]: 'from-hook' };
				}),
			);
			await service.init();

			const tracer = service.getTracer('n8n-workflow');
			tracer.startSpan('node.execute', { attributes: { [ATTR.PROJECT_ID]: 'p1' } }).end();
			tracer.startSpan('workflow.execute').end();

			const [withProject, withoutProject] = exportedSpans;
			expect(withProject.resource.attributes).toMatchObject({
				'project.id': 'p1',
				[ATTR.OTEL_SERVICE_NAME]: 'n8n',
				[ATTR.INSTANCE_ID]: 'inst-1',
			});
			expect(withoutProject.resource.attributes['project.id']).toBeUndefined();
			expect(withoutProject.resource.attributes[ATTR.OTEL_SERVICE_NAME]).toBe('n8n');
		});

		it('keeps exporting with the base resource and warns once when a resource mapper throws', async () => {
			onConfigure((api) =>
				api.registerResourceAttributeMapper(() => {
					throw new Error('boom');
				}),
			);
			await service.init();

			service.getTracer('n8n-workflow').startSpan('workflow.execute').end();
			service.getTracer('n8n-workflow').startSpan('workflow.execute').end();

			expect(exportedSpanNames()).toEqual(['workflow.execute', 'workflow.execute']);
			expect(exportedSpans[0].resource.attributes[ATTR.OTEL_SERVICE_NAME]).toBe('n8n');
			expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
				'OpenTelemetry resource attribute mapper failed',
				{ error: 'boom' },
			);
		});

		it('builds outbound baggage from the otel.configure hook and keeps only string values', async () => {
			onConfigure((api) => {
				api.registerOutboundBaggageMapper((attrs) => ({
					'project.id': String(attrs[ATTR.PROJECT_ID]),
					count: 1 as unknown as string,
				}));
				api.registerOutboundBaggageMapper((async () => ({ tenant: 'async' })) as never);
			});
			await service.init();

			expect(configureHook.buildOutboundBaggage({ [ATTR.PROJECT_ID]: 'p1' })).toEqual({
				'project.id': 'p1',
			});
			expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
				'OpenTelemetry outbound baggage mapper failed',
				{ error: 'An OpenTelemetry mapper must be synchronous' },
			);
		});

		it('adds the execution identity of an n8n context to exported spans', async () => {
			await service.init();

			const identity = { [ATTR.EXECUTION_ID]: 'exec-1', [ATTR.WORKFLOW_ID]: 'wf-1' };
			service
				.getTracer('n8n-workflow')
				.startSpan('node.execute', {}, withExecutionIdentity(ROOT_CONTEXT, identity))
				.end();

			expect(exportedSpans[0].attributes).toMatchObject(identity);
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
