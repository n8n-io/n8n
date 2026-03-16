import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createHealthRouter } from '../health.controller';
import { MetricsService } from '../../engine/metrics.service';
import { Registry } from 'prom-client';

describe('Health and Metrics endpoints', () => {
	function createApp(overrides: { pgConnected?: boolean; redis?: string } = {}) {
		const app = express();
		const metrics = new MetricsService(new Registry());
		metrics.executionTotal.inc({ status: 'completed' });

		app.use(
			createHealthRouter({
				isPostgresConnected: () => overrides.pgConnected ?? true,
				redisStatus: () =>
					(overrides.redis ?? 'not_configured') as 'connected' | 'disconnected' | 'not_configured',
				metrics,
				startTime: Date.now() - 5000,
			}),
		);
		return app;
	}

	describe('GET /health', () => {
		it('should return ok when all systems healthy', async () => {
			const res = await request(createApp()).get('/health');
			expect(res.status).toBe(200);
			expect(res.body.status).toBe('ok');
			expect(res.body.postgres).toBe('connected');
			expect(res.body.redis).toBe('not_configured');
			expect(res.body.uptime).toBeGreaterThanOrEqual(5);
		});

		it('should return ok with redis connected in scaling mode', async () => {
			const res = await request(createApp({ redis: 'connected' })).get('/health');
			expect(res.status).toBe(200);
			expect(res.body.status).toBe('ok');
			expect(res.body.redis).toBe('connected');
		});

		it('should return degraded when Redis is down', async () => {
			const res = await request(createApp({ redis: 'disconnected' })).get('/health');
			expect(res.status).toBe(200);
			expect(res.body.status).toBe('degraded');
		});

		it('should return 503 when Postgres is down', async () => {
			const res = await request(createApp({ pgConnected: false })).get('/health');
			expect(res.status).toBe(503);
			expect(res.body.status).toBe('error');
		});
	});

	describe('GET /metrics', () => {
		it('should return Prometheus text format', async () => {
			const res = await request(createApp()).get('/metrics');
			expect(res.status).toBe(200);
			expect(res.headers['content-type']).toContain('text/plain');
			expect(res.text).toContain('execution_total');
		});
	});
});
