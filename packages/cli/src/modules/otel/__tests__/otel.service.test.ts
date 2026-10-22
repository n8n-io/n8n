import type { Logger } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { OTLPTraceExporter as OTLPGrpcTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { BasicTracerProvider } from '@opentelemetry/sdk-trace-base';
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-node';
import { mock } from 'vitest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { OtelConnectionParams, OtelSettingsService } from '../otel-settings.service';
import type { OtelConfig } from '../otel.config';
import { ATTR, OTEL_TEST_SPAN_NAME } from '../otel.constants';
import { OtelService } from '../otel.service';

import type { OtelSdk } from '@/observability/otel-sdk';
import { TRACING_OFF } from '@/observability/swappable-pipeline';

// The connectivity-check fetch, obtained via outboundHttp.transport().asCustomFetch().
// checkEndpointReachability ignores the response and only catches network errors.
const fetchMock = vi.fn();
const outboundHttp = {
	transport: () => ({ asCustomFetch: () => fetchMock }),
} as unknown as OutboundHttp;

const {
	metadataEntries,
	MetadataMock,
	ClientMock,
	newClient,
	waitForReady,
	clientClose,
	credentialsMock,
	SSL_CREDS,
	INSECURE_CREDS,
} = vi.hoisted(() => {
	const entries = new Map<string, string>();

	class MetadataMock {
		set(key: string, value: string) {
			entries.set(key, value);
		}
	}

	const sslCreds = { kind: 'ssl' };
	const insecureCreds = { kind: 'insecure' };
	const newClient = vi.fn();
	const waitForReady = vi.fn();
	const clientClose = vi.fn();

	class ClientMock {
		constructor(target: string, credentials: unknown, options: unknown) {
			newClient(target, credentials, options);
		}

		waitForReady(deadline: number, callback: (error?: Error) => void) {
			waitForReady(deadline, callback);
		}

		close() {
			clientClose();
		}
	}

	return {
		metadataEntries: entries,
		MetadataMock,
		ClientMock,
		newClient,
		waitForReady,
		clientClose,
		credentialsMock: {
			createSsl: vi.fn(() => sslCreds),
			createInsecure: vi.fn(() => insecureCreds),
		},
		SSL_CREDS: sslCreds,
		INSECURE_CREDS: insecureCreds,
	};
});

// Per-test control of what the throwaway exporter reports back, plus span/shutdown spies.
let mockExportImpl: (spans: unknown[], resultCallback: (result: { error?: Error }) => void) => void;
const mockExporterShutdown = vi.fn().mockResolvedValue(undefined);
const mockGrpcExporterShutdown = vi.fn().mockResolvedValue(undefined);
const mockProviderShutdown = vi.fn().mockResolvedValue(undefined);
const mockSpanEnd = vi.fn();
const mockStartSpan = vi.fn();
const mockGetTracer = vi.fn();

vi.mock('@opentelemetry/exporter-trace-otlp-proto', () => ({
	OTLPTraceExporter: vi.fn().mockImplementation(function () {
		return {
			export: (spans: unknown[], resultCallback: (result: { error?: Error }) => void) =>
				mockExportImpl(spans, resultCallback),
			shutdown: mockExporterShutdown,
		};
	}),
}));

vi.mock('@opentelemetry/exporter-trace-otlp-grpc', () => ({
	OTLPTraceExporter: vi.fn().mockImplementation(function () {
		return {
			export: (spans: unknown[], resultCallback: (result: { error?: Error }) => void) =>
				mockExportImpl(spans, resultCallback),
			shutdown: mockGrpcExporterShutdown,
		};
	}),
}));

vi.mock('@grpc/grpc-js', () => ({
	Metadata: MetadataMock,
	Client: ClientMock,
	credentials: credentialsMock,
}));

vi.mock('@opentelemetry/sdk-trace-base', () => ({
	AlwaysOffSampler: vi.fn(),
	BatchSpanProcessor: vi.fn(),
	BasicTracerProvider: vi.fn().mockImplementation(function (config: {
		spanProcessors?: unknown[];
	}) {
		const processors = (config.spanProcessors ?? []) as Array<{ onEnd: (span: unknown) => void }>;
		mockSpanEnd.mockImplementation(() => {
			for (const processor of processors) processor.onEnd({ name: 'n8n.test_trace' });
		});
		mockStartSpan.mockReturnValue({ end: mockSpanEnd, isRecording: () => false });
		mockGetTracer.mockReturnValue({ startSpan: mockStartSpan });
		return { getTracer: mockGetTracer, shutdown: mockProviderShutdown };
	}),
}));

vi.mock('@opentelemetry/resources', () => ({
	resourceFromAttributes: vi.fn().mockReturnValue({ merge: () => ({}) }),
	detectResources: vi.fn().mockReturnValue({}),
	envDetector: {},
	processDetector: {},
	hostDetector: {},
}));

vi.mock('@opentelemetry/sdk-trace-node', () => ({
	TraceIdRatioBasedSampler: vi.fn().mockImplementation(function () {
		return {};
	}),
}));

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

const grpcSettings: OtelConfig = {
	...enabledSettings,
	exporterProtocol: 'grpc',
	exporterEndpoint: 'http://collector.example.com:4317',
};

async function flushPromises() {
	return await new Promise<void>((resolve) => setImmediate(resolve));
}

describe('OtelService', () => {
	let otelSettingsService: ReturnType<typeof mock<OtelSettingsService>>;
	let instanceSettings: ReturnType<typeof mock<InstanceSettings>>;
	let logger: ReturnType<typeof mock<Logger>>;
	let otelSdk: ReturnType<typeof mock<OtelSdk>>;
	let service: OtelService;

	beforeEach(() => {
		vi.clearAllMocks();
		metadataEntries.clear();
		otelSettingsService = mock<OtelSettingsService>();
		instanceSettings = mock<InstanceSettings>({ instanceId: 'inst-1', instanceType: 'main' });
		logger = mock<Logger>();
		fetchMock.mockResolvedValue({ ok: true });
		waitForReady.mockImplementation((_deadline: number, callback: (error?: Error) => void) =>
			callback(),
		);
		otelSdk = mock<OtelSdk>({ isRunning: true });
		otelSdk.apply.mockResolvedValue([]);
		service = new OtelService(otelSettingsService, instanceSettings, logger, outboundHttp, otelSdk);
	});
	afterEach(() => vi.restoreAllMocks());

	describe('init', () => {
		it('applies the no-op parts and builds no exporter when OTel is off', async () => {
			otelSettingsService.loadSettings.mockResolvedValue(disabledSettings);

			await service.init();

			expect(otelSdk.apply).toHaveBeenCalledWith(TRACING_OFF);
			expect(OTLPTraceExporter).not.toHaveBeenCalled();
		});

		it('applies an export pipeline with the saved sample rate when OTel is on', async () => {
			otelSettingsService.loadSettings.mockResolvedValue({
				...enabledSettings,
				tracesSampleRate: 0.25,
			});

			await service.init();

			expect(TraceIdRatioBasedSampler).toHaveBeenCalledWith(0.25);
			expect(otelSdk.apply).toHaveBeenCalledWith(
				expect.objectContaining({
					spanProcessors: [expect.anything(), expect.anything()],
					propagator: expect.any(W3CTraceContextPropagator),
				}),
			);
		});

		it('applies no outbound propagator when outbound trace headers are off', async () => {
			otelSettingsService.loadSettings.mockResolvedValue({
				...enabledSettings,
				injectOutbound: false,
			});

			await service.init();

			expect(otelSdk.apply).toHaveBeenCalledWith(
				expect.objectContaining({ propagator: TRACING_OFF.propagator }),
			);
		});

		it('builds the HTTP exporter with the traces path and no gRPC exporter', async () => {
			otelSettingsService.loadSettings.mockResolvedValue({
				...enabledSettings,
				exporterHeaders: 'auth=token',
			});

			await service.init();

			expect(OTLPTraceExporter).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'http://localhost:4318/v1/traces',
					headers: { auth: 'token' },
				}),
			);
			expect(OTLPGrpcTraceExporter).not.toHaveBeenCalled();
		});

		it('builds no exporter and sends no probe when the OpenTelemetry setup does not run', async () => {
			const stoppedSdk = mock<OtelSdk>({ isRunning: false });
			service = new OtelService(
				otelSettingsService,
				instanceSettings,
				logger,
				outboundHttp,
				stoppedSdk,
			);
			otelSettingsService.loadSettings.mockResolvedValue(enabledSettings);

			await service.init();
			await flushPromises();

			expect(otelSettingsService.loadSettings).toHaveBeenCalledTimes(1);
			expect(OTLPTraceExporter).not.toHaveBeenCalled();
			expect(fetchMock).not.toHaveBeenCalled();
			expect(stoppedSdk.apply).not.toHaveBeenCalled();
		});

		it('logs connectivity failure and still finishes startup', async () => {
			otelSettingsService.loadSettings.mockResolvedValue(enabledSettings);
			fetchMock.mockRejectedValue(new Error('connect ECONNREFUSED'));

			await service.init();
			await flushPromises();

			expect(otelSdk.apply).toHaveBeenCalledTimes(1);
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to connect to OpenTelemetry OTLP endpoint during startup',
				expect.objectContaining({ endpoint: 'http://localhost:4318/v1/traces' }),
			);
		});
	});

	describe('gRPC protocol', () => {
		it('builds the gRPC exporter with the endpoint as-is and never the HTTP one', async () => {
			otelSettingsService.loadSettings.mockResolvedValue(grpcSettings);

			await service.init();

			expect(OTLPGrpcTraceExporter).toHaveBeenCalledWith(
				expect.objectContaining({ url: 'http://collector.example.com:4317' }),
			);
			expect(OTLPTraceExporter).not.toHaveBeenCalled();
			expect(otelSdk.apply).toHaveBeenCalledTimes(1);
		});

		it('lowercases only the endpoint scheme before it reaches the exporter', async () => {
			otelSettingsService.loadSettings.mockResolvedValue({
				...grpcSettings,
				exporterEndpoint: 'HTTP://Collector.Example.com:4317',
			});

			await service.init();

			expect(OTLPGrpcTraceExporter).toHaveBeenCalledWith(
				expect.objectContaining({ url: 'http://Collector.Example.com:4317' }),
			);
		});

		it('converts exporter headers into lowercased gRPC metadata', async () => {
			otelSettingsService.loadSettings.mockResolvedValue({
				...grpcSettings,
				exporterHeaders: 'Authorization=Bearer abc,x-tenant=acme',
			});

			await service.init();

			expect(OTLPGrpcTraceExporter).toHaveBeenCalledWith(
				expect.objectContaining({ metadata: expect.any(MetadataMock) }),
			);
			expect(Object.fromEntries(metadataEntries)).toEqual({
				authorization: 'Bearer abc',
				'x-tenant': 'acme',
			});
		});

		it('probes channel readiness instead of sending an HTTP request', async () => {
			otelSettingsService.loadSettings.mockResolvedValue(grpcSettings);
			const startedAt = Date.now();

			await service.init();
			await flushPromises();

			expect(newClient).toHaveBeenCalledWith('collector.example.com:4317', INSECURE_CREDS, {});
			const [deadline] = waitForReady.mock.calls[0] as [number];
			expect(deadline).toBeGreaterThanOrEqual(startedAt + 2_000);
			expect(deadline).toBeLessThanOrEqual(Date.now() + 2_000);
			expect(fetchMock).not.toHaveBeenCalled();
			expect(clientClose).toHaveBeenCalledTimes(1);
			expect(logger.error).not.toHaveBeenCalled();
		});

		it('uses SSL credentials for an https endpoint', async () => {
			otelSettingsService.loadSettings.mockResolvedValue({
				...grpcSettings,
				exporterEndpoint: 'https://collector.example.com:4317',
			});

			await service.init();
			await flushPromises();

			expect(newClient).toHaveBeenCalledWith('collector.example.com:4317', SSL_CREDS, {});
		});

		it('leaves the target port-less so grpc-js applies its own default port', async () => {
			otelSettingsService.loadSettings.mockResolvedValue({
				...grpcSettings,
				exporterEndpoint: 'https://collector.example.com',
			});

			await service.init();
			await flushPromises();

			expect(newClient).toHaveBeenCalledWith('collector.example.com', SSL_CREDS, {});
		});

		it('keeps the brackets of an IPv6 host in the channel target', async () => {
			otelSettingsService.loadSettings.mockResolvedValue({
				...grpcSettings,
				exporterEndpoint: 'http://[::1]:4317',
			});

			await service.init();
			await flushPromises();

			expect(newClient).toHaveBeenCalledWith('[::1]:4317', INSECURE_CREDS, {});
		});

		it('logs a single connectivity failure when the channel does not become ready', async () => {
			otelSettingsService.loadSettings.mockResolvedValue(grpcSettings);
			waitForReady.mockImplementation((_deadline: number, callback: (error?: Error) => void) => {
				callback(new Error('Failed to connect before the deadline'));
				callback(new Error('Failed to connect before the deadline'));
			});

			await service.init();
			await flushPromises();

			expect(logger.error).toHaveBeenCalledTimes(1);
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to connect to OpenTelemetry OTLP endpoint during startup',
				{
					endpoint: 'http://collector.example.com:4317',
					error: expect.stringContaining(
						'gRPC channel to "collector.example.com:4317" was not ready after 2000ms',
					),
				},
			);
			expect(clientClose).toHaveBeenCalledTimes(1);
		});

		it('names the default port and the ignored TLS material in a port-less https failure', async () => {
			otelSettingsService.loadSettings.mockResolvedValue({
				...grpcSettings,
				exporterEndpoint: 'https://collector.example.com',
			});
			waitForReady.mockImplementation((_deadline: number, callback: (error?: Error) => void) =>
				callback(new Error('Failed to connect before the deadline')),
			);

			await service.init();
			await flushPromises();

			const [, logContext] = logger.error.mock.calls[0] as [string, { error: string }];
			expect(logContext.error).toContain('grpc-js dials its default 443, not 4317');
			expect(logContext.error).toContain('OTEL_EXPORTER_OTLP_CERTIFICATE');
			expect(logContext.error).toContain('still receive spans');
		});

		it('leaves out the TLS-material note for a plaintext endpoint', async () => {
			otelSettingsService.loadSettings.mockResolvedValue(grpcSettings);
			waitForReady.mockImplementation((_deadline: number, callback: (error?: Error) => void) =>
				callback(new Error('Failed to connect before the deadline')),
			);

			await service.init();
			await flushPromises();

			const [, logContext] = logger.error.mock.calls[0] as [string, { error: string }];
			expect(logContext.error).not.toContain('OTEL_EXPORTER_OTLP_CERTIFICATE');
			expect(logContext.error).not.toContain('default 443');
		});

		it('logs a connectivity failure when the readiness check throws', async () => {
			otelSettingsService.loadSettings.mockResolvedValue(grpcSettings);
			waitForReady.mockImplementation(() => {
				throw new Error('The channel has been closed');
			});

			await service.init();
			await flushPromises();

			expect(otelSdk.apply).toHaveBeenCalledTimes(1);
			expect(logger.error).toHaveBeenCalledTimes(1);
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to connect to OpenTelemetry OTLP endpoint during startup',
				expect.objectContaining({ error: 'The channel has been closed' }),
			);
			expect(clientClose).toHaveBeenCalledTimes(1);
		});

		it('logs a connectivity failure instead of throwing when the endpoint is unparseable', async () => {
			otelSettingsService.loadSettings.mockResolvedValue({
				...grpcSettings,
				exporterEndpoint: 'not a valid endpoint',
			});

			await service.init();
			await flushPromises();

			expect(newClient).not.toHaveBeenCalled();
			expect(otelSdk.apply).toHaveBeenCalledTimes(1);
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to connect to OpenTelemetry OTLP endpoint during startup',
				expect.objectContaining({ endpoint: 'not a valid endpoint' }),
			);
		});
	});

	describe('applySavedSettings', () => {
		it('reloads the settings and applies them again', async () => {
			otelSettingsService.loadSettings.mockResolvedValue(enabledSettings);
			await service.init();
			vi.clearAllMocks();
			otelSettingsService.loadSettings.mockResolvedValue(enabledSettings);

			await service.applySavedSettings();

			expect(otelSettingsService.loadSettings).toHaveBeenCalledTimes(1);
			expect(otelSdk.apply).toHaveBeenCalledTimes(1);
			expect(otelSdk.apply).not.toHaveBeenCalledWith(TRACING_OFF);
		});

		it('applies the no-op parts when a save turns OTel off', async () => {
			otelSettingsService.loadSettings.mockResolvedValueOnce(enabledSettings);
			otelSettingsService.loadSettings.mockResolvedValueOnce(disabledSettings);
			await service.init();

			await service.applySavedSettings();

			expect(otelSdk.apply).toHaveBeenLastCalledWith(TRACING_OFF);
		});
	});

	describe('exporter build failure', () => {
		const exporterFailure = () => {
			vi.mocked(OTLPTraceExporter).mockImplementationOnce(function () {
				throw new Error('exporter unavailable');
			});
		};

		it('logs once and leaves tracing off instead of failing module init', async () => {
			otelSettingsService.loadSettings.mockResolvedValue(enabledSettings);
			exporterFailure();

			await expect(service.init()).resolves.not.toThrow();

			expect(otelSdk.apply).toHaveBeenCalledWith(TRACING_OFF);
			expect(fetchMock).not.toHaveBeenCalled();
			expect(logger.error).toHaveBeenCalledTimes(1);
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to start OpenTelemetry tracing, so tracing stays off',
				{ error: 'exporter unavailable' },
			);
		});

		it('leaves tracing off when a later save cannot build the exporter', async () => {
			otelSettingsService.loadSettings.mockResolvedValue(enabledSettings);
			await service.init();
			exporterFailure();

			await expect(service.applySavedSettings()).resolves.not.toThrow();

			expect(otelSdk.apply).toHaveBeenLastCalledWith(TRACING_OFF);
		});
	});

	describe('shutdown', () => {
		it('shuts down the OTel setup, which flushes the running exporter', async () => {
			otelSettingsService.loadSettings.mockResolvedValue(enabledSettings);
			await service.init();

			await service.shutdown();

			expect(otelSdk.shutdown).toHaveBeenCalledTimes(1);
		});

		it('does not throw when called before init', async () => {
			await expect(service.shutdown()).resolves.not.toThrow();
		});

		it('logs one warning when the exporter flush fails', async () => {
			otelSettingsService.loadSettings.mockResolvedValue(enabledSettings);
			await service.init();
			otelSdk.shutdown.mockRejectedValueOnce(new Error('connect ECONNREFUSED 127.0.0.1:9'));

			await service.shutdown();

			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to cleanly shut down the previous OpenTelemetry exporter (its flush may have failed)',
				{ error: 'connect ECONNREFUSED 127.0.0.1:9' },
			);
		});
	});

	describe('connectivity failure deduplication', () => {
		it('does not log a second failure for the same exporter', async () => {
			otelSettingsService.loadSettings.mockResolvedValue(enabledSettings);
			let rejectFn!: () => void;
			fetchMock.mockImplementation(
				async () =>
					await new Promise<never>((_, reject) => {
						rejectFn = () => reject(new Error('ECONNREFUSED'));
					}),
			);

			await service.init();
			rejectFn();
			rejectFn();
			await flushPromises();

			expect(logger.error).toHaveBeenCalledTimes(1);
		});

		it('discards a probe of the previous exporter and still logs the current failure', async () => {
			const rejectProbes: Array<(error: Error) => void> = [];
			fetchMock.mockImplementation(
				async () => await new Promise<never>((_, reject) => rejectProbes.push(reject)),
			);
			otelSettingsService.loadSettings.mockResolvedValue(enabledSettings);
			await service.init();

			otelSettingsService.loadSettings.mockResolvedValue({
				...enabledSettings,
				exporterEndpoint: 'http://new-collector:4318',
			});
			await service.applySavedSettings();

			rejectProbes[0](new Error('ECONNREFUSED on the old endpoint'));
			await flushPromises();

			expect(logger.error).not.toHaveBeenCalled();

			rejectProbes[1](new Error('ECONNREFUSED on the new endpoint'));
			await flushPromises();

			expect(logger.error).toHaveBeenCalledTimes(1);
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to connect to OpenTelemetry OTLP endpoint during startup',
				{
					endpoint: 'http://new-collector:4318/v1/traces',
					error: 'ECONNREFUSED on the new endpoint',
				},
			);
		});

		it('discards a probe that fails while the service is shutting down', async () => {
			let rejectProbe!: (error: Error) => void;
			fetchMock.mockImplementation(
				async () => await new Promise<never>((_, reject) => (rejectProbe = reject)),
			);
			otelSettingsService.loadSettings.mockResolvedValue(enabledSettings);
			await service.init();

			await service.shutdown();
			rejectProbe(new Error('ECONNREFUSED on the endpoint being left'));
			await flushPromises();

			expect(logger.error).not.toHaveBeenCalled();
		});

		it('logs string errors that are not Error instances', async () => {
			otelSettingsService.loadSettings.mockResolvedValue(enabledSettings);
			fetchMock.mockRejectedValue('string-error');

			await service.init();
			await flushPromises();

			expect(logger.error).toHaveBeenCalledWith(
				'Failed to connect to OpenTelemetry OTLP endpoint during startup',
				expect.objectContaining({ error: 'string-error' }),
			);
		});
	});

	describe('parseHeaders', () => {
		it('should parse a single header', () => {
			expect(service.parseOtlpHeaders('key=value')).toEqual({ key: 'value' });
		});

		it('should parse multiple headers', () => {
			expect(service.parseOtlpHeaders('k1=v1,k2=v2')).toEqual({ k1: 'v1', k2: 'v2' });
		});

		it('should preserve = in values', () => {
			expect(service.parseOtlpHeaders('Authorization=Bearer abc=def')).toEqual({
				Authorization: 'Bearer abc=def',
			});
		});

		it('should trim whitespace from keys and values', () => {
			expect(service.parseOtlpHeaders(' key = value , k2 = v2 ')).toEqual({
				key: 'value',
				k2: 'v2',
			});
		});

		it('should warn and skip entry missing "=" separator', () => {
			expect(service.parseOtlpHeaders('keyonly')).toEqual({});
			expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('missing "=" separator'));
		});

		it('should warn and skip entry with empty key', () => {
			expect(service.parseOtlpHeaders('=value')).toEqual({});
			expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('empty key'));
		});

		it('should return empty object for empty string', () => {
			expect(service.parseOtlpHeaders('')).toEqual({});
		});

		it('should skip empty segments from trailing commas', () => {
			expect(service.parseOtlpHeaders('key=value,')).toEqual({ key: 'value' });
		});
	});

	describe('sendTestTrace', () => {
		const connection: OtelConnectionParams = {
			exporterProtocol: 'http/protobuf',
			exporterEndpoint: 'https://collector.example.com',
			exporterTracingPath: '/v1/traces',
			exporterServiceName: 'n8n-prod',
			exporterHeaders: 'auth=token',
			startupConnectivityTimeoutMs: 3_000,
		};

		beforeEach(() => {
			mockExportImpl = (_spans, resultCallback) => resultCallback({});
		});

		it('returns success when the exporter reports no error', async () => {
			const result = await service.sendTestTrace(connection);

			expect(result).toEqual({ success: true });
		});

		it("returns failure with the collector's error message", async () => {
			mockExportImpl = (_spans, resultCallback) =>
				resultCallback({ error: new Error('401 Unauthorized') });

			const result = await service.sendTestTrace(connection);

			expect(result).toEqual({ success: false, error: '401 Unauthorized' });
		});

		it('strips a trailing empty resolution note from the error message', async () => {
			mockExportImpl = (_spans, resultCallback) =>
				resultCallback({
					error: new Error(
						'14 UNAVAILABLE: No connection established. Last error: Protocol error. Resolution note: ',
					),
				});

			const result = await service.sendTestTrace(connection);

			expect(result).toEqual({
				success: false,
				error: '14 UNAVAILABLE: No connection established. Last error: Protocol error.',
			});
		});

		it('keeps a resolution note that carries text', async () => {
			mockExportImpl = (_spans, resultCallback) =>
				resultCallback({
					error: new Error('14 UNAVAILABLE: … Resolution note: DNS lookup used a proxy'),
				});

			const result = await service.sendTestTrace(connection);

			expect(result).toEqual({
				success: false,
				error: '14 UNAVAILABLE: … Resolution note: DNS lookup used a proxy',
			});
		});

		it('returns failure instead of throwing when the exporter cannot be built', async () => {
			vi.mocked(OTLPTraceExporter).mockImplementationOnce(function () {
				throw new Error('Configuration: timeoutMillis is invalid');
			});

			const result = await service.sendTestTrace(connection);

			expect(result).toEqual({ success: false, error: 'Configuration: timeoutMillis is invalid' });
		});

		it('builds the exporter with the OTLP url, parsed headers and supplied timeout', async () => {
			await service.sendTestTrace(connection);

			expect(OTLPTraceExporter).toHaveBeenCalledWith({
				url: 'https://collector.example.com/v1/traces',
				headers: { auth: 'token' },
				timeoutMillis: 3_000,
			});
		});

		it('emits a single n8n.test_trace span flagged as a test', async () => {
			await service.sendTestTrace(connection);

			expect(mockStartSpan).toHaveBeenCalledWith(OTEL_TEST_SPAN_NAME, {
				attributes: { [ATTR.IS_TEST_TRACE]: true },
			});
		});

		it('shuts down the throwaway provider and exporter when done', async () => {
			await service.sendTestTrace(connection);

			expect(mockProviderShutdown).toHaveBeenCalledTimes(1);
			expect(mockExporterShutdown).toHaveBeenCalledTimes(1);
		});

		it('sends through a throwaway provider and leaves the running setup alone', async () => {
			await service.sendTestTrace(connection);

			expect(BasicTracerProvider).toHaveBeenCalledTimes(1);
			expect(otelSdk.apply).not.toHaveBeenCalled();
		});

		describe('over gRPC', () => {
			const grpcConnection: OtelConnectionParams = {
				...connection,
				exporterProtocol: 'grpc',
				exporterEndpoint: 'https://collector.example.com:4317',
			};

			it('builds the gRPC exporter with the endpoint as-is, metadata and supplied timeout', async () => {
				const result = await service.sendTestTrace(grpcConnection);

				expect(OTLPGrpcTraceExporter).toHaveBeenCalledWith({
					url: 'https://collector.example.com:4317',
					metadata: expect.any(MetadataMock),
					timeoutMillis: 3_000,
				});
				expect(Object.fromEntries(metadataEntries)).toEqual({ auth: 'token' });
				expect(OTLPTraceExporter).not.toHaveBeenCalled();
				expect(result).toEqual({ success: true });
			});

			it('shuts down the throwaway provider and gRPC exporter when done', async () => {
				await service.sendTestTrace(grpcConnection);

				expect(mockProviderShutdown).toHaveBeenCalledTimes(1);
				expect(mockGrpcExporterShutdown).toHaveBeenCalledTimes(1);
				expect(mockExporterShutdown).not.toHaveBeenCalled();
			});
		});
	});
});
