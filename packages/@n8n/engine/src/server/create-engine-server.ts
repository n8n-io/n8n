import express, { type Application } from 'express';

import type { StartExecutionService } from '../execution/start-execution.service';
import { createWorkflowExecutionsRouter } from './routes/workflow-executions';

/** Builds the engine HTTP app: `/healthz` plus the execution API. */
export function createEngineServer(startExecution: StartExecutionService): { app: Application } {
	const app = express();
	app.use(express.json());

	app.get('/healthz', (_req, res) => {
		res.status(200).json({ status: 'ok' });
	});

	app.use('/api/workflow-executions', createWorkflowExecutionsRouter(startExecution));

	return { app };
}
