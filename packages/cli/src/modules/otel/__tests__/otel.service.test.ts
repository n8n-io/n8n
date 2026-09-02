import type { Logger } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import { context, diag, metrics, propagation, trace } from '@opentelemetry/api';
import { OTLPTraceExporter as OTLPGrpcTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { BasicTracerProvider } from '@opentelemetry/sdk-trace-base';
import { mock } from 'vitest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { OtelConnectionParams, OtelSettingsService } from '../otel-settings.service';
import type { OtelConfig } from '../otel.config';
import { ATTR, OTEL_TEST_SPAN_NAME } from '../otel.constants';
import { OtelService } from '../otel.service';

const start = vi.fn();
const shutdown = vi.fn();

// The connectivity-check fetch, obtained via outboundHttp.transport().asCustomFetch().
// checkEndpointReachability ignores the response and only catches network errors.
const fetchMock = vi.fn();
const outboundHttp = {
	transport: () => ({ asCustomFetch: () => fetchMock }),
} as unknown as OutboundHttp;

// Hoisted because the service imports grpc-js lazily, inside the exporter and probe.
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

	/** Records only. `otel.service.grpc-deps.test.ts` owns the real key rules. */
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

vi.mock('@opentelemetry/sdk-node', () => ({
	NodeSDK: vi.fn().mockImplementation(function () {
		return {
			start,
			shutdown,
		};
	}),
}));

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
	BasicTracerProvider: vi.fn().mockImplementation(function (config: {
		spanProcessors?: unknown[];
	}) {
		const processors = (config.spanProcessors ?? []) as Array<{ onEnd: (span: unknown) => void }>;
		mockSpanEnd.mockImplementation(() => {
			for (const processor of processors) processor.onEnd({ name: 'n8n.test_trace' });
		});
		mockStartSpan.mockReturnValue({ end: mockSpanEnd });
		mockGetTracer.mockReturnValue({ startSpan: mockStartSpan });
		return { getTracer: mockGetTracer, shutdown: mockProviderShutdown };
	}),
}));

vi.mock('@opentelemetry/resources', () => ({
	resourceFromAttributes: vi.fn().mockReturnValue({}),
}));

vi.mock('@opentelemetry/sdk-trace-node', () => ({
	TraceIdRatioBasedSampler: vi.fn().mockImplementation(function () {
		return {};
	}),
}));

