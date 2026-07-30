import { EngineConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { DataSource } from '@n8n/typeorm';

import { AllowAllAdmittance } from './admittance';
import {
	createDataSource,
	TypeOrmExecutionStore,
	TypeOrmStepStore,
	WorkflowExecution,
	WorkflowStepExecution,
} from './database';
import { ExecutionStartHandler, OrchestrationWorker } from './execution';
import { InMemoryWorkQueue } from './queue';
import type { OrchestrationMessage, StepMessage } from './queue';
import { createEngineServer } from './server';

async function main(): Promise<void> {
	const config = Container.get(EngineConfig);

	let dataSource: DataSource | undefined;
	if (config.databaseUrl) {
		dataSource = createDataSource(config.databaseUrl);
		await dataSource.initialize();
		await dataSource.runMigrations();
	} else {
		console.warn(
			'engine: N8N_ENGINE_DATABASE_URL not set; running in healthcheck-only mode (workflow execution endpoints disabled)',
		);
	}

	const orchestrationQueue = new InMemoryWorkQueue<OrchestrationMessage>();
	// Published to but not yet consumed — the step worker is CAT-2870. Queued
	// messages dispatch as soon as it registers.
	const stepQueue = new InMemoryWorkQueue<StepMessage>();

	let worker: OrchestrationWorker | undefined;
	if (dataSource) {
		const executionStore = new TypeOrmExecutionStore(dataSource.getRepository(WorkflowExecution));
		const stepStore = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		worker = new OrchestrationWorker(
			orchestrationQueue,
			new ExecutionStartHandler(executionStore, stepStore, stepQueue),
		);
		worker.start();
	}

	const { app } = createEngineServer(
		dataSource
			? { dataSource, admittance: new AllowAllAdmittance(), workQueue: orchestrationQueue }
			: undefined,
	);

	const server = app.listen(config.port, config.host, () => {
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
		if (worker) await worker.stop();
		if (dataSource?.isInitialized) await dataSource.destroy();
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
