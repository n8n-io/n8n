import type { UpdateOtelSettingsDto } from '@n8n/api-types';
import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import type { TracingSourcesConfig } from '@n8n/config';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	context,
	diag,
	metrics,
	propagation,
	ROOT_CONTEXT,
	trace,
	TraceFlags,
} from '@opentelemetry/api';
import { isTracingSuppressed } from '@opentelemetry/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import type { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { mock } from 'vitest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { withExecutionIdentity } from '../execution-identity';
import { OtelExporterFactory } from '../otel-exporter.factory';
import { OtelSettingsController } from '../otel-settings.controller';
import type { OtelSettingsService } from '../otel-settings.service';
import type { OtelConfig } from '../otel.config';
import { ATTR } from '../otel.constants';
import { OtelService } from '../otel.service';

import { N8N_VERSION } from '@/constants';
import { OtelSdk } from '@/observability/otel-sdk';
import type { Publisher } from '@/scaling/pubsub/publisher.service';

const {
	exportedSpans,
	urlsWithFailingFlush,
	urlsWithHeldExports,
	heldExports,
	exportsInsideSuppressTracing,
} = vi.hoisted(() => ({
	exportedSpans: [] as { url: string; span: ReadableSpan }[],
	urlsWithFailingFlush: new Set<string>(),
	urlsWithHeldExports: new Set<string>(),
	heldExports: [] as (() => void)[],
	exportsInsideSuppressTracing: [] as boolean[],
}));