vi.mock('@opentelemetry/api', async () => ({
	...(await vi.importActual<typeof import('@opentelemetry/api')>('@opentelemetry/api')),
	trace: { disable: vi.fn() },
	context: { disable: vi.fn() },
	propagation: { disable: vi.fn() },
	metrics: { disable: vi.fn() },
	DiagLogLevel: { WARN: 'WARN' },
	diag: { setLogger: vi.fn() },
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
		service = new OtelService(otelSettingsService, instanceSettings, logger, outboundHttp);
	});

	describe('init', () => {
		it('does not start SDK when enabled is false', async () => {
			otelSettingsService.loadSettings.mockResolvedValue(disabledSettings);

			await service.init();

			expect(start).not.toHaveBeenCalled();
		});

		it('starts SDK when enabled is true', async () => {
			otelSettingsService.loadSettings.mockResolvedValue(enabledSettings);

			await service.init();

			expect(start).toHaveBeenCalledTimes(1);
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

		it('logs connectivity failure and still finishes startup', async () => {
			otelSettingsService.loadSettings.mockResolvedValue(enabledSettings);
			fetchMock.mockRejectedValue(new Error('connect ECONNREFUSED'));

			await service.init();
			await flushPromises();

			expect(start).toHaveBeenCalledTimes(1);
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
			expect(start).toHaveBeenCalledTimes(1);
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

			expect(start).toHaveBeenCalledTimes(1);
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
			expect(start).toHaveBeenCalledTimes(1);
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to connect to OpenTelemetry OTLP endpoint during startup',
				expect.objectContaining({ endpoint: 'not a valid endpoint' }),
			);
		});
	});

	describe('restart', () => {
		it('shuts down existing SDK then reloads settings and starts a new one', async () => {
			otelSettingsService.loadSettings.mockResolvedValue(enabledSettings);

			await service.init();
			vi.clearAllMocks();
			otelSettingsService.loadSettings.mockResolvedValue(enabledSettings);

			await service.restart();

			expect(shutdown).toHaveBeenCalledTimes(1);
			expect(otelSettingsService.loadSettings).toHaveBeenCalledTimes(1);
			expect(start).toHaveBeenCalledTimes(1);
		});

		it('does not start SDK after restart when reloaded settings have enabled=false', async () => {
			otelSettingsService.loadSettings.mockResolvedValueOnce(enabledSettings);
			otelSettingsService.loadSettings.mockResolvedValueOnce(disabledSettings);

			await service.init();
			vi.clearAllMocks();

			await service.restart();

			expect(start).not.toHaveBeenCalled();
		});
	});

	describe('SDK startup failure', () => {
		const exporterFailure = () => {
			vi.mocked(OTLPTraceExporter).mockImplementationOnce(function () {
				throw new Error('exporter unavailable');
			});
		};

		it('logs once and leaves tracing off instead of failing module init', async () => {
			otelSettingsService.loadSettings.mockResolvedValue(enabledSettings);
			exporterFailure();

			await expect(service.init()).resolves.not.toThrow();

			expect(start).not.toHaveBeenCalled();
			expect(fetchMock).not.toHaveBeenCalled();
			expect(logger.error).toHaveBeenCalledTimes(1);
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to start OpenTelemetry tracing, so tracing stays off',
				{ error: 'exporter unavailable' },
			);
		});

		it('tears down partially installed providers when the SDK start call throws', async () => {
			otelSettingsService.loadSettings.mockResolvedValue(enabledSettings);
			start.mockImplementationOnce(() => {
				throw new Error('provider registration failed');
			});

			await expect(service.init()).resolves.not.toThrow();

			expect(logger.error).toHaveBeenCalledWith(
				'Failed to start OpenTelemetry tracing, so tracing stays off',
				{ error: 'provider registration failed' },
			);
			expect(shutdown).toHaveBeenCalledTimes(1);
			expect(trace.disable).toHaveBeenCalledTimes(1);
		});

		it('leaves the service in a non-exporting state when a restart fails', async () => {
			otelSettingsService.loadSettings.mockResolvedValue(enabledSettings);
			await service.init();
			vi.clearAllMocks();
			exporterFailure();

			await expect(service.restart()).resolves.not.toThrow();

			expect(start).not.toHaveBeenCalled();
			expect(shutdown).toHaveBeenCalledTimes(1);

			shutdown.mockClear();
			await service.shutdown();

			// The failed start left no SDK behind, so the next shutdown has nothing to flush.
			expect(shutdown).not.toHaveBeenCalled();
		});
	});

	describe('shutdown', () => {
		it('disables all four OTel globals so the next SDK start can re-register providers', async () => {
			otelSettingsService.loadSettings.mockResolvedValue(enabledSettings);
			await service.init();

			await service.shutdown();

			expect(trace.disable).toHaveBeenCalledTimes(1);
			expect(context.disable).toHaveBeenCalledTimes(1);
			expect(propagation.disable).toHaveBeenCalledTimes(1);
			expect(metrics.disable).toHaveBeenCalledTimes(1);
		});

		it('does not throw when called before init', async () => {
			await expect(service.shutdown()).resolves.not.toThrow();
		});

		it('does not throw when the SDK shutdown rejects (e.g. exporter flush failure)', async () => {
			otelSettingsService.loadSettings.mockResolvedValue(enabledSettings);
			await service.init();
			shutdown.mockRejectedValueOnce(new Error('connect ECONNREFUSED 127.0.0.1:9'));

			await expect(service.shutdown()).resolves.not.toThrow();
		});
	});

	describe('diagnostics logger', () => {
		beforeEach(() => {
			(
				OtelService as unknown as { isDiagnosticsLoggerConfigured: boolean }
			).isDiagnosticsLoggerConfigured = false;
		});

		it('forwards all log levels to the n8n logger', async () => {
			otelSettingsService.loadSettings.mockResolvedValue(enabledSettings);
			await service.init();

			const capturedLogger = vi.mocked(diag.setLogger).mock.calls[0]?.[0];
			expect(capturedLogger).toBeDefined();

			capturedLogger.error('e');
			capturedLogger.warn('w');
			capturedLogger.info('i');
			capturedLogger.debug('d');
			capturedLogger.verbose('v');

			expect(logger.error).toHaveBeenCalledWith(
				'OpenTelemetry diagnostics error',
				expect.anything(),
			);
			expect(logger.warn).toHaveBeenCalledWith(
				'OpenTelemetry diagnostics warning',
				expect.anything(),
			);
			expect(logger.info).toHaveBeenCalledWith('OpenTelemetry diagnostics info', expect.anything());
			expect(logger.debug).toHaveBeenCalledTimes(2);
		});

		it('only configures the diag logger once across multiple init calls', async () => {
			otelSettingsService.loadSettings.mockResolvedValue(enabledSettings);

			await service.init();
			await service.restart();

			expect(diag.setLogger).toHaveBeenCalledTimes(1);
		});
	});

	describe('connectivity failure deduplication', () => {
		it('does not log a second failure within the same start cycle', async () => {
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

		it('discards a probe of the previous start and still logs the current failure', async () => {
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
			await service.restart();

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

	describe('invalid env var values', () => {
		afterEach(() => {
			delete process.env.N8N_OTEL_EXPORTER_OTLP_PROTOCOL;
			delete process.env.N8N_OTEL_EXPORTER_OTLP_ENDPOINT;
		});

		it('warns which env var is invalid and which value n8n uses instead', async () => {
			process.env.N8N_OTEL_EXPORTER_OTLP_PROTOCOL = 'http/json';
			process.env.N8N_OTEL_EXPORTER_OTLP_ENDPOINT = 'localhost:4318';
			otelSettingsService.loadSettings.mockResolvedValue(enabledSettings);

			await service.init();

			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining(
					'Ignoring the invalid value "http/json" of N8N_OTEL_EXPORTER_OTLP_PROTOCOL. n8n uses "http/protobuf" instead.',
				),
			);
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining(
					'Ignoring the invalid value "localhost:4318" of N8N_OTEL_EXPORTER_OTLP_ENDPOINT. n8n uses "http://localhost:4318" instead.',
				),
			);
		});

		it('stays quiet for a valid or an unset env var', async () => {
			process.env.N8N_OTEL_EXPORTER_OTLP_PROTOCOL = 'grpc';
			otelSettingsService.loadSettings.mockResolvedValue(grpcSettings);

			await service.init();

			expect(logger.warn).not.toHaveBeenCalled();
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

		it('does not register the test provider globally', async () => {
			await service.sendTestTrace(connection);

			expect(BasicTracerProvider).toHaveBeenCalledTimes(1);
			expect(start).not.toHaveBeenCalled();
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
