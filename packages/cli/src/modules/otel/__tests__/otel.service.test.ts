import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

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

describe('OtelService', () => {
	beforeEach(() => {
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
});
