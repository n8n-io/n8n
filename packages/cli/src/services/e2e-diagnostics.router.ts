import { Container } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { Router, type Request, type Response } from 'express';
import { pipeline } from 'node:stream/promises';

import * as ResponseHelper from '@/response-helper';
import { HeapDiagnosticsService } from '@/services/heap-diagnostics.service';
import { ProcessInternalsService } from '@/services/process-internals.service';

/**
 * Test-only diagnostics routes for processes without REST controllers
 * (workers and webhook processes). Mirrors the matching routes of the main's
 * E2E controller, including the `{ data }` response envelope.
 * Mount only when `E2E_TESTS` is set, at `/<rest endpoint>/e2e`.
 */
export function createE2EDiagnosticsRouter(): Router {
	const router = Router();
	const heapDiagnostics = Container.get(HeapDiagnosticsService);

	const handle =
		(handler: (req: Request, res: Response) => Promise<unknown> | unknown) =>
		async (req: Request, res: Response) => {
			try {
				const data = await handler(req, res);
				if (data !== undefined) res.json({ data });
			} catch (error) {
				// A failed stream has already sent headers, so only close the connection.
				if (res.headersSent) res.destroy();
				else ResponseHelper.sendErrorResponse(res, ensureError(error));
			}
		};

	router.get(
		'/internals',
		handle(() => Container.get(ProcessInternalsService).collect()),
	);

	router.post(
		'/gc',
		handle(() => heapDiagnostics.collectGarbage()),
	);

	router.post(
		'/heap-snapshot',
		handle(() => heapDiagnostics.writeHeapSnapshot()),
	);

	router.get(
		'/heap-snapshot/:filename',
		handle(async (req, res) => {
			const stream = heapDiagnostics.openHeapSnapshot(String(req.params.filename));
			res.setHeader('Content-Type', 'application/octet-stream');
			await pipeline(stream, res);
			return undefined;
		}),
	);

	return router;
}
