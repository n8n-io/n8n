import express, { type Application } from 'express';

import type { ExecutionQueryService } from '../execution';
import type { StartExecutionService } from '../execution/start-execution.service';
import { createWorkflowExecutionsRouter } from './routes/workflow-executions';

/** Services the engine API is built on, handed in at construction. */
export interface EngineServerDeps {
	startExecution: StartExecutionService;
	executionQuery: ExecutionQueryService;
}

/** Builds the engine HTTP app: `/healthz` plus the execution API. */
export function createEngineServer(deps: EngineServerDeps): { app: Application } {
	const app = express();
	app.use(express.json());

	app.get('/healthz', (_req, res) => {
		res.status(200).json({ status: 'ok' });
	});

	app.use('/api/workflow-executions', createWorkflowExecutionsRouter(deps));

	return { app };
}
