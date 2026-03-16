import 'reflect-metadata';

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { createDataSource } from './database/data-source';
import { createEngine } from './engine/create-engine';
import type { EngineConfig } from './engine/engine.config';
import { createApp } from './api/server';
import { seedExampleWorkflows } from './seed-examples';
import express from 'express';

async function connectWithRetry(
	dataSource: ReturnType<typeof createDataSource>,
	retries = 5,
): Promise<void> {
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			await dataSource.initialize();
			return;
		} catch (err) {
			if (attempt === retries) throw err;
			const delay = 1000 * attempt;
			console.warn(
				`Database init failed (attempt ${attempt}/${retries}), retrying in ${delay}ms...`,
			);
			await new Promise((r) => setTimeout(r, delay));
			// Reset DataSource state for retry
			if (dataSource.isInitialized) await dataSource.destroy();
		}
	}
}

async function main() {
	const dataSource = createDataSource();
	await connectWithRetry(dataSource);
	console.log('Database connected');

	// Seed example workflows on first run
	await seedExampleWorkflows(dataSource);

	const config: EngineConfig = {
		redisUrl: process.env.REDIS_URL,
		maxConcurrency: parseInt(process.env.MAX_CONCURRENCY ?? '10', 10),
	};

	const { eventBus, transpiler, engineService, stepProcessor, broadcaster, queue, metrics, relay } =
		createEngine(dataSource, config);
	queue.start();

	// Create and start Express app
	const app = createApp({
		dataSource,
		engineService,
		stepProcessor,
		broadcaster,
		eventBus,
		transpiler,
		metrics,
		health: {
			isPostgresConnected: () => dataSource.isInitialized,
			redisStatus: () => {
				if (!config.redisUrl) return 'not_configured';
				return (relay as { getStatus?: () => string }).getStatus?.() === 'ready'
					? 'connected'
					: 'disconnected';
			},
			metrics,
			startTime: Date.now(),
		},
	});

	// Serve frontend static files in production
	const webDistPath = join(__dirname, '../dist/web');
	if (existsSync(webDistPath)) {
		app.use(express.static(webDistPath));
		// SPA fallback - serve index.html for non-API routes
		app.get('*', (req, res, next) => {
			if (req.path.startsWith('/api') || req.path.startsWith('/webhook')) {
				return next();
			}
			res.sendFile(join(webDistPath, 'index.html'));
		});
	}

	const port = parseInt(process.env.PORT ?? '3100', 10);
	app.listen(port, () => {
		console.log(`Engine v2 API running on port ${port}`);
	});

	// Graceful shutdown
	const shutdown = async () => {
		console.log('Shutting down...');
		await queue.drain(30_000);
		await eventBus.close();
		await dataSource.destroy();
		console.log('Shutdown complete');
		process.exit(0);
	};
	process.on('SIGTERM', shutdown);
	process.on('SIGINT', shutdown);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
