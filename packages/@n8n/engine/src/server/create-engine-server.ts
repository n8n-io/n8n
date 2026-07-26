import type { DataSource } from '@n8n/typeorm';
import express, { type Application } from 'express';

import type { AdmittanceService } from '../admittance';
import { TypeOrmExecutionStore, WorkflowExecution } from '../database';
import { StartExecutionService } from '../execution/start-execution.service';
import type { WorkQueue } from '../queue';
import { createWorkflowExecutionsRouter } from './routes/workflow-executions';

export interface EngineServerDeps {
	dataSource: DataSource;
	admittance: AdmittanceService;
	workQueue: WorkQueue;
}

/**
 * Builds the engine HTTP app. Without `deps` it serves only `/healthz`; with
 * `deps` it also mounts the execution API. Deps are all-or-nothing so the API
 * can't be half-wired.
 */
export function createEngineServer(deps?: EngineServerDeps): { app: Application } {
	const app = express();
	app.use(express.json());

	app.get('/healthz', (_req, res) => {
		res.status(200).json({ status: 'ok' });
	});

	if (deps) {
		const executionStore = new TypeOrmExecutionStore(
			deps.dataSource.getRepository(WorkflowExecution),
		);
		const startExecution = new StartExecutionService(
			deps.admittance,
			executionStore,
			deps.workQueue,
		);
		app.use('/api/workflow-executions', createWorkflowExecutionsRouter(startExecution));
	}

	return { app };
}
