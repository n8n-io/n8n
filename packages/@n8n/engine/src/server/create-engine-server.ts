import type { DataSource } from '@n8n/typeorm';
import express, { type Application } from 'express';

import type { AdmittanceService } from '../admittance';
import { WorkflowExecution } from '../database';
import { StartExecutionService } from '../execution/start-execution.service';
import type { WorkQueue } from '../queue';
import { createWorkflowExecutionsRouter } from './routes/workflow-executions';

export interface EngineServerDeps {
	dataSource?: DataSource;
	admittance?: AdmittanceService;
	workQueue?: WorkQueue;
}

export function createEngineServer(deps: EngineServerDeps = {}): { app: Application } {
	const app = express();
	app.use(express.json());

	app.get('/healthz', (_req, res) => {
		res.status(200).json({ status: 'ok' });
	});

	if (deps.dataSource && deps.admittance && deps.workQueue) {
		const repo = deps.dataSource.getRepository(WorkflowExecution);
		const startExecution = new StartExecutionService(deps.admittance, repo, deps.workQueue);
		app.use('/api/workflow-executions', createWorkflowExecutionsRouter(startExecution));
	}

	return { app };
}
