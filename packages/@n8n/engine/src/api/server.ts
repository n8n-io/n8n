import express from 'express';
import type { DataSource } from '@n8n/typeorm';

import type { EngineService } from '../engine/engine.service';
import type { StepProcessorService } from '../engine/step-processor.service';
import type { BroadcasterService } from '../engine/broadcaster.service';
import type { EngineEventBus } from '../engine/event-bus.service';
import type { TranspilerService } from '../transpiler/transpiler.service';
import type { MetricsService } from '../engine/metrics.service';
import { createWorkflowRouter } from './workflow.controller';
import { createExecutionRouter } from './execution.controller';
import { createStepExecutionRouter } from './step-execution.controller';
import { createWebhookRouter } from './webhook.controller';
import { createHealthRouter } from './health.controller';
import type { HealthDependencies } from './health.controller';

export interface AppDependencies {
	dataSource: DataSource;
	engineService: EngineService;
	stepProcessor: StepProcessorService;
	broadcaster: BroadcasterService;
	eventBus: EngineEventBus;
	transpiler: TranspilerService;
	metrics?: MetricsService;
	health?: HealthDependencies;
}

/** Replace UUIDs in paths with `:id` to avoid high-cardinality metric labels.
 *  When no route matched (Express 404), return `(not found)` instead of the
 *  raw path to prevent unbounded label cardinality.
 */
function normalizePath(req: express.Request): string {
	if (req.route?.path) {
		return req.route.path;
	}

	// No matched route — this is a 404 from Express's default handler.
	// Return a fixed label to avoid high-cardinality metric explosion.
	return '(not found)';
}

export function createApp(deps: AppDependencies): express.Application {
	const app = express();
	app.use(express.json({ limit: '10mb' }));

	// API request metrics middleware (before all routes)
	if (deps.metrics) {
		app.use((req, res, next) => {
			const start = Date.now();
			res.on('finish', () => {
				const duration = Date.now() - start;
				const normalizedPath = normalizePath(req);
				deps.metrics!.apiRequestsTotal.inc({
					method: req.method,
					path: normalizedPath,
					status_code: String(res.statusCode),
				});
				deps.metrics!.apiRequestDuration.observe(
					{ method: req.method, path: normalizedPath },
					duration,
				);
			});
			next();
		});
	}

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

	// Health and metrics (mounted before API routes so they're always accessible)
	if (deps.health) {
		app.use(createHealthRouter(deps.health));
	}

	// API routes
	app.use('/api/workflows', createWorkflowRouter(deps));
	app.use('/api/workflow-executions', createExecutionRouter(deps));
	app.use('/api/workflow-step-executions', createStepExecutionRouter(deps));
	app.use('/webhook', createWebhookRouter(deps));

	// Global error handler — catch unhandled errors and return JSON
	app.use(
		(err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
			console.error('Unhandled API error:', err);
			const body: { error: string; stack?: string } = { error: err.message };
			if (process.env.NODE_ENV === 'development') {
				body.stack = err.stack;
			}
			res.status(500).json(body);
		},
	);

	return app;
}
