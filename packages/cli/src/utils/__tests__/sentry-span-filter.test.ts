import type { GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import { buildIgnoredSpans } from '../sentry-span-filter';

describe('buildIgnoredSpans', () => {
	const originalHealthEndpointEnv = process.env.N8N_ENDPOINT_HEALTH;

	afterEach(() => {
		if (originalHealthEndpointEnv === undefined) {
			delete process.env.N8N_ENDPOINT_HEALTH;
		} else {
			process.env.N8N_ENDPOINT_HEALTH = originalHealthEndpointEnv;
		}
	});

	it('should build ignored spans for sqlite', () => {
		delete process.env.N8N_ENDPOINT_HEALTH;

		const spans = buildIgnoredSpans(
			mock<GlobalConfig>({
				path: '/n8n',
				endpoints: { health: '/healthz' },
				database: { type: 'sqlite' },
			}),
		);

		expect(spans).toEqual(['GET /n8n/healthz', 'GET /metrics', 'SET search_path TO']);
	});

	it('should use custom health endpoint if explicitly configured', () => {
		process.env.N8N_ENDPOINT_HEALTH = 'health';

		const spans = buildIgnoredSpans(
			mock<GlobalConfig>({
				path: '/n8n',
				endpoints: { health: '/health' },
				database: { type: 'sqlite' },
			}),
		);

		expect(spans).toEqual(['GET /health', 'GET /metrics', 'SET search_path TO']);
	});

	it('should add postgres search_path span filter', () => {
		delete process.env.N8N_ENDPOINT_HEALTH;

		const spans = buildIgnoredSpans(
			mock<GlobalConfig>({
				path: '/',
				endpoints: { health: '/healthz' },
				database: { type: 'postgresdb', postgresdb: { schema: 'public' } },
			}),
		);

		expect(spans).toEqual(['GET /healthz', 'GET /metrics', 'SET search_path TO']);
	});
});
