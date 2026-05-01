import { Container } from '@n8n/di';

import { GlobalConfig, validateEndpointPaths } from '../src/index';

describe('validateEndpointPaths', () => {
	const baseEndpoints = () => {
		Container.reset();
		return Container.get(GlobalConfig).endpoints;
	};

	it('accepts the default configuration', () => {
		const endpoints = baseEndpoints();

		expect(() => validateEndpointPaths(endpoints)).not.toThrow();
	});

	it('rejects when a test endpoint is path-segment-prefixed by the production endpoint', () => {
		const endpoints = baseEndpoints();
		endpoints.webhook = 'Aegie7beasha1aighoh4Ihi4ekoh1yee';
		endpoints.webhookTest = 'Aegie7beasha1aighoh4Ihi4ekoh1yee/test';

		expect(() => validateEndpointPaths(endpoints)).toThrow(
			/N8N_ENDPOINT_WEBHOOK="Aegie7beasha1aighoh4Ihi4ekoh1yee" shadows N8N_ENDPOINT_WEBHOOK_TEST="Aegie7beasha1aighoh4Ihi4ekoh1yee\/test"/,
		);
	});

	it('rejects when two endpoints have the same value', () => {
		const endpoints = baseEndpoints();
		endpoints.webhook = 'shared';
		endpoints.form = 'shared';

		expect(() => validateEndpointPaths(endpoints)).toThrow(/shadows/);
	});

	it('reports all conflicts together', () => {
		const endpoints = baseEndpoints();
		endpoints.webhook = 'wh';
		endpoints.webhookTest = 'wh/test';
		endpoints.webhookWaiting = 'wh/wait';

		const error = (() => {
			try {
				validateEndpointPaths(endpoints);
				return null;
			} catch (e) {
				return e as Error;
			}
		})();

		expect(error).not.toBeNull();
		expect(error?.message).toContain('N8N_ENDPOINT_WEBHOOK_TEST');
		expect(error?.message).toContain('N8N_ENDPOINT_WEBHOOK_WAIT');
	});

	it('does not flag values that share a prefix substring but not a path segment', () => {
		const endpoints = baseEndpoints();
		endpoints.webhook = 'webhook';
		endpoints.webhookTest = 'webhook-test';
		endpoints.webhookWaiting = 'webhook-waiting';

		expect(() => validateEndpointPaths(endpoints)).not.toThrow();
	});

	it('allows multi-segment values when no value is a path-segment prefix of another', () => {
		const endpoints = baseEndpoints();
		endpoints.webhook = 'a/prod';
		endpoints.webhookTest = 'a/test';

		expect(() => validateEndpointPaths(endpoints)).not.toThrow();
	});
});
