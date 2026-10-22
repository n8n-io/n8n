import type { UpdateOtelSettingsDto } from '@n8n/api-types';
import type { LicenseState, Logger, ModuleRegistry } from '@n8n/backend-common';
import type { EventService } from '@n8n/backend-services';
import type { TracingSourcesConfig } from '@n8n/config';
import type { OutboundHttp } from '@n8n/backend-network';
import type { AuthenticatedRequest, WorkflowRepository } from '@n8n/db';
import { context, diag, metrics, propagation, ROOT_CONTEXT, trace } from '@opentelemetry/api';
import { isTracingSuppressed } from '@opentelemetry/core';
import type { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { mock } from 'vitest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { withExecutionIdentity } from '../execution-identity';
import type { ExecutionLevelTracer } from '../execution-level-tracer';
import { OtelLifecycleHandler } from '../otel-lifecycle-handler';
import { OtelSettingsController } from '../otel-settings.controller';
import type { OtelSettingsService } from '../otel-settings.service';
import type { OtelConfig } from '../otel.config';
import { ATTR } from '../otel.constants';
import { OtelService } from '../otel.service';
import type { TraceContextService } from '../tracing-context';

import { N8N_VERSION } from '@/constants';
import { OtelSdk } from '@/observability/otel-sdk';
import type { Publisher } from '@/scaling/pubsub/publisher.service';
import type { OwnershipService } from '@/services/ownership.service';

const { exportedSpans, urlsWithFailingFlush, exportsInsideSuppressTracing } = vi.hoisted(() => ({
	exportedSpans: [] as { url: string; span: ReadableSpan }[],
	urlsWithFailingFlush: new Set<string>(),
	exportsInsideSuppressTracing: [] as boolean[],
}));

vi.mock('@opentelemetry/exporter-trace-otlp-proto', () => ({
	OTLPTraceExporter: vi.fn().mockImplementation(function ({ url }: { url: string }) {
		return {
			export: (spans: ReadableSpan[], resultCallback: (result: { code: number }) => void) => {
				exportsInsideSuppressTracing.push(isTracingSuppressed(context.active()));
				exportedSpans.push(...spans.map((span) => ({ url, span })));
				resultCallback({ code: 0 });
			},
			shutdown: async () => {
				if (urlsWithFailingFlush.has(url)) throw new Error('ECONNREFUSED');
			},
			forceFlush: async () => {},
		};
	}),
}));

vi.mock('@opentelemetry/sdk-trace-base', async (importActual) => {
	const actual = await importActual<typeof import('@opentelemetry/sdk-trace-base')>();
	return { ...actual, BatchSpanProcessor: actual.SimpleSpanProcessor };
});

const enabledSettings: OtelConfig = {
	enabled: true,
	exporterProtocol: 'http/protobuf',
	exporterEndpoint: 'http://collector-a:4318',
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

async function exportedAfterFlush() {
	await new Promise<void>((resolve) => setImmediate(resolve));
	return exportedSpans;
}

function startWorkflowSpan() {
	return trace.getTracer('n8n-workflow').startSpan('workflow.execute');
}

describe('OtelService on the startup OTel setup', () => {
	const fetchMock = vi.fn();
	const outboundHttp = {
		transport: () => ({ asCustomFetch: () => fetchMock }),
	} as unknown as OutboundHttp;
	let otelSettingsService: ReturnType<typeof mock<OtelSettingsService>>;
	let logger: ReturnType<typeof mock<Logger>>;
	let service: OtelService;

	beforeEach(() => {
		process.env.OTEL_NODE_RESOURCE_DETECTORS = 'env';
		process.env.OTEL_RESOURCE_ATTRIBUTES = 'deployment.environment=repro,service.version=from-env';
		process.env.OTEL_SERVICE_NAME = 'from-otel-env';
		exportedSpans.length = 0;
		exportsInsideSuppressTracing.length = 0;
		urlsWithFailingFlush.clear();
		logger = mock<Logger>();
		fetchMock.mockResolvedValue({ ok: true });
		otelSettingsService = mock<OtelSettingsService>();
		otelSettingsService.loadSettings.mockResolvedValue(enabledSettings);

		const otelSdk = new OtelSdk(
			mock<Logger>(),
			mock<TracingSourcesConfig>({
				daytonaTracingEnabled: false,
				microsoftAgent365TracingEnabled: false,
			}),
		);
		otelSdk.start();
		service = new OtelService(
			otelSettingsService,
			mock<InstanceSettings>({ instanceId: 'inst-1', instanceType: 'main' }),
			logger,
			outboundHttp,
			otelSdk,
		);
	});

	afterEach(async () => {
		await service.shutdown();
		trace.disable();
		context.disable();
		propagation.disable();
		metrics.disable();
		diag.disable();
		delete process.env.OTEL_NODE_RESOURCE_DETECTORS;
		delete process.env.OTEL_RESOURCE_ATTRIBUTES;
		delete process.env.OTEL_SERVICE_NAME;
	});

	it('exports workflow spans with the saved settings once the module initialises', async () => {
		await service.init();

		startWorkflowSpan().end();

		const [exported] = await exportedAfterFlush();
		expect(exported.url).toBe('http://collector-a:4318/v1/traces');
		expect(exported.span.resource.attributes).toMatchObject({
			[ATTR.OTEL_SERVICE_NAME]: 'n8n',
			[ATTR.OTEL_SERVICE_VERSION]: N8N_VERSION,
			[ATTR.INSTANCE_ID]: 'inst-1',
			[ATTR.INSTANCE_ROLE]: 'main',
		});
	});

	it('keeps the startup resource attributes and lets the n8n attributes win', async () => {
		await service.init();

		startWorkflowSpan().end();

		const [exported] = await exportedAfterFlush();
		expect(exported.span.resource.attributes).toMatchObject({
			'deployment.environment': 'repro',
			'telemetry.sdk.language': 'nodejs',
			[ATTR.OTEL_SERVICE_NAME]: 'n8n',
			[ATTR.OTEL_SERVICE_VERSION]: N8N_VERSION,
			[ATTR.INSTANCE_ID]: 'inst-1',
		});
	});

	it('exports every span field unchanged apart from the resource', async () => {
		await service.init();

		const span = startWorkflowSpan();
		span.setAttribute('n8n.workflow.id', 'wf-1');
		span.addEvent('started');
		Object.assign(span, { fieldFromANewerSdk: 'kept' });
		span.end();

		const [{ span: exportedSpan }] = await exportedAfterFlush();
		expect(exportedSpan).toMatchObject({
			name: 'workflow.execute',
			attributes: { 'n8n.workflow.id': 'wf-1' },
			events: [expect.objectContaining({ name: 'started' })],
			ended: true,
			instrumentationScope: expect.objectContaining({ name: 'n8n-workflow' }),
			fieldFromANewerSdk: 'kept',
		});
		expect(exportedSpan.spanContext()).toEqual(span.spanContext());
		expect(exportedSpan.duration).toEqual((span as unknown as ReadableSpan).duration);
		expect(exportedSpan.resource.attributes[ATTR.INSTANCE_ID]).toBe('inst-1');
	});

	it('applies a saved service name without a restart', async () => {
		await service.init();
		otelSettingsService.loadSettings.mockResolvedValue({
			...enabledSettings,
			exporterServiceName: 'n8n-renamed',
		});

		await service.applySavedSettings();
		startWorkflowSpan().end();

		const [exported] = await exportedAfterFlush();
		expect(exported.span.resource.attributes[ATTR.OTEL_SERVICE_NAME]).toBe('n8n-renamed');
	});

	it('sends each span only to the endpoint that was saved when the span ended', async () => {
		await service.init();
		startWorkflowSpan().end();
		await exportedAfterFlush();

		otelSettingsService.loadSettings.mockResolvedValue({
			...enabledSettings,
			exporterEndpoint: 'http://collector-b:4318',
		});
		await service.applySavedSettings();
		startWorkflowSpan().end();

		expect((await exportedAfterFlush()).map(({ url }) => url)).toEqual([
			'http://collector-a:4318/v1/traces',
			'http://collector-b:4318/v1/traces',
		]);
	});

	it('saves new settings and publishes the reload when the old exporter fails to flush', async () => {
		await service.init();
		urlsWithFailingFlush.add('http://collector-a:4318/v1/traces');
		otelSettingsService.loadSettings.mockResolvedValue({
			...enabledSettings,
			exporterEndpoint: 'http://collector-b:4318',
		});
		const publisher = mock<Publisher>();
		const controller = new OtelSettingsController(
			otelSettingsService,
			service,
			new OtelLifecycleHandler(
				mock<ExecutionLevelTracer>(),
				mock<TraceContextService>(),
				service,
				otelSettingsService,
				mock<OwnershipService>(),
				mock<WorkflowRepository>(),
				mock<Logger>(),
				mock<LicenseState>(),
				mock<EventService>(),
			),
			mock<ModuleRegistry>(),
			publisher,
		);

		await controller.updateSettings(
			mock<AuthenticatedRequest>(),
			mock<Response>(),
			mock<UpdateOtelSettingsDto>(),
		);
		startWorkflowSpan().end();

		expect(publisher.publishCommand).toHaveBeenCalledWith({ command: 'reload-otel-config' });
		expect((await exportedAfterFlush()).map(({ url }) => url)).toEqual([
			'http://collector-b:4318/v1/traces',
		]);
		expect(logger.warn).toHaveBeenCalledWith(
			'Failed to cleanly shut down the previous OpenTelemetry exporter (its flush may have failed)',
			{ error: 'ECONNREFUSED' },
		);
	});

	it('sends nothing and injects no header when OTel is off', async () => {
		otelSettingsService.loadSettings.mockResolvedValue(disabledSettings);
		await service.init();

		const span = startWorkflowSpan();
		const headers: Record<string, string> = {};
		propagation.inject(trace.setSpan(ROOT_CONTEXT, span), headers);
		span.end();

		expect(await exportedAfterFlush()).toEqual([]);
		expect(headers).toEqual({});
	});

	it('turns tracing on and off through saves without a restart', async () => {
		otelSettingsService.loadSettings.mockResolvedValueOnce(disabledSettings);
		await service.init();
		startWorkflowSpan().end();

		otelSettingsService.loadSettings.mockResolvedValueOnce(enabledSettings);
		await service.applySavedSettings();
		startWorkflowSpan().end();

		otelSettingsService.loadSettings.mockResolvedValueOnce(disabledSettings);
		await service.applySavedSettings();
		startWorkflowSpan().end();

		expect(await exportedAfterFlush()).toHaveLength(1);
	});

	it('sends nothing at a sample rate of 0', async () => {
		otelSettingsService.loadSettings.mockResolvedValue({ ...enabledSettings, tracesSampleRate: 0 });
		await service.init();

		startWorkflowSpan().end();

		expect(await exportedAfterFlush()).toEqual([]);
	});

	it('injects no header from a library when outbound trace headers are off', async () => {
		otelSettingsService.loadSettings.mockResolvedValue({
			...enabledSettings,
			injectOutbound: false,
		});
		await service.init();

		const headers: Record<string, string> = {};
		propagation.inject(trace.setSpan(ROOT_CONTEXT, startWorkflowSpan()), headers);

		expect(headers).toEqual({});
	});

	it('injects traceparent and never baggage from a library when outbound headers are on', async () => {
		await service.init();

		const headers: Record<string, string> = {};
		propagation.inject(trace.setSpan(ROOT_CONTEXT, startWorkflowSpan()), headers);

		expect(Object.keys(headers)).toEqual(['traceparent']);
	});

	it('adds the execution identity of an n8n context to exported spans', async () => {
		await service.init();

		const identity = { [ATTR.EXECUTION_ID]: 'exec-1', [ATTR.WORKFLOW_ID]: 'wf-1' };
		trace
			.getTracer('n8n-workflow')
			.startSpan('node.execute', {}, withExecutionIdentity(ROOT_CONTEXT, identity))
			.end();

		const [exported] = await exportedAfterFlush();
		expect(exported.span.attributes).toMatchObject(identity);
	});

	it('runs the OTLP export with OpenTelemetry tracing suppressed, so Sentry skips it', async () => {
		await service.init();

		startWorkflowSpan().end();
		await exportedAfterFlush();

		expect(exportsInsideSuppressTracing).toEqual([true]);
	});
});
