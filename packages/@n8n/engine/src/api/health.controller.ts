import { Router } from 'express';
import type { MetricsService } from '../engine/metrics.service';

export interface HealthDependencies {
	isPostgresConnected: () => boolean;
	redisStatus: () => 'connected' | 'disconnected' | 'not_configured';
	metrics: MetricsService;
	startTime: number;
}

export function createHealthRouter(deps: HealthDependencies): Router {
	const router = Router();

	router.get('/health', (_req, res) => {
		const pgConnected = deps.isPostgresConnected();
		const redis = deps.redisStatus();
		const status = !pgConnected ? 'error' : redis === 'disconnected' ? 'degraded' : 'ok';

		res.status(pgConnected ? 200 : 503).json({
			status,
			postgres: pgConnected ? 'connected' : 'disconnected',
			redis,
			uptime: Math.floor((Date.now() - deps.startTime) / 1000),
		});
	});

	router.get('/metrics', async (_req, res) => {
		const output = await deps.metrics.getMetrics();
		res.set('Content-Type', deps.metrics.getContentType());
		res.send(output);
	});

	return router;
}
