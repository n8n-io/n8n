import { OperationalError } from 'n8n-workflow';
import { createServer } from 'node:http';

/** Methods that Node's HTTP listener replaces on every inbound socket. */
const METHODS = ['prependListener', 'prependOnceListener'] as const;

export class HealthCheckServer {
	private server = createServer((_, res) => {
		res.writeHead(200);
		res.end('OK');
	});

	constructor() {
		// Run before Node's HTTP connection listener so its assignments use writable
		// properties on this socket instead of the locked EventEmitter prototype.
		this.server.prependListener('connection', (socket) => {
			for (const method of METHODS) {
				// Keep the exception local to health-check sockets rather than weakening
				// the shared stream prototypes for sandboxed code.
				Object.defineProperty(socket, method, {
					value: socket[method],
					writable: true,
					configurable: true,
					enumerable: true,
				});
			}
		});
	}

	async start(host: string, port: number) {
		return await new Promise<void>((resolve, reject) => {
			const portInUseErrorHandler = (error: NodeJS.ErrnoException) => {
				if (error.code === 'EADDRINUSE') {
					reject(new OperationalError(`Port ${port} is already in use`));
				} else {
					reject(error);
				}
			};

			this.server.on('error', portInUseErrorHandler);

			this.server.listen(port, host, () => {
				this.server.removeListener('error', portInUseErrorHandler);
				console.log(`Health check server listening on ${host}, port ${port}`);
				resolve();
			});
		});
	}

	async stop() {
		return await new Promise<void>((resolve, reject) => {
			this.server.close((error) => {
				if (error) reject(error);
				else resolve();
			});
		});
	}
}
