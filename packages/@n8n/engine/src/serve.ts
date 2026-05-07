import 'reflect-metadata';

import type { DataSource } from '@n8n/typeorm';

import { AllowAllAdmittance } from './admittance';
import { createDataPlaneDataSource } from './database';
import { InMemoryWorkQueue } from './queue';
import { createEngineServer } from './server';

async function main(): Promise<void> {
	const port = Number.parseInt(process.env.PORT ?? '3000', 10);
	const host = process.env.HOST ?? '0.0.0.0';
	const databaseUrl = process.env.DP_DATABASE_URL;

	let dataSource: DataSource | undefined;
	if (databaseUrl) {
		dataSource = createDataPlaneDataSource({ url: databaseUrl });
		await dataSource.initialize();
		await dataSource.runMigrations();
	} else {
		console.warn(
			'engine: DP_DATABASE_URL not set; running in healthcheck-only mode (workflow execution endpoints disabled)',
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
}

main().catch((error: unknown) => {
	console.error('engine: failed to start', error);
	process.exit(1);
});
