import { Time } from '@n8n/constants';
import z from 'zod';

import { Config, Env, Nested } from '../decorators';
import { positiveIntSchema } from '../schemas';

@Config
class PruningIntervalsConfig {
	/** How often (minutes) execution data should be hard-deleted. */
	@Env('EXECUTIONS_DATA_PRUNE_HARD_DELETE_INTERVAL')
	hardDelete: number = 15;

	/** How often (minutes) execution data should be soft-deleted. */
	@Env('EXECUTIONS_DATA_PRUNE_SOFT_DELETE_INTERVAL')
	softDelete: number = 60;
}

@Config
class ConcurrencyConfig {
	/**
	 * Max production executions allowed to run concurrently. `-1` means unlimited.
	 *
	 * Default for scaling mode is taken from the worker's `--concurrency` flag.
	 */
	@Env('N8N_CONCURRENCY_PRODUCTION_LIMIT')
	productionLimit: number = -1;

	/** Max evaluation executions allowed to run concurrently. `-1` means unlimited. */
	@Env('N8N_CONCURRENCY_EVALUATION_LIMIT')
	evaluationLimit: number = -1;
}

@Config
class QueueRecoveryConfig {
	/** How often (minutes) to check for queue recovery. */
	@Env('N8N_EXECUTIONS_QUEUE_RECOVERY_INTERVAL')
	interval: number = 180;

	/** Size of batch of executions to check for queue recovery. */
	@Env('N8N_EXECUTIONS_QUEUE_RECOVERY_BATCH')
	batchSize: number = 100;
}

@Config
class RecoveryConfig {
	/**
	 * Number of last executions to check when determining if a workflow should be deactivated
	 * when all of the last N executions have crashed.
	 */
	@Env('N8N_WORKFLOW_AUTODEACTIVATION_MAX_LAST_EXECUTIONS')
	maxLastExecutions: number = 3;

	/**
	 * Whether to automatically deactivate workflows that have all their last executions crashed.
	 */
	@Env('N8N_WORKFLOW_AUTODEACTIVATION_ENABLED')
	workflowDeactivationEnabled: boolean = false;
}

const nonNegativeIntSchema = z.coerce.number().int().nonnegative();

@Config
class QueueRetentionConfig {
	/**
	 * How many completed Bull jobs to keep in Redis.
	 *
	 * - `0` removes completed jobs immediately (default).
	 * - `n` keeps the last `n` completed jobs and trims older ones.
	 */
	@Env('N8N_EXECUTIONS_QUEUE_KEEP_LAST_COMPLETED', nonNegativeIntSchema)
	keepLastCompleted: number = 0;

	/**
	 * How many failed Bull jobs to keep in Redis.
	 *
	 * - `0` removes failed jobs immediately (default).
	 * - `n` keeps the last `n` completed jobs and trims older ones.
	 */
	@Env('N8N_EXECUTIONS_QUEUE_KEEP_LAST_FAILED', nonNegativeIntSchema)
	keepLastFailed: number = 0;
}

const executionModeSchema = z.enum(['regular', 'queue']);

export type ExecutionMode = z.infer<typeof executionModeSchema>;

@Config
export class ExecutionsConfig {
	/** Whether to run executions in regular mode (in-process) or scaling mode (in workers). */
	@Env('EXECUTIONS_MODE', executionModeSchema)
	mode: ExecutionMode = 'regular';

	/**
	 * How long (seconds) a workflow execution may run for before timeout.
	 * On timeout, the execution will be forcefully stopped. `-1` for unlimited.
	 * Currently unlimited by default - this default will change in a future version.
	 */
	@Env('EXECUTIONS_TIMEOUT')
	timeout: number = -1;

	/** Upper bound in seconds for execution timeout. Default: 1 hour. */
	@Env('EXECUTIONS_TIMEOUT_MAX')
	maxTimeout: number = 1 * Time.hours.toSeconds;

	/** Whether to delete past executions on a rolling basis. */
	@Env('EXECUTIONS_DATA_PRUNE')
	pruneData: boolean = true;

