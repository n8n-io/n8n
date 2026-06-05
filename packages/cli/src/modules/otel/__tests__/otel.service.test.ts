import type { Logger } from '@n8n/backend-common';
import { context, diag, metrics, propagation, trace } from '@opentelemetry/api';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { OtelSettingsService } from '../otel-settings.service';
import type { OtelConfig } from '../otel.config';
import { OtelService } from '../otel.service';

const start = jest.fn();
const shutdown = jest.fn();

jest.mock('@opentelemetry/sdk-node', () => ({
	NodeSDK: jest.fn().mockImplementation(() => ({
		start,
		shutdown,
	})),
}));

jest.mock('@opentelemetry/exporter-trace-otlp-proto', () => ({
	OTLPTraceExporter: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@opentelemetry/resources', () => ({
	resourceFromAttributes: jest.fn().mockReturnValue({}),
}));

jest.mock('@opentelemetry/sdk-trace-node', () => ({
	TraceIdRatioBasedSampler: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@opentelemetry/api', () => ({
	...jest.requireActual('@opentelemetry/api'),
	trace: { disable: jest.fn() },
	context: { disable: jest.fn() },
	propagation: { disable: jest.fn() },
	metrics: { disable: jest.fn() },
	DiagLogLevel: { WARN: 'WARN' },
	diag: { setLogger: jest.fn() },
}));

const enabledSettings: OtelConfig = {
	enabled: true,
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

async function flushPromises() {
	return await new Promise<void>((resolve) => setImmediate(resolve));
}

describe('OtelService', () => {
	let otelSettingsService: ReturnType<typeof mock<OtelSettingsService>>;
	let instanceSettings: ReturnType<typeof mock<InstanceSettings>>;
	let logger: ReturnType<typeof mock<Logger>>;
	let service: OtelService;

	beforeEach(() => {
		jest.clearAllMocks();
		otelSettingsService = mock<OtelSettingsService>();
		instanceSettings = mock<InstanceSettings>({ instanceId: 'inst-1', instanceType: 'main' });
		logger = mock<Logger>();
		service = new OtelService(otelSettingsService, instanceSettings, logger);
	});

	describe('init', () => {
		it('does not start SDK when enabled is false', async () => {
			otelSettingsService.loadEffective.mockResolvedValue(disabledSettings);

			await service.init();

			expect(start).not.toHaveBeenCalled();
		});

		it('starts SDK when enabled is true', async () => {
			otelSettingsService.loadEffective.mockResolvedValue(enabledSettings);
			global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;

			await service.init();

			expect(start).toHaveBeenCalledTimes(1);
		});

		it('logs connectivity failure and still finishes startup', async () => {
			otelSettingsService.loadEffective.mockResolvedValue(enabledSettings);
			global.fetch = jest
				.fn()
				.mockRejectedValue(new Error('connect ECONNREFUSED')) as unknown as typeof fetch;

			await service.init();
			await flushPromises();

			expect(start).toHaveBeenCalledTimes(1);
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to connect to OpenTelemetry OTLP endpoint during startup',
				expect.objectContaining({ endpoint: 'http://localhost:4318/v1/traces' }),
			);
		});
	});

	describe('restart', () => {
		it('shuts down existing SDK then starts a new one with loadSaved settings', async () => {
			otelSettingsService.loadEffective.mockResolvedValue(enabledSettings);
			otelSettingsService.loadSaved.mockResolvedValue(enabledSettings);
			global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;

			await service.init();
			jest.clearAllMocks();

			await service.restart();

			expect(shutdown).toHaveBeenCalledTimes(1);
			expect(otelSettingsService.loadSaved).toHaveBeenCalledTimes(1);
			expect(start).toHaveBeenCalledTimes(1);
		});

		it('does not start SDK after restart when loadSaved returns enabled=false', async () => {
			otelSettingsService.loadEffective.mockResolvedValue(enabledSettings);
			otelSettingsService.loadSaved.mockResolvedValue(disabledSettings);
			global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;

			await service.init();
			jest.clearAllMocks();

			await service.restart();

			expect(start).not.toHaveBeenCalled();
		});
	});

	describe('shutdown', () => {
		it('disables all four OTel globals so the next SDK start can re-register providers', async () => {
			otelSettingsService.loadEffective.mockResolvedValue(enabledSettings);
			global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
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
	});

	describe('diagnostics logger', () => {
		beforeEach(() => {
			(
				OtelService as unknown as { isDiagnosticsLoggerConfigured: boolean }
			).isDiagnosticsLoggerConfigured = false;
		});

		it('forwards all log levels to the n8n logger', async () => {
			otelSettingsService.loadEffective.mockResolvedValue(enabledSettings);
			global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
			await service.init();

			const capturedLogger = jest.mocked(diag.setLogger).mock.calls[0]?.[0];
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
			otelSettingsService.loadEffective.mockResolvedValue(enabledSettings);
			otelSettingsService.loadSaved.mockResolvedValue(enabledSettings);
			global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;

			await service.init();
			await service.restart();

			expect(diag.setLogger).toHaveBeenCalledTimes(1);
		});
	});

	describe('connectivity failure deduplication', () => {
		it('does not log a second failure within the same start cycle', async () => {
			otelSettingsService.loadEffective.mockResolvedValue(enabledSettings);
			let rejectFn!: () => void;
			global.fetch = jest.fn().mockImplementation(
				async () =>
					await new Promise<never>((_, reject) => {
						rejectFn = () => reject(new Error('ECONNREFUSED'));
					}),
			) as unknown as typeof fetch;

			await service.init();
			rejectFn();
			rejectFn();
			await flushPromises();

			expect(logger.error).toHaveBeenCalledTimes(1);
		});

		it('logs string errors that are not Error instances', async () => {
			otelSettingsService.loadEffective.mockResolvedValue(enabledSettings);
			global.fetch = jest.fn().mockRejectedValue('string-error') as unknown as typeof fetch;

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
});
