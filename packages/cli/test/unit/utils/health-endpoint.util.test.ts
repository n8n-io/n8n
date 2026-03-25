import type { GlobalConfig } from '@n8n/config';

import { resolveHealthEndpointPath } from '@/utils/health-endpoint.util';

describe('resolveHealthEndpointPath', () => {
	let mockGlobalConfig: GlobalConfig;
	let originalEnv: NodeJS.ProcessEnv;

	beforeEach(() => {
		originalEnv = { ...process.env };

		mockGlobalConfig = {
			path: '/',
			endpoints: {
				health: '/healthz',
			},
		} as GlobalConfig;
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it('should return default health endpoint when N8N_PATH is /', () => {
		mockGlobalConfig.path = '/';
		delete process.env.N8N_ENDPOINT_HEALTH;

		const result = resolveHealthEndpointPath(mockGlobalConfig);

		expect(result).toBe('/healthz');
	});

	it('should combine N8N_PATH with health endpoint when N8N_PATH is set', () => {
		mockGlobalConfig.path = '/n8n';
		delete process.env.N8N_ENDPOINT_HEALTH;

		const result = resolveHealthEndpointPath(mockGlobalConfig);

		expect(result).toBe('/n8n/healthz');
	});

	it('should prioritize N8N_ENDPOINT_HEALTH over N8N_PATH', () => {
		mockGlobalConfig.path = '/n8n';
		mockGlobalConfig.endpoints.health = '/custom/health';
		process.env.N8N_ENDPOINT_HEALTH = '/custom/health';

		const result = resolveHealthEndpointPath(mockGlobalConfig);

		expect(result).toBe('/custom/health');
	});

	it('should use N8N_ENDPOINT_HEALTH even when it is the default value', () => {
		mockGlobalConfig.path = '/n8n';
		mockGlobalConfig.endpoints.health = '/healthz';
		process.env.N8N_ENDPOINT_HEALTH = '/healthz';

		const result = resolveHealthEndpointPath(mockGlobalConfig);

		expect(result).toBe('/healthz');
	});

	it('should handle multiple path segments in N8N_PATH', () => {
		mockGlobalConfig.path = '/api/n8n';
		delete process.env.N8N_ENDPOINT_HEALTH;

		const result = resolveHealthEndpointPath(mockGlobalConfig);

		expect(result).toBe('/api/n8n/healthz');
	});

	it('should handle custom health endpoint with N8N_PATH', () => {
		mockGlobalConfig.path = '/n8n';
		mockGlobalConfig.endpoints.health = '/health/check';
		delete process.env.N8N_ENDPOINT_HEALTH;

		const result = resolveHealthEndpointPath(mockGlobalConfig);

		expect(result).toBe('/n8n/health/check');
	});
});
