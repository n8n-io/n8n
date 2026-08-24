import express, { type Application } from 'express';

import { createAuthenticationMiddleware } from '../auth/authenticate';
import type { IdentityVerifier } from '../auth/identity.types';
import type { StartExecutionService } from '../execution/start-execution.service';
import { createWorkflowExecutionsRouter } from './routes/workflow-executions';

/** Builds the engine HTTP app: `/healthz` plus the authenticated execution API. */
export function createEngineServer(
	startExecution: StartExecutionService,
	identityVerifier: IdentityVerifier,
): { app: Application } {
	const app = express();

	// Stays open: a liveness probe, and it reveals nothing.
	app.get('/healthz', (_req, res) => {
		res.status(200).json({ status: 'ok' });
	});

	// Mounted on the prefix, not on each router, so a future router cannot forget it.
	app.use('/api', createAuthenticationMiddleware(identityVerifier));
	app.use('/api', express.json());
	app.use('/api/workflow-executions', createWorkflowExecutionsRouter(startExecution));

	return { app };
}
