import { EngineConfig } from '@n8n/config';
import { Container } from '@n8n/di';

import { createEngineServer } from './server';

const config = Container.get(EngineConfig);

const { app } = createEngineServer();

const server = app.listen(config.port, config.host, () => {
	console.log(`engine: listening on http://${config.host}:${config.port}`);
});

let shuttingDown = false;
const shutdown = (signal: string): void => {
	if (shuttingDown) return;
	shuttingDown = true;
	console.log(`engine: received ${signal}, shutting down`);
	server.close((error) => {
		if (error) {
			console.error('engine: error during shutdown', error);
			process.exit(1);
		}
		process.exit(0);
	});
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
