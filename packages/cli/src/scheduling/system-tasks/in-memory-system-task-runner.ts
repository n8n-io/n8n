import type { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import type { SystemTask, SystemTaskSchedule } from '@n8n/decorators';
import { scheduleFromDefinition } from '@n8n/scheduler';
import type { Tracing } from 'n8n-core';

import type { EventService } from '@/events/event.service';
import type {
	SystemTaskMode,
	SystemTaskSkipReason,
} from '@/events/maps/system-task-metrics.event-map';

import { emitSystemTaskMetric } from './emit-system-task-metric';
import { observeSystemTaskRun } from './system-task-run-observer';
import { SystemTaskTimer } from './system-task-timer';

export type InMemorySystemTaskMode = Exclude<SystemTaskMode, 'durable'>;

/** Calls back into the owner of the runner. */
export type InMemorySystemTaskHooks = {
	reportFailure: (message: string, taskName: Pick<SystemTask, 'name'>, error: unknown) => void;
	/** Runs on start, before the first timer starts. */
	onStart?: () => void;
	/** Runs when a stop ends, unless a start came in while the stop waited. */
	onStop?: () => void;
};

export type InMemorySystemTaskOptions = {
	/** Runs the task once on start, on top of its schedule. */
	runOnStart?: boolean;
	/** Skips a run when it returns `true`. It reports the skip itself. */
	shouldSkipRun?: () => Promise<boolean>;
};

type InFlightRun = {
	promise: Promise<void>;
	skipWarned: boolean;
};

type Entry = InMemorySystemTaskOptions & {
	task: SystemTask;
	timer: SystemTaskTimer;
	inFlightRun?: InFlightRun;
	retryTimer?: NodeJS.Timeout;
};

/**
 * Runs system tasks on in-memory timers, not on the durable scheduler.
 * Its tasks start and stop together, and a stop aborts the runs in flight.
 * Each task runs one occurrence at a time.
 * A failed run is retried while the timers run.
 */
export class InMemorySystemTaskRunner {
	private readonly entries: Entry[] = [];

	private started = false;

	/**
	 * Counts the starts and the stops.
	 * A stop waits for the runs in flight, so a start can happen before the stop ends.
	 * The stop compares this count to find out that it is out of date.
	 */
	private generation = 0;

	private controller = new AbortController();

	constructor(
		private readonly mode: InMemorySystemTaskMode,
		private readonly logger: Logger,
		private readonly eventService: EventService,
		private readonly tracing: Tracing,
		private readonly timezone: string,
		private readonly hooks: InMemorySystemTaskHooks,
	) {}

	/**
	 * Adds a task and creates its timer.
	 * The timer starts at once if the other timers already run.
	 */
	add(
		task: SystemTask,
		schedule: SystemTaskSchedule,
		options: InMemorySystemTaskOptions = {},
	): void {
		const entry: Entry = {
			...options,
			task,
			timer: this.createTimer(task, schedule, () => {
				void this.run(entry);
			}),
		};
		this.entries.push(entry);

		emitSystemTaskMetric(this.eventService, 'system-task-routed', {
			name: task.name,
			mode: this.mode,
			intervalSeconds: schedule.kind === 'interval' ? schedule.intervalSeconds : undefined,
		});

		if (this.started) {
			this.startTimer(entry, new Date());
		}
	}

	/** Starts every timer from `from` and gives the runs a new abort signal. */
	start(from: Date): void {
		if (!this.started) {
			this.started = true;
			this.generation++;
			this.controller = new AbortController();
			this.hooks.onStart?.();
			for (const entry of this.entries) {
				this.startTimer(entry, from);
			}
			this.logger.debug('Started the in-memory system task timers', {
				mode: this.mode,
				count: this.entries.length,
			});
		}
	}

	/** Stops every timer, aborts the runs and waits for the runs in flight. */
	async stop(): Promise<void> {
		const generation = ++this.generation;
		this.started = false;
		this.controller.abort();
		for (const entry of this.entries) {
			this.stopTimer(entry);
		}
		this.logger.debug('Stopped the in-memory system task timers', { mode: this.mode });
		await Promise.all(
			this.entries.flatMap(({ inFlightRun }) => (inFlightRun ? [inFlightRun.promise] : [])),
		);
		if (generation === this.generation) {
			this.hooks.onStop?.();
		}
	}

	private startTimer(entry: Entry, from: Date): void {
		entry.timer.start(from);
		if (entry.runOnStart) {
			void this.run(entry);
		}
	}

	private stopTimer(entry: Entry): void {
		entry.timer.stop();
		clearTimeout(entry.retryTimer);
		entry.retryTimer = undefined;
	}

	private createTimer(
		task: SystemTask,
		schedule: SystemTaskSchedule,
		onFire: () => void,
	): SystemTaskTimer {
		return new SystemTaskTimer(
			scheduleFromDefinition(schedule, this.timezone),
			(lagMs, coalesced) => {
				emitSystemTaskMetric(this.eventService, 'system-task-fired', { name: task.name, lagMs });
				if (coalesced > 0) {
					this.emitSkipped(task, 'coalesced', coalesced);
				}
				onFire();
			},
			(error) => {
				this.hooks.reportFailure(
					'Could not plan a system task schedule, so the task will not run',
					task,
					error,
				);
				emitSystemTaskMetric(this.eventService, 'system-task-scheduling-failed', {
					name: task.name,
					mode: this.mode,
				});
			},
			(fireAt) => {
				emitSystemTaskMetric(this.eventService, 'system-task-next-run-planned', {
					name: task.name,
					nextRunAtMs: fireAt.getTime(),
				});
			},
		);
	}

	/**
	 * Runs one occurrence. A task runs one occurrence at a time: if a run takes
	 * longer than the interval, the next occurrence is skipped.
	 */
	private async run(entry: Entry): Promise<void> {
		if (entry.inFlightRun) {
			if (!entry.inFlightRun.skipWarned) {
				entry.inFlightRun.skipWarned = true;
				this.logger.warn('Skipped a system task occurrence, its previous run is still going', {
					name: entry.task.name,
				});
			}
			this.emitSkipped(entry.task, 'overlap');
		} else {
			// The new run does the same work as the retry, so drop the retry.
			clearTimeout(entry.retryTimer);
			entry.retryTimer = undefined;

			const inFlightRun: InFlightRun = {
				promise: this.runOnce(entry).finally(() => {
					if (entry.inFlightRun === inFlightRun) {
						entry.inFlightRun = undefined;
					}
				}),
				skipWarned: false,
			};
			entry.inFlightRun = inFlightRun;

			await inFlightRun.promise;
		}
	}

	private async runOnce(entry: Entry): Promise<void> {
		const skipped = entry.shouldSkipRun !== undefined && (await entry.shouldSkipRun());
		if (!skipped) {
			const { signal } = this.controller;
			if (signal.aborted) {
				this.emitSkipped(entry.task, 'aborted');
			} else {
				const outcome = await observeSystemTaskRun(
					this.eventService,
					this.tracing,
					entry.task,
					this.mode,
					signal,
				);
				if (outcome.result === 'failure') {
					this.hooks.reportFailure('A system task run failed', entry.task, outcome.error);
					this.scheduleRetry(entry);
				}
			}
		}
	}

	private scheduleRetry(entry: Entry): void {
		const { retryDelaySeconds, effects } = entry.task;
		if (retryDelaySeconds !== undefined && effects !== 'non-idempotent' && this.started) {
			clearTimeout(entry.retryTimer);
			entry.retryTimer = setTimeout(() => {
				void this.run(entry);
			}, retryDelaySeconds * Time.seconds.toMilliseconds);
			entry.retryTimer.unref();
			emitSystemTaskMetric(this.eventService, 'system-task-retry-scheduled', {
				name: entry.task.name,
			});
		}
	}

	private emitSkipped(
		task: Pick<SystemTask, 'name'>,
		reason: SystemTaskSkipReason,
		count?: number,
	): void {
		emitSystemTaskMetric(this.eventService, 'system-task-run-skipped', {
			name: task.name,
			reason,
			...(count === undefined ? {} : { count }),
		});
	}
}
