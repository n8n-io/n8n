import express, { type Application } from 'express';

import { createAuthenticationMiddleware } from '../auth/authenticate';
import type { IdentityVerifier } from '../auth/identity.types';
import type { ExecutionQueryService } from '../execution';
import type { StartExecutionService } from '../execution/start-execution.service';
import type { EngineLogger } from '../logging';
import { createWorkflowExecutionsRouter } from './routes/workflow-executions';

/** Services the engine API is built on, handed in at construction. */
export interface EngineServerDeps {
	startExecution: StartExecutionService;
	executionQuery: ExecutionQueryService;
	identityVerifier: IdentityVerifier;
	/** Where the engine writes its own messages. Defaults to the console. */
	logger?: EngineLogger;
}

/** Builds the engine HTTP app: `/healthz` plus the authenticated execution API. */
export function createEngineServer(deps: EngineServerDeps): { app: Application } {
	const app = express();

	// Stays open: a liveness probe, and it reveals nothing.
	app.get('/healthz', (_req, res) => {
		res.status(200).json({ status: 'ok' });
	});

	// Mounted on the prefix, not on each router, so a future router cannot forget it.
	app.use('/api', createAuthenticationMiddleware(deps.identityVerifier, deps.logger));
	app.use('/api', express.json());
	app.use('/api/workflow-executions', createWorkflowExecutionsRouter(deps));

	return { app };
}
