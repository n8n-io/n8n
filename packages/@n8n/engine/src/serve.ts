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
import {
	ExecutionStartHandler,
	OrchestrationWorker,
	StepCompletedHandler,
	StepReadyHandler,
	StepWorker,
} from './execution';
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
	const stepQueue = new InMemoryWorkQueue<StepMessage>();

	let orchestrationWorker: OrchestrationWorker | undefined;
	let stepWorker: StepWorker | undefined;
	if (dataSource) {
		const executionStore = new TypeOrmExecutionStore(dataSource.getRepository(WorkflowExecution));
		const stepStore = new TypeOrmStepStore(dataSource.getRepository(WorkflowStepExecution));
		orchestrationWorker = new OrchestrationWorker(
			orchestrationQueue,
			new ExecutionStartHandler(executionStore, stepStore, orchestrationQueue),
			new StepCompletedHandler(executionStore, stepStore, stepQueue),
		);
		// No executors here: the v1 one lives in `@n8n/node-engine-compatibility`,
		// which depends on this package, so only an integrated host can supply it.
		// `v1-node` steps therefore fail as unimplemented in standalone mode.
		stepWorker = new StepWorker(
			stepQueue,
			new StepReadyHandler(executionStore, stepStore, orchestrationQueue, {}),
		);
		orchestrationWorker.start();
		stepWorker.start();
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
		// TODO(CAT-3882): drain in-flight work instead. Stopping the workers waits
		// only for whatever each is mid-handling; anything queued behind it is
		// dropped, since the in-memory queues die with the process.
		if (orchestrationWorker) await orchestrationWorker.stop();
		if (stepWorker) await stepWorker.stop();
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
