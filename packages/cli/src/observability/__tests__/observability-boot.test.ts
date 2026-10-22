import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { startObservability } from '../observability-boot';
import { OtelSdk } from '../otel-sdk';

describe('startObservability', () => {
	const otelSdk = mock<OtelSdk>();
	const logger = mock<Logger>();

	beforeEach(() => {
		vi.clearAllMocks();
		Container.set(OtelSdk, otelSdk);
		Container.set(Logger, logger);
	});

	it('starts the OTel setup once', () => {
		startObservability();

		expect(otelSdk.start).toHaveBeenCalledTimes(1);
	});

	it('logs the error and lets n8n start when the OTel setup throws', () => {
		otelSdk.start.mockImplementationOnce(() => {
			throw new Error('setup failed');
		});

		expect(() => startObservability()).not.toThrow();
		expect(logger.error).toHaveBeenCalledWith(
			'Failed to set up observability at startup, so tracing stays off',
			{ error: 'setup failed' },
		);
	});
});
