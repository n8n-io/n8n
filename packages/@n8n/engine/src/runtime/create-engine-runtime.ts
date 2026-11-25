import type { DataSource } from '@n8n/typeorm';
import type { Application } from 'express';

import type { AdmittanceService } from '../admittance';
import { MIN_SECRET_LENGTH } from '../auth';
import type { IdentityVerifier } from '../auth/identity.types';
import { UnexpectedError } from '../common';
import { createStores } from '../database';
import type { EngineStores } from '../database';
import type { ExternalDependencies } from '../dependencies';
import {
	assertValidStalenessThresholds,
	CancelExecutionService,
	ExecutionFileCleanup,
	ExecutionQueryService,
	ExecutionStartHandler,
	OrchestrationWorker,
	ResumeRequestService,
	StartExecutionService,
	StepReadyHandler,
	StepSettledHandler,
	StepWorker,
	WaitSweeper,
} from '../execution';
import type { StalenessThresholds } from '../execution';
import {
	BatchingLifecycleEventPublisher,
	LifecycleEventPublisherFactory,
	noopLifecycleEventPublisher,
} from '../lifecycle-events';
import type { LifecycleEventPublisher } from '../lifecycle-events';
import { createConsoleLogger, type EngineLogger } from '../logging';
import type { EngineWorkQueues } from '../queue';
import {
	DEFAULT_RECONCILIATION_BATCH_SIZE,
	DEFAULT_RECONCILIATION_INTERVAL_MS,
	QueuedExecutionDetector,
	QueuedExecutionRepair,
	QueuedStepDetector,
	QueuedStepRepair,
	ReconciliationSweeper,
	RunningStepDetector,
	RunningStepRepair,
} from '../reconciliation';
import type { ExecutionResponseSender } from '../response-channel';
import { RetentionSweeper } from '../retention';
import type { ExecutionRetentionPolicy } from '../retention';
import { createEngineServer, type EngineServerDeps } from '../server';

/** The parts of the engine that a process can run. */
export const ENGINE_ROLES = ['api', 'orchestrator', 'step-worker'] as const;
export type EngineRole = (typeof ENGINE_ROLES)[number];

export interface EngineRuntimeOptions {
	/**
	 * The roles this process runs. Defaults to all of them. `api` serves `/api`,
	 * `orchestrator` consumes the orchestration queue and runs reconciliation and
	 * the retention sweeper, and `step-worker` consumes the step queue and runs
	 * the wait sweeper. Every role serves `/healthz`. Only processes on shared
	 * queues can split the roles between them.
	 */
	roles?: readonly EngineRole[];
	/** The data plane database, already initialized and migrated. */
	dataSource: DataSource;
	admittance: AdmittanceService;
	/**
	 * Verifies the identity token on every `/api` request. The `api` role refuses
	 * to start without it, so an unauthenticated API never boots by omission.
	 */
	identityVerifier?: IdentityVerifier;
	/** Where the engine writes its own messages. Defaults to the console. */
	logger?: EngineLogger;
	/**
	 * Where an execution sends responses. The host owns it. No default: a host
	 * that discards responses says so with `noopExecutionResponseSender`.
	 */
	responseSender: ExecutionResponseSender;
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
	/**
	 * Verifies the tokens that resume URLs carry. If it changes, every open
	 * resume URL stops working. Absent or empty, both resume routes answer 501.
	 */
	resumeSecret?: string;
	/** How often to fire waits whose deadline has passed. Defaults to a minute. */
	waitSweepIntervalMs?: number;
	/**
	 * How long a row can stay `queued` or `running` before the engine treats it
	 * as stuck. Defaults to `DEFAULT_STALENESS_THRESHOLDS`.
	 */
	staleness?: StalenessThresholds;
	/** How often the engine searches for stuck rows. Defaults to a minute. */
	reconciliationIntervalMs?: number;
	/**
	 * The queues to run on, with their concurrency already set. The runtime
	 * starts and stops the queues its roles consume. The host closes their
	 * connections.
	 */
	queues: EngineWorkQueues;
	/**
	 * Which ended executions the engine deletes, with their files. No default:
	 * absent, the engine deletes nothing, so no host deletes data by omission.
	 * The orchestrator role runs the sweeper. Needs `deleteExecutionFiles`.
	 */
	retention?: ExecutionRetentionPolicy;
}

