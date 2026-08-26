import { EngineConfig } from '@n8n/config';
import { Container } from '@n8n/di';

import { AllowAllAdmittance } from './admittance';
import { SharedSecretIdentityVerifier } from './auth';
import { createDataSource } from './database';
import { createEngineRuntime } from './runtime';

async function main(): Promise<void> {
	const config = Container.get(EngineConfig);

	// Refused rather than degraded: an engine with nowhere to record an execution
	// would report healthy while being unable to run one.
	if (!config.databaseUrl) {
		throw new Error('engine: N8N_ENGINE_DATABASE_URL is not set');
	}

	if (!config.authSecret) {
		throw new Error('engine: N8N_ENGINE_AUTH_SECRET is not set');
	}

	const dataSource = createDataSource(config.databaseUrl);
	await dataSource.initialize();
	await dataSource.runMigrations();

	const runtime = createEngineRuntime({
		dataSource,
		admittance: new AllowAllAdmittance(),
		identityVerifier: new SharedSecretIdentityVerifier(config.authSecret),
	});
	runtime.start();

	const server = runtime.app.listen(config.port, config.host, () => {
		console.log(`engine: listening on http://${config.host}:${config.port}`);
	});

	let shuttingDown = false;
	const shutdown = async (signal: string): Promise<void> => {
		if (shuttingDown) return;
		shuttingDown = true;
		console.log(`engine: received ${signal}, shutting down`);
		await new Promise<void>((resolve, reject) => {
			server.close((error) => (error ? reject(error) : resolve()));
		});
		await runtime.stop();
		if (dataSource.isInitialized) await dataSource.destroy();
		process.exit(0);
	};

	const onSignal = (signal: string): void => {
		shutdown(signal).catch((error: unknown) => {
			console.error('engine: error during shutdown', error);
			process.exit(1);
		});
	};

	process.on('SIGTERM', () => onSignal('SIGTERM'));
	process.on('SIGINT', () => onSignal('SIGINT'));
}

main().catch((error: unknown) => {
	console.error('engine: failed to start', error);
	process.exit(1);
});
