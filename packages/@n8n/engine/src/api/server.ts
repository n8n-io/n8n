import express from 'express';
import type { DataSource } from '@n8n/typeorm';

import type { EngineService } from '../engine/engine.service';
import type { StepProcessorService } from '../engine/step-processor.service';
import type { BroadcasterService } from '../engine/broadcaster.service';
import type { EngineEventBus } from '../engine/event-bus.service';
import type { TranspilerService } from '../transpiler/transpiler.service';
import { createWorkflowRouter } from './workflow.controller';
import { createExecutionRouter } from './execution.controller';
import { createStepExecutionRouter } from './step-execution.controller';
import { createWebhookRouter } from './webhook.controller';

export interface AppDependencies {
	dataSource: DataSource;
	engineService: EngineService;
	stepProcessor: StepProcessorService;
	broadcaster: BroadcasterService;
	eventBus: EngineEventBus;
	transpiler: TranspilerService;
}

export function createApp(deps: AppDependencies): express.Application {
	const app = express();
	app.use(express.json({ limit: '10mb' }));

	// CORS for dev (frontend on different port)
	app.use((_req, res, next) => {
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
		res.header('Access-Control-Allow-Headers', 'Content-Type');
		if (_req.method === 'OPTIONS') {
			res.sendStatus(204);
			return;
		}
		next();
	});

	// API routes
	app.use('/api/workflows', createWorkflowRouter(deps));
	app.use('/api/workflow-executions', createExecutionRouter(deps));
	app.use('/api/workflow-step-executions', createStepExecutionRouter(deps));
	app.use('/webhook', createWebhookRouter(deps));

	// Global error handler — catch unhandled errors and return JSON
	app.use(
		(err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
			console.error('Unhandled API error:', err);
			res.status(500).json({ error: err.message, stack: err.stack });
		},
	);

	return app;
}