/** A built engine, ready for a host to serve. */
export interface EngineRuntime {
	/** The engine HTTP app. The host decides where, and whether, to listen. */
	app: Application;
	/** Starts the workers and sweepers of this process's roles. */
	start(): void;
	/**
	 * Stops the workers and sweepers of this process's roles. The host still owns
	 * its listener and its `DataSource`.
	 */
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
	roles = ENGINE_ROLES,
	dataSource,
	admittance,
	identityVerifier,
	logger = createConsoleLogger(),
	responseSender,
	externalDependencies,
	resumeSecret: givenResumeSecret,
	waitSweepIntervalMs,
	queues,
	staleness,
	reconciliationIntervalMs = DEFAULT_RECONCILIATION_INTERVAL_MS,
	retention,
}: EngineRuntimeOptions): EngineRuntime {
	// An empty value is how an unset environment variable usually arrives.
	const resumeSecret = givenResumeSecret || undefined;
	// Refused here and not at the first request: a weak secret would otherwise
	// fail every resume without a word.
	if (resumeSecret !== undefined && resumeSecret.length < MIN_SECRET_LENGTH) {
		throw new UnexpectedError(
			`The resume secret must be at least ${MIN_SECRET_LENGTH} characters long`,
		);
	}

	// Refused here: a process with no known role would idle without a word.
	if (roles.length === 0) throw new UnexpectedError('The engine needs at least one role');
	const unknownRoles = new Set(roles.filter((role) => !ENGINE_ROLES.includes(role)));
	if (unknownRoles.size > 0) {
		throw new UnexpectedError(
			`Unknown engine roles: ${[...unknownRoles].join(', ')}. The valid roles are ${ENGINE_ROLES.join(', ')}`,
		);
	}
	const runs = new Set(roles);
	if (runs.has('api') && !identityVerifier) {
		throw new UnexpectedError('The api role needs an identity verifier');
	}

	// Refused here and not at the first write: an invalid threshold would
	// otherwise fail every write of a row that becomes `queued` or `running`.
	if (staleness !== undefined) assertValidStalenessThresholds(staleness);

	const { orchestration: orchestrationQueue, step: stepQueue } = queues;
	const { executionStore, stepStore, executionViewStore } = createStores(dataSource, staleness);
	// Built once, not per handler: the factory must not run twice.
	const dependencies =
		externalDependencies?.({ executionStore, stepStore, executionViewStore }) ?? {};
	const lifecycleEventPublisher: LifecycleEventPublisher = dependencies.lifecycleEventCallback
		? new BatchingLifecycleEventPublisher(dependencies.lifecycleEventCallback)
		: noopLifecycleEventPublisher;
	const lifecycleEventPublisherFactory = new LifecycleEventPublisherFactory(
		lifecycleEventPublisher,
	);

	// One cancel path for the API and for an execution that ends with sub-executions.
	const cancelExecution = new CancelExecutionService(
		executionStore,
		stepStore,
		lifecycleEventPublisherFactory,
		responseSender,
		stepQueue,
	);
	const orchestrationWorker = new OrchestrationWorker(
		orchestrationQueue,
		new ExecutionStartHandler(
			executionStore,
			stepStore,
			orchestrationQueue,
			lifecycleEventPublisherFactory,
		),
		new StepSettledHandler(
			executionStore,
			stepStore,
			stepQueue,
			orchestrationQueue,
			lifecycleEventPublisherFactory,
			responseSender,
			cancelExecution,
		),
	);
	const waitSweeper = new WaitSweeper(stepStore, stepQueue, logger, waitSweepIntervalMs);
	const reconciliationSweeper = new ReconciliationSweeper(
		[
			new QueuedExecutionDetector(
				executionStore,
				reconciliationIntervalMs,
				DEFAULT_RECONCILIATION_BATCH_SIZE,
			),
			new QueuedStepDetector(
				stepStore,
				reconciliationIntervalMs,
				DEFAULT_RECONCILIATION_BATCH_SIZE,
			),
			new RunningStepDetector(
				stepStore,
				reconciliationIntervalMs,
				DEFAULT_RECONCILIATION_BATCH_SIZE,
			),
		],
		{
			'execution-queued-no-message': new QueuedExecutionRepair(executionStore, orchestrationQueue),
			'step-queued-no-message': new QueuedStepRepair(stepStore, stepQueue),
			'step-running-no-worker': new RunningStepRepair(
				executionStore,
				stepStore,
				orchestrationQueue,
				lifecycleEventPublisherFactory,
			),
		},
		logger,
	);
	let retentionSweeper: RetentionSweeper | undefined;
	if (retention !== undefined) {
		// Refused here: without a deleter the sweeper would delete the rows and keep the files.
		if (!dependencies.deleteExecutionFiles) {
			throw new UnexpectedError('Execution retention needs a file deleter');
		}
		retentionSweeper = new RetentionSweeper(
			executionStore,
			new ExecutionFileCleanup(dependencies.deleteExecutionFiles, logger),
			retention,
			logger,
		);
	}
	// One start path for every execution: the API and a step's sub-execution both admit
	// and validate here, and only this path can set a parent link.
	const startExecution = new StartExecutionService(
		admittance,
		executionStore,
		stepStore,
		orchestrationQueue,
	);
	const stepWorker = new StepWorker(
		stepQueue,
		new StepReadyHandler(
			executionStore,
			stepStore,
			orchestrationQueue,
			dependencies,
			lifecycleEventPublisherFactory,
			responseSender,
			startExecution,
			// A deadline set after the sweeper armed would otherwise wait for its next pass.
			() => waitSweeper.noteSuspended(),
		),
	);

	let apiDeps: EngineServerDeps | undefined;
	if (runs.has('api') && identityVerifier) {
		apiDeps = {
			startExecution,
			cancelExecution,
			executionQuery: new ExecutionQueryService(executionViewStore),
			resumeRequests:
				resumeSecret === undefined
					? undefined
					: new ResumeRequestService(executionStore, stepStore, stepQueue, resumeSecret),
			identityVerifier,
			logger,
		};
	}
	const { app } = createEngineServer(apiDeps);

	const workers: Array<OrchestrationWorker | StepWorker> = [];
	const sweepers: Array<ReconciliationSweeper | WaitSweeper | RetentionSweeper> = [];
	if (runs.has('orchestrator')) {
		workers.push(orchestrationWorker);
		// Not with the step worker: it repairs what a crashed step worker leaves behind.
		sweepers.push(reconciliationSweeper);
		// Only here: the role with the fewest replicas, so fewer processes race to delete the same rows.
		if (retentionSweeper) sweepers.push(retentionSweeper);
		if (retention) logger.info('Execution retention is on', { ...retention });
		else logger.info('Execution retention is off');
	}
	if (runs.has('step-worker')) {
		workers.push(stepWorker);
		// The step worker re-arms it when a step suspends, which keeps a short wait on time.
		sweepers.push(waitSweeper);
	}

	return {
		app,

		start: () => {
			for (const worker of workers) worker.start();
			for (const sweeper of sweepers) sweeper.start();
		},

		stop: async () => {
			// TODO(CAT-3882): drain in-flight work instead. Stopping a worker waits
			// only for whatever it is mid-handling. Anything queued behind it is
			// dropped from an in-memory queue, and stays in a Redis queue for the
			// next consumer.

			// The wait and reconciliation sweepers stop first: they feed the queues, so
			// nothing lands there after the workers have drained.
			await Promise.all(sweepers.map(async (sweeper) => await sweeper.stop()));
			await Promise.all(workers.map(async (worker) => await worker.stop()));
			// After the workers are quiet, so the last events still reach the host.
			await lifecycleEventPublisher.stop();
		},
	};
}
