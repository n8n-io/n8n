import type { GlobalConfig } from '@n8n/config';

import {
	resolveBackendHealthEndpointPath,
	resolveFrontendHealthEndpointPath,
} from '@/utils/health-endpoint.util';

describe('resolveBackendHealthEndpointPath', () => {
	it('should always return bare health endpoint regardless of N8N_PATH', () => {
		const mockGlobalConfig = {
			path: '/n8n',
			endpoints: { health: '/healthz' },
		} as GlobalConfig;

		expect(resolveBackendHealthEndpointPath(mockGlobalConfig)).toBe('/healthz');
	});

	it('should return custom health endpoint when configured', () => {
		const mockGlobalConfig = {
			path: '/n8n',
			endpoints: { health: '/custom/health' },
		} as GlobalConfig;

		expect(resolveBackendHealthEndpointPath(mockGlobalConfig)).toBe('/custom/health');
	});
});

describe('resolveFrontendHealthEndpointPath', () => {
	let originalEnv: NodeJS.ProcessEnv;

	beforeEach(() => {
		originalEnv = { ...process.env };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it('should return default health endpoint when N8N_PATH is /', () => {
		const mockGlobalConfig = {
			path: '/',
			endpoints: { health: '/healthz' },
		} as GlobalConfig;
		delete process.env.N8N_ENDPOINT_HEALTH;

		expect(resolveFrontendHealthEndpointPath(mockGlobalConfig)).toBe('/healthz');
	});

	it('should combine N8N_PATH with health endpoint when N8N_PATH is set', () => {
		const mockGlobalConfig = {
			path: '/n8n',
			endpoints: { health: '/healthz' },
		} as GlobalConfig;
		delete process.env.N8N_ENDPOINT_HEALTH;

		expect(resolveFrontendHealthEndpointPath(mockGlobalConfig)).toBe('/n8n/healthz');
	});

	it('should normalize double slashes when N8N_PATH has trailing slash', () => {
		const mockGlobalConfig = {
			path: '/n8n/',
			endpoints: { health: '/healthz' },
		} as GlobalConfig;
		delete process.env.N8N_ENDPOINT_HEALTH;

		expect(resolveFrontendHealthEndpointPath(mockGlobalConfig)).toBe('/n8n/healthz');
	});

	it('should prioritize N8N_ENDPOINT_HEALTH over N8N_PATH', () => {
		const mockGlobalConfig = {
			path: '/n8n',
			endpoints: { health: '/custom/health' },
		} as GlobalConfig;
		process.env.N8N_ENDPOINT_HEALTH = '/custom/health';

		expect(resolveFrontendHealthEndpointPath(mockGlobalConfig)).toBe('/custom/health');
	});

	it('should use N8N_ENDPOINT_HEALTH even when it is the default value', () => {
		const mockGlobalConfig = {
			path: '/n8n',
			endpoints: { health: '/healthz' },
		} as GlobalConfig;
		process.env.N8N_ENDPOINT_HEALTH = '/healthz';

		expect(resolveFrontendHealthEndpointPath(mockGlobalConfig)).toBe('/healthz');
	});

	it('should handle multiple path segments in N8N_PATH', () => {
		const mockGlobalConfig = {
			path: '/api/n8n',
			endpoints: { health: '/healthz' },
		} as GlobalConfig;
		delete process.env.N8N_ENDPOINT_HEALTH;

		expect(resolveFrontendHealthEndpointPath(mockGlobalConfig)).toBe('/api/n8n/healthz');
	});

	it('should handle custom health endpoint with N8N_PATH', () => {
		const mockGlobalConfig = {
			path: '/n8n',
			endpoints: { health: '/health/check' },
		} as GlobalConfig;
		delete process.env.N8N_ENDPOINT_HEALTH;

		expect(resolveFrontendHealthEndpointPath(mockGlobalConfig)).toBe('/n8n/health/check');
	});
});
