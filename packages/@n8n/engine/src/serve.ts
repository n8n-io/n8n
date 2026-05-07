import { EngineConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { DataSource } from '@n8n/typeorm';

import { AllowAllAdmittance } from './admittance';
import { createDataPlaneDataSource } from './database';
import { InMemoryWorkQueue } from './queue';
import { createEngineServer } from './server';

async function main(): Promise<void> {
	const config = Container.get(EngineConfig);

	let dataSource: DataSource | undefined;
	if (config.databaseUrl) {
		dataSource = createDataPlaneDataSource({ url: config.databaseUrl });
		await dataSource.initialize();
		await dataSource.runMigrations();
	} else {
		console.warn(
			'engine: N8N_ENGINE_DATABASE_URL not set; running in healthcheck-only mode (workflow execution endpoints disabled)',
		);
	}

	const { app } = createEngineServer(
		dataSource
			? {
					dataSource,
					admittance: new AllowAllAdmittance(),
					workQueue: new InMemoryWorkQueue(),
				}
			: {},
	);

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
}

main().catch((error: unknown) => {
	console.error('engine: failed to start', error);
	process.exit(1);
});
