import type { DataSource } from '@n8n/typeorm';
import express, { type Application } from 'express';

import type { AdmittanceService } from '../admittance';
import { TypeOrmExecutionStore, WorkflowExecution } from '../database';
import { StartExecutionService } from '../execution/start-execution.service';
import type { OrchestrationMessage, WorkQueue } from '../queue';
import { createWorkflowExecutionsRouter } from './routes/workflow-executions';

const DEFAULT_PAYLOAD_SIZE_MB = 16;

export interface EngineServerDeps {
	dataSource: DataSource;
	/** Maximum request payload size in MiB. Defaults to 16. */
	payloadSizeMax?: number;
	admittance: AdmittanceService;
	workQueue: WorkQueue<OrchestrationMessage>;
}

/**
 * Builds the engine HTTP app. Without `deps` it serves only `/healthz`; with
 * `deps` it also mounts the execution API. Deps are all-or-nothing so the API
 * can't be half-wired.
 */
export function createEngineServer(deps?: EngineServerDeps): { app: Application } {
	const app = express();
	const limitMb = deps?.payloadSizeMax ?? DEFAULT_PAYLOAD_SIZE_MB;
	app.use(express.json({ limit: `${limitMb}mb` }));

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
