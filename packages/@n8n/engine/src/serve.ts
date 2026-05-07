import { createEngineServer } from './server';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const host = process.env.HOST ?? '0.0.0.0';

const { app } = createEngineServer();

const server = app.listen(port, host, () => {
	console.log(`engine: listening on http://${host}:${port}`);
});

const shutdown = (signal: string): void => {
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
