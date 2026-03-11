import 'reflect-metadata';

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { createDataSource } from './database/data-source';
import { EngineEventBus } from './engine/event-bus.service';
import { EngineService } from './engine/engine.service';
import { StepProcessorService } from './engine/step-processor.service';
import { StepPlannerService } from './engine/step-planner.service';
import { StepQueueService } from './engine/step-queue.service';
import { CompletionService } from './engine/completion.service';
import { BroadcasterService } from './engine/broadcaster.service';
import { registerEventHandlers } from './engine/event-handlers';
import { TranspilerService } from './transpiler/transpiler.service';
import { createApp } from './api/server';
import { seedExampleWorkflows } from './seed-examples';
import express from 'express';

async function main() {
	const dataSource = createDataSource();
	await dataSource.initialize();
	console.log('Database connected');

	// Seed example workflows on first run
	await seedExampleWorkflows(dataSource);

	const eventBus = new EngineEventBus();
	const transpiler = new TranspilerService();
	const stepPlanner = new StepPlannerService(dataSource);
	const completionService = new CompletionService(dataSource, eventBus);
	const stepProcessor = new StepProcessorService(dataSource, eventBus);
	const engineService = new EngineService(dataSource, eventBus, stepPlanner);
	const broadcaster = new BroadcasterService(eventBus);

	// Wire up event handlers
	registerEventHandlers(eventBus, dataSource, stepPlanner, completionService);

	// Start the queue poller
	const queue = new StepQueueService(dataSource, stepProcessor);
	queue.start();

	// Create and start Express app
	const app = createApp({
		dataSource,
		engineService,
		stepProcessor,
		broadcaster,
		eventBus,
		transpiler,
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
	process.on('SIGTERM', async () => {
		queue.stop();
		await dataSource.destroy();
		process.exit(0);
	});
}

main().catch(console.error);
