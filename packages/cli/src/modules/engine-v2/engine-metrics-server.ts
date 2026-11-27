import type { Logger } from '@n8n/backend-common';
import { createServer, type Server } from 'node:http';
import type { Registry } from 'prom-client';

/**
 * Serves the registry on `GET /metrics`. It uses plain HTTP on its own port,
 * so a scraper needs no client certificate when the engine API uses mutual TLS.
 */
export async function startEngineMetricsServer(
	registry: Registry,
	{ host, port, logger }: { host: string; port: number; logger: Logger },
): Promise<Server> {
	const server = createServer((req, res) => {
		// String split, not `new URL()`: any client can send a target that does not parse.
		const path = req.url?.split('?', 1)[0];
		if (req.method !== 'GET' || path !== '/metrics') {
			res.writeHead(404).end();
			return;
		}

		registry.metrics().then(
			(body) => res.writeHead(200, { 'Content-Type': registry.contentType }).end(body),
			(error: unknown) => {
				logger.error('Failed to collect the engine metrics', { error });
				res.writeHead(500).end();
			},
		);
	});

	return await new Promise<Server>((resolve, reject) => {
		// Detached once listening: a later error is not a failed bind.
		server.once('error', reject);
		server.listen(port, host, () => {
			server.off('error', reject);
			server.on('error', (error) => logger.error('Engine metrics server error', { error }));
			resolve(server);
		});
	});
}
