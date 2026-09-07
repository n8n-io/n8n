import type { DataSource } from '@n8n/typeorm';
import type { Application } from 'express';

import type { AdmittanceService } from '../admittance';
import type { IdentityVerifier } from '../auth/identity.types';
import { createStores } from '../database';
import type { EngineStores } from '../database';
import type { ExternalDependencies } from '../dependencies';
import {
	ExecutionQueryService,
	ExecutionStartHandler,
	OrchestrationWorker,
	StartExecutionService,
	StepReadyHandler,
	StepSettledHandler,
	StepWorker,
	WaitSweeper,
} from '../execution';
import { BatchingLifecycleEventPublisher, noopLifecycleEventPublisher } from '../lifecycle-events';
import type { LifecycleEventPublisher } from '../lifecycle-events';
import { createConsoleLogger, type EngineLogger } from '../logging';
import { InMemoryWorkQueue } from '../queue';
import type { OrchestrationMessage, StepMessage } from '../queue';
import { createEngineServer } from '../server';

export interface EngineRuntimeOptions {
	/** The data plane database, already initialized and migrated. */
	dataSource: DataSource;
	admittance: AdmittanceService;
	/** Verifies the identity token on every `/api` request. No default: an unauthenticated engine must never boot by omission. */
	identityVerifier: IdentityVerifier;
	/** Where the engine writes its own messages. Defaults to the console. */
	logger?: EngineLogger;
	/**
	 * Builds the capabilities the engine does not own. It receives the engine's
	 * stores, because a `v1-node` executor reads step data through them and the
	 * runtime owns them.
	 *
	 * Standalone mode omits it, so `v1-node` steps fail as unimplemented: the v1
	 * executor lives in `@n8n/node-engine-compatibility`, which depends on this
	 * package, so only an integrated host can supply it.
	 */
	externalDependencies?: (stores: EngineStores) => ExternalDependencies;
	/** How often to fire waits whose deadline has passed. Defaults to a minute. */
	waitSweepIntervalMs?: number;
}

/** A built engine, ready for a host to serve. */
export interface EngineRuntime {
	/** The engine HTTP app. The host decides where, and whether, to listen. */
	app: Application;
	/** Starts consuming the engine's queues. */
	start(): void;
	/** Stops the engine's workers. The host still owns its listener and its `DataSource`. */
	stop(): Promise<void>;
}

/**
 * Builds a working engine from the adapters a host chooses.
 *
 * The engine keeps its internal topology here — which handler goes into which
 * worker, which queue feeds which handler, and the start and stop order — so no
 * host can get it wrong. A host keeps only its own choices: the database, the
 * admittance policy, the external dependencies and the HTTP listener.
 */
export function createEngineRuntime({
	dataSource,
	admittance,
	identityVerifier,
	logger = createConsoleLogger(),
	externalDependencies,
	waitSweepIntervalMs,
}: EngineRuntimeOptions): EngineRuntime {
	const orchestrationQueue = new InMemoryWorkQueue<OrchestrationMessage>(logger);
	const stepQueue = new InMemoryWorkQueue<StepMessage>(logger);
	const { executionStore, stepStore, executionViewStore } = createStores(dataSource);
	// Built once, not per handler: the factory must not run twice.
	const dependencies =
		externalDependencies?.({ executionStore, stepStore, executionViewStore }) ?? {};
	const lifecycleEventPublisher: LifecycleEventPublisher = dependencies.lifecycleEventCallback
		? new BatchingLifecycleEventPublisher(dependencies.lifecycleEventCallback)
		: noopLifecycleEventPublisher;

	const orchestrationWorker = new OrchestrationWorker(
		orchestrationQueue,
		new ExecutionStartHandler(
			executionStore,
			stepStore,
			orchestrationQueue,
			lifecycleEventPublisher,
		),
		new StepSettledHandler(
			executionStore,
			stepStore,
			stepQueue,
			orchestrationQueue,
			lifecycleEventPublisher,
		),
	);
	const stepWorker = new StepWorker(
		stepQueue,
		new StepReadyHandler(
			executionStore,
			stepStore,
			orchestrationQueue,
			dependencies,
			lifecycleEventPublisher,
		),
	);
	const waitSweeper = new WaitSweeper(stepStore, stepQueue, logger, waitSweepIntervalMs);

	const { app } = createEngineServer({
		startExecution: new StartExecutionService(admittance, executionStore, orchestrationQueue),
		executionQuery: new ExecutionQueryService(executionViewStore),
		identityVerifier,
		logger,
	});

	return {
		app,

		start: () => {
			orchestrationWorker.start();
			stepWorker.start();
			waitSweeper.start();
		},

		stop: async () => {
			// TODO(CAT-3882): drain in-flight work instead. Stopping a worker waits
			// only for whatever it is mid-handling; anything queued behind it is
			// dropped, since the in-memory queues die with the process.
			// The sweeper first: it feeds the step queue, so stopping it before the
			// workers means nothing lands after they have drained.
			await waitSweeper.stop();
			await Promise.all([orchestrationWorker.stop(), stepWorker.stop()]);
			// After the workers are quiet, so the last events still reach the host.
			await lifecycleEventPublisher.stop();
		},
	};
}
