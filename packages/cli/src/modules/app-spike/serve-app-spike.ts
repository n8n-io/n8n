/**
 * SPIKE (hackweek/n8nable-app-spike): serves apps built and published by the
 * `apps` Instance AI tool (packages/@n8n/instance-ai/src/tools/apps.tool.ts)
 * from a fixed local directory. This is NOT the production design — see
 * plan.md Phase 0/6: a real implementation serves from an AppVersion row
 * (project-scoped, RBAC'd, with auth modes), not an unauthenticated static
 * directory read straight off local disk.
 */
import type { Application } from 'express';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';

const SPIKE_APPS_SERVE_DIR =
	process.env.N8N_APP_SPIKE_SERVE_DIR ?? path.join('/tmp', 'n8n-app-spike-served');

const CONTENT_TYPES: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
};

/** Registers `GET /apps/:namespace/*path` on the given Express app. Call this
 *  from AbstractServer alongside the other webhook/static mounts. */
export function registerAppSpikeServing(app: Application): void {
	app.get<{ namespace: string; path?: string[] }>('/apps/:namespace{/*path}', (req, res) => {
		const namespace = req.params.namespace;
		const restPath = Array.isArray(req.params.path) ? req.params.path.join('/') : '';
		const appDir = path.join(SPIKE_APPS_SERVE_DIR, namespace);

		if (!existsSync(appDir)) {
			res.status(404).send(`No published app at namespace "${namespace}".`);
			return;
		}

		// Any non-file request (or the root) falls back to index.html so the
		// client-side router (once one exists) can take over — matching how a
		// built SPA is normally served.
		let filePath = path.join(appDir, restPath || 'index.html');
		if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
			filePath = path.join(appDir, 'index.html');
		}
		if (!existsSync(filePath)) {
			res.status(404).send('App has no build output yet.');
			return;
		}

		// Deliberately no `allow-same-origin` in a CSP sandbox header here yet —
		// this spike skips the auth/opaque-origin work in plan.md Phase 1/6.
		const ext = path.extname(filePath);
		res.setHeader('Content-Type', CONTENT_TYPES[ext] ?? 'application/octet-stream');
		createReadStream(filePath).pipe(res);
	});
}