	/** How old (hours) a finished execution must be to qualify for soft-deletion. */
	@Env('EXECUTIONS_DATA_MAX_AGE')
	pruneDataMaxAge: number = 336;

	/**
	 * Max number of finished executions to keep in database. Does not necessarily
	 * prune to the exact max number. `0` for unlimited.
	 */
	@Env('EXECUTIONS_DATA_PRUNE_MAX_COUNT')
	pruneDataMaxCount: number = 10_000;

	/**
	 * How old (hours) a finished execution must be to qualify for hard-deletion.
	 * This buffer by default excludes recent executions as the user may need
	 * them while building a workflow.
	 */
	@Env('EXECUTIONS_DATA_HARD_DELETE_BUFFER')
	pruneDataHardDeleteBuffer: number = 1;

	@Nested
	pruneDataIntervals: PruningIntervalsConfig;

	@Nested
	concurrency: ConcurrencyConfig;

	@Nested
	queueRecovery: QueueRecoveryConfig;

	@Nested
	queueRetention: QueueRetentionConfig;

	@Nested
	recovery: RecoveryConfig;

	/** Whether to save execution data for failed production executions. This default can be overridden at a workflow level. */
	@Env('EXECUTIONS_DATA_SAVE_ON_ERROR')
	saveDataOnError: 'all' | 'none' = 'all';

	/** Whether to save execution data for successful production executions. This default can be overridden at a workflow level. */
	@Env('EXECUTIONS_DATA_SAVE_ON_SUCCESS')
	saveDataOnSuccess: 'all' | 'none' = 'all';

	/** Whether to save execution data as each node executes. This default can be overridden at a workflow level. */
	@Env('EXECUTIONS_DATA_SAVE_ON_PROGRESS')
	saveExecutionProgress: boolean = false;

	/** Whether to save execution data for manual executions. This default can be overridden at a workflow level. */
	@Env('EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS')
	saveDataManualExecutions: boolean = true;

	/**
	 * Max byte size of execution run data to load for display.
	 * Executions whose data exceeds this are returned without their run data.
	 * Does not affect operational reads (retry, resume, crash recovery).
	 * `0` disables.
	 */
	@Env('EXECUTIONS_DATA_MAX_DISPLAY_SIZE')
	maxDisplaySize: number = 100 * 1024 * 1024; // 100 MB

	/**
	 * Maximum size in MiB of a webhook response a worker sends back to the main instance
	 * inside a queue message, in queue mode.
	 *
	 * Redis holds several copies of a response while the message is in flight, so budget
	 * about 1.5 times this value in Redis memory for each response in flight.
	 *
	 * With `N8N_WEBHOOK_RESPONSE_RELAY_OFFLOAD_ENABLED` turned on, a larger body goes to
	 * the binary-data store and the main instance reads it back from there. Otherwise the
	 * node fails. Only the body can go to the store, so a response whose headers alone
	 * exceed this limit fails either way.
	 */
	@Env('N8N_WEBHOOK_RESPONSE_RELAY_SIZE_MAX', positiveIntSchema)
	webhookResponseRelaySizeMaxMiB: number = 64;

	/**
	 * Whether a worker stores a response body over `N8N_WEBHOOK_RESPONSE_RELAY_SIZE_MAX` in
	 * the binary-data store, so the main instance can stream it to the client, instead of
	 * failing the node.
	 *
	 * Needs `N8N_DEFAULT_BINARY_DATA_MODE` set to a mode with a store (`filesystem`,
	 * `database`, `s3`, or `azure`), and a store every instance can read.
	 *
	 * Only the worker reads this setting. Turn it on once every main instance runs a version
	 * that reads a stored body: an older main returns the storage reference instead of the
	 * response body.
	 */
	@Env('N8N_WEBHOOK_RESPONSE_RELAY_OFFLOAD_ENABLED')
	webhookResponseRelayOffloadEnabled: boolean = false;
}
