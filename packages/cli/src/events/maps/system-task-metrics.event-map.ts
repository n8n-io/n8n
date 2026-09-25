/**
 * Low-cardinality metrics events emitted by the system task runner, its timer,
 * its durable handler and its job registrar, consumed by the Prometheus system
 * task collector. Payloads carry only the metric labels and values, so the
 * collector stays a dumb recorder and the emitters stay decoupled from
 * `prom-client`.
 */

/**
 * What drives a system task's occurrences: the leader-gated timer, a timer in
 * every eligible instance, or the durable scheduler.
 */
export type SystemTaskMode = 'leader_timer' | 'instance_timer' | 'durable';

/**
 * How a run settled. A rejection after the run's abort signal fired is the task
 * honoring the abort, so it is `aborted`, not `failure`.
 */
export type SystemTaskRunResult = 'success' | 'failure' | 'aborted';

/**
 * Why an occurrence did not run: the previous run was still going, another
 * instance handed the task to the durable scheduler, the occurrence fired
 * after the run signal had already aborted during stepdown, or the process
 * slept through it and the timer coalesced it into one late fire.
 */
export type SystemTaskSkipReason = 'overlap' | 'provisioned_elsewhere' | 'aborted' | 'coalesced';

export type SystemTaskMetricsEventMap = {
	'system-task-routed': {
		name: string;
		mode: SystemTaskMode;
		intervalSeconds?: number;
	};

	/** The in-memory timers of this instance started, on leader takeover. */
	'system-task-timers-started': {};

	/** The in-memory timers of this instance stopped and their runs settled, on leader stepdown. */
	'system-task-timers-stopped': {};

	'system-task-run-started': {
		name: string;
		mode: SystemTaskMode;
	};

	'system-task-run-settled': {
		name: string;
		mode: SystemTaskMode;
		result: SystemTaskRunResult;
		durationMs: number;
	};

	'system-task-run-skipped': {
		name: string;
		reason: SystemTaskSkipReason;
		/** How many occurrences the event stands for, one when absent. */
		count?: number;
	};

	'system-task-scheduling-failed': {
		name: string;
		mode: SystemTaskMode;
	};

	'system-task-provision-check-failed': {
		name: string;
	};

	'system-task-retry-scheduled': {
		name: string;
	};

	/** The in-memory timer of a task armed itself for the occurrence it reports. */
	'system-task-next-run-planned': {
		name: string;
		nextRunAtMs: number;
	};

	'system-task-fired': {
		name: string;
		lagMs: number;
	};
};
