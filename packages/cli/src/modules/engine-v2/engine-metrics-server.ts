import { createServer, type Server } from 'node:http';
import type { Registry } from 'prom-client';

/**
 * Serves the data plane's Prometheus metrics on `GET /metrics` and nothing
 * else. Plain HTTP on its own port, apart from the engine API, so a scraper
 * needs no client certificate when the engine API uses mutual TLS.
 */
export async function startEngineMetricsServer(
	registry: Registry,
	{ host, port }: { host: string; port: number },
): Promise<Server> {
	const server = createServer((req, res) => {
		const { pathname } = new URL(req.url ?? '/', 'http://localhost');
		if (req.method !== 'GET' || pathname !== '/metrics') {
			res.writeHead(404).end();
			return;
		}

		registry.metrics().then(
			(body) => res.writeHead(200, { 'Content-Type': registry.contentType }).end(body),
			() => res.writeHead(500).end(),
		);
	});

	return await new Promise<Server>((resolve, reject) => {
		server.once('listening', () => resolve(server));
		server.once('error', reject);
		server.listen(port, host);
	});
}