vi.mock('@opentelemetry/exporter-trace-otlp-proto', () => ({
	OTLPTraceExporter: vi.fn().mockImplementation(function ({ url }: { url: string }) {
		const pendingExports: Promise<void>[] = [];
		return {
			export: (spans: ReadableSpan[], resultCallback: (result: { code: number }) => void) => {
				exportsInsideSuppressTracing.push(isTracingSuppressed(context.active()));
				const finish = () => {
					exportedSpans.push(...spans.map((span) => ({ url, span })));
					resultCallback({ code: 0 });
				};
				if (!urlsWithHeldExports.has(url)) return finish();

				pendingExports.push(
					new Promise((resolve) =>
						heldExports.push(() => {
							finish();
							resolve();
						}),
					),
				);
			},
			shutdown: async () => {
				await Promise.all(pendingExports);
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

const COLLECTOR_A = 'http://collector-a:4318/v1/traces';
const COLLECTOR_B = 'http://collector-b:4318/v1/traces';

async function exportedAfterFlush() {
	await new Promise<void>((resolve) => setImmediate(resolve));
	return exportedSpans;
}

function releaseHeldExports() {
	for (const release of heldExports.splice(0)) release();
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
	let publisher: ReturnType<typeof mock<Publisher>>;

	beforeEach(() => {
		process.env.OTEL_NODE_RESOURCE_DETECTORS = 'env';
		process.env.OTEL_RESOURCE_ATTRIBUTES = 'deployment.environment=repro,service.version=from-env';
		process.env.OTEL_SERVICE_NAME = 'from-otel-env';
		exportedSpans.length = 0;
		exportsInsideSuppressTracing.length = 0;
		urlsWithFailingFlush.clear();
		urlsWithHeldExports.clear();
		heldExports.length = 0;
		logger = mock<Logger>();
		fetchMock.mockResolvedValue({ ok: true });
		otelSettingsService = mock<OtelSettingsService>();
		otelSettingsService.loadSettings.mockResolvedValue(enabledSettings);

		const otelSdk = new OtelSdk(
			mock<Logger>(),
			mock<TracingSourcesConfig>({
				daytonaTracingEnabled: false,
				microsoftAgent365TracingEnabled: false,
				microsoftAgent365ExportEnabled: false,
			}),
		);
		otelSdk.start();
		publisher = mock<Publisher>();
		publisher.publishCommand.mockResolvedValue();
		service = new OtelService(
			otelSettingsService,
			mock<InstanceSettings>({ instanceId: 'inst-1', instanceType: 'main' }),
			logger,
			new OtelExporterFactory(logger, outboundHttp),
			otelSdk,
			mock<ModuleRegistry>(),
			publisher,
		);
	});

	afterEach(async () => {
		releaseHeldExports();
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

	it.each([
		{ parentSampled: false, tracesSampleRate: 1, isRecording: false },
		{ parentSampled: true, tracesSampleRate: 0, isRecording: true },
	])(
		'follows an incoming traceparent with sampled=$parentSampled at sample rate $tracesSampleRate',
		async ({ parentSampled, tracesSampleRate, isRecording }) => {
			otelSettingsService.loadSettings.mockResolvedValue({ ...enabledSettings, tracesSampleRate });
			await service.init();
			const remoteParent = trace.setSpanContext(ROOT_CONTEXT, {
				traceId: '0af7651916cd43dd8448eb211c80319c',
				spanId: 'b7ad6b7169203331',
				traceFlags: parentSampled ? TraceFlags.SAMPLED : TraceFlags.NONE,
				isRemote: true,
			});

			const span = trace.getTracer('n8n-workflow').startSpan('workflow.execute', {}, remoteParent);

			expect(span.isRecording()).toBe(isRecording);
		},
	);

	it('exports workflow spans with the saved settings, keeps the startup resource attributes and lets the n8n attributes win', async () => {
		await service.init();

		startWorkflowSpan().end();

		const [exported] = await exportedAfterFlush();
		expect(exported.url).toBe(COLLECTOR_A);
		expect(exported.span.resource.attributes).toMatchObject({
			'deployment.environment': 'repro',
			'telemetry.sdk.language': 'nodejs',
			[ATTR.OTEL_SERVICE_NAME]: 'n8n',
			[ATTR.OTEL_SERVICE_VERSION]: N8N_VERSION,
			[ATTR.INSTANCE_ID]: 'inst-1',
			[ATTR.INSTANCE_ROLE]: 'main',
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
		const controller = new OtelSettingsController(otelSettingsService, service);

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
			'Failed to cleanly shut down an OpenTelemetry exporter (its flush may have failed)',
			{ error: 'ECONNREFUSED' },
		);
	});

	it('finishes a save while the old exporter still flushes, then logs one warning when that flush fails', async () => {
		await service.init();
		urlsWithHeldExports.add(COLLECTOR_A);
		urlsWithFailingFlush.add(COLLECTOR_A);
		startWorkflowSpan().end();
		otelSettingsService.loadSettings.mockResolvedValue({
			...enabledSettings,
			exporterEndpoint: 'http://collector-b:4318',
		});

		await service.applySavedSettings();
		startWorkflowSpan().end();

		expect((await exportedAfterFlush()).map(({ url }) => url)).toEqual([COLLECTOR_B]);
		expect(logger.warn).not.toHaveBeenCalled();

		releaseHeldExports();
		await exportedAfterFlush();

		expect(logger.warn).toHaveBeenCalledTimes(1);
		expect(logger.warn).toHaveBeenCalledWith(
			'Failed to cleanly shut down an OpenTelemetry exporter (its flush may have failed)',
			{ error: 'ECONNREFUSED' },
		);
	});

	it('waits for background flushes before shutdown finishes', async () => {
		await service.init();
		urlsWithHeldExports.add(COLLECTOR_A);
		startWorkflowSpan().end();
		otelSettingsService.loadSettings.mockResolvedValue({
			...enabledSettings,
			exporterEndpoint: 'http://collector-b:4318',
		});
		await service.applySavedSettings();
		let isShutDown = false;

		const shutdown = service.shutdown().then(() => (isShutDown = true));
		await exportedAfterFlush();
		expect(isShutDown).toBe(false);

		releaseHeldExports();
		await shutdown;
		expect(exportedSpans.map(({ url }) => url)).toEqual([COLLECTOR_A]);
	});

	it('keeps the exporter when a save changes only the sample rate', async () => {
		await service.init();
		urlsWithHeldExports.add(COLLECTOR_A);
		startWorkflowSpan().end();
		vi.mocked(OTLPTraceExporter).mockClear();
		otelSettingsService.loadSettings.mockResolvedValue({
			...enabledSettings,
			tracesSampleRate: 0.5,
		});

		await service.applySavedSettings();
		releaseHeldExports();

		expect((await exportedAfterFlush()).map(({ url }) => url)).toEqual([COLLECTOR_A]);
		expect(OTLPTraceExporter).not.toHaveBeenCalled();
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it('turns tracing on and off through saves without a restart', async () => {
		const endSpanAndInjectHeaders = () => {
			const span = startWorkflowSpan();
			const headers: Record<string, string> = {};
			propagation.inject(trace.setSpan(ROOT_CONTEXT, span), headers);
			span.end();
			return headers;
		};
		const saveSettings = async (settings: OtelConfig) => {
			otelSettingsService.loadSettings.mockResolvedValueOnce(settings);
			await service.applySavedSettings();
		};

		otelSettingsService.loadSettings.mockResolvedValueOnce(disabledSettings);
		await service.init();
		expect(endSpanAndInjectHeaders()).toEqual({});
		expect(await exportedAfterFlush()).toHaveLength(0);

		await saveSettings(enabledSettings);
		endSpanAndInjectHeaders();
		expect(await exportedAfterFlush()).toHaveLength(1);

		await saveSettings(disabledSettings);
		expect(endSpanAndInjectHeaders()).toEqual({});
		expect(await exportedAfterFlush()).toHaveLength(1);

		await saveSettings(enabledSettings);
		endSpanAndInjectHeaders();
		expect(await exportedAfterFlush()).toHaveLength(2);
	});

	it('sends nothing at a sample rate of 0', async () => {
		otelSettingsService.loadSettings.mockResolvedValue({ ...enabledSettings, tracesSampleRate: 0 });
		await service.init();

		startWorkflowSpan().end();

		expect(await exportedAfterFlush()).toEqual([]);
	});

	it.each([
		{ injectOutbound: false, headerNames: [] },
		{ injectOutbound: true, headerNames: ['traceparent'] },
	])(
		'injects only $headerNames from a library, never baggage, when injectOutbound is $injectOutbound',
		async ({ injectOutbound, headerNames }) => {
			otelSettingsService.loadSettings.mockResolvedValue({ ...enabledSettings, injectOutbound });
			await service.init();

			const headers: Record<string, string> = {};
			propagation.inject(trace.setSpan(ROOT_CONTEXT, startWorkflowSpan()), headers);

			expect(Object.keys(headers)).toEqual(headerNames);
		},
	);

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
