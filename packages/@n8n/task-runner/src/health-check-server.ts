import { ApplicationError } from '@n8n/errors';
import { createServer } from 'node:http';

export class HealthCheckServer {
	private server = createServer((_, res) => {
		res.writeHead(200);
		res.end('OK');
	});

	async start(host: string, port: number) {
		return await new Promise<void>((resolve, reject) => {
			const portInUseErrorHandler = (error: NodeJS.ErrnoException) => {
				if (error.code === 'EADDRINUSE') {
					reject(new ApplicationError(`Port ${port} is already in use`));
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
