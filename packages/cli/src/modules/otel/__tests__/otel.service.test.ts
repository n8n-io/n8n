import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { Logger } from '@n8n/backend-common';

import { OtelConfig } from '../otel.config';
import { OtelService } from '../otel.service';

const start = jest.fn();
const shutdown = jest.fn();

jest.mock('@opentelemetry/sdk-node', () => ({
	NodeSDK: jest.fn().mockImplementation(() => ({
		start,
		shutdown,
	})),
}));

describe('OtelService', () => {
	const config = new OtelConfig();
	const instanceSettings = mock<InstanceSettings>();
	const logger = mock<Logger>();
	const service = new OtelService(config, instanceSettings, logger);

	beforeEach(() => {
		jest.clearAllMocks();
		start.mockReset();
		shutdown.mockReset();
	});

	it('should log startup connectivity failures and continue startup', async () => {
		const config = mock<OtelConfig>({
			enabled: true,
			exporterEndpoint: 'http://localhost:4318',
			exporterTracingPath: '/v1/traces',
			exporterHeaders: '',
			tracesSampleRate: 1,
			startupConnectivityTimeoutMs: 2_000,
		});
		const instanceSettings = mock<InstanceSettings>({
			instanceId: 'instance-1',
			instanceType: 'main',
		});
		const logger = mock<Logger>();
		const service = new OtelService(config, instanceSettings, logger);
		const fetchMock = jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED'));
		global.fetch = fetchMock as unknown as typeof fetch;

		service.init();
		await new Promise<void>((resolve) => {
			setImmediate(() => resolve());
		});

		expect(start).toHaveBeenCalledTimes(1);
		expect(logger.error).toHaveBeenCalledWith(
			'Failed to connect to OpenTelemetry OTLP endpoint during startup',
			expect.objectContaining({
				endpoint: 'http://localhost:4318/v1/traces',
			}),
		);
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
