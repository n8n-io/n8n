import { Logger } from '@n8n/backend-common';
import { CronLoggingConfig, GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { CronJob, CronTime } from 'cron';
import type { CronContext, Workflow } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

import { ErrorReporter } from '@/errors';
import { InstanceSettings } from '@/instance-settings';

type CronKey = string; // see `ScheduledTaskManager.toCronKey`
type Cron = { job: CronJob; summary: string; ctx: CronContext };
type CronsByWorkflow = Map<Workflow['id'], Map<CronKey, Cron>>;

@Service()
export class ScheduledTaskManager {
	readonly cronsByWorkflow: CronsByWorkflow = new Map();

	private logInterval?: NodeJS.Timeout;

	/** Crons currently active instance-wide, to display in logs. */
	private get loggableCrons() {
		const loggableCrons: Record<string, string[]> = {};

		for (const [workflowId, crons] of this.cronsByWorkflow) {
			loggableCrons[`workflowId-${workflowId}`] = Array.from(crons.values()).map(
				({ summary }) => summary,
			);
		}

		return loggableCrons;
	}

	constructor(
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
		{ activeInterval }: CronLoggingConfig,
		private readonly errorReporter: ErrorReporter,
		// `globalConfig` carries `N8N_MIN_SCHEDULE_INTERVAL_SECONDS`. It's
		// optional only so upstream test fixtures (and any non-DI caller) can
		// construct a manager without wiring it. In production, DI always
		// injects it; an absent value is treated as "no minimum" downstream.
		private readonly globalConfig?: GlobalConfig,
	) {
		this.logger = this.logger.scoped('cron');

		if (activeInterval === 0) return;

		this.logInterval = setInterval(() => {
			if (Object.keys(this.loggableCrons).length === 0) return;
			this.logger.debug('Currently active crons', { active: this.loggableCrons });
		}, activeInterval * Time.minutes.toMilliseconds);
	}

	/**
	 * @param onTick - Callback invoked when the cron fires.
	 */
	registerCron(ctx: CronContext, onTick: (scheduledTime: Date) => void) {
		const { workflowId, timezone, nodeId, expression, recurrence } = ctx;

		const summary = recurrence?.activated
			? `${expression} (every ${recurrence.intervalSize} ${recurrence.typeInterval})`
			: expression;

		const workflowCrons = this.cronsByWorkflow.get(workflowId);
		const key = this.toCronKey({ workflowId, nodeId, expression, timezone, recurrence });

		if (workflowCrons?.has(key)) {
			this.errorReporter.error('Skipped registration for already registered cron', {
				tags: { cron: 'duplicate' },
				extra: {
					workflowId,
					timezone,
					nodeId,
					expression,
					recurrence,
					instanceRole: this.instanceSettings.instanceRole,
				},
			});
			return;
		}

		// `scheduledTime` always holds the canonical time of the upcoming
		// fire. We use it as a unique key to identify the cron execution.
		// It gets updated on each tick.
		const cronTime = new CronTime(expression, timezone);
		const computeNext = (): Date => cronTime.sendAt().toJSDate();
		let scheduledTime: Date = computeNext();

		this.assertMinScheduleInterval(cronTime, ctx);

		const handleTick = () => {
			if (!this.instanceSettings.isLeader) return;

			// Capture the time this firing was scheduled for, then advance
			// `scheduledTime` to the next upcoming fire.
			const firedFor = scheduledTime;
			scheduledTime = computeNext();

			this.logger.debug('Executing cron for workflow', {
				workflowId,
				nodeId,
				cron: summary,
				instanceRole: this.instanceSettings.instanceRole,
			});

			onTick(firedFor);
		};

		const job: CronJob = new CronJob(
			expression,
			handleTick,
			/* onComplete= */ undefined,
			/* start= */ true,
			timezone,
		);

		const cron: Cron = { job, summary, ctx };

		if (!workflowCrons) {
			this.cronsByWorkflow.set(workflowId, new Map([[key, cron]]));
		} else {
			workflowCrons.set(key, cron);
		}

		this.logger.debug('Registered cron for workflow', {
			workflowId,
			cron: summary,
			instanceRole: this.instanceSettings.instanceRole,
		});
	}

	/** Returns whether any crons were registered for the workflow and got stopped. */
	deregisterCrons(workflowId: string): boolean {
		const workflowCrons = this.cronsByWorkflow.get(workflowId);

		if (!workflowCrons || workflowCrons.size === 0) return false;

		const summaries: string[] = [];

		for (const cron of workflowCrons.values()) {
			summaries.push(cron.summary);
			void cron.job.stop();
		}

		this.cronsByWorkflow.delete(workflowId);

		this.logger.info('Deregistered all crons for workflow', {
			workflowId,
			crons: summaries,
			instanceRole: this.instanceSettings.instanceRole,
		});

		return true;
	}

	/** Ids of workflows that currently have crons registered. */
	getWorkflowIdsWithCrons(): string[] {
		return Array.from(this.cronsByWorkflow.keys());
	}

	deregisterAllCrons() {
		for (const workflowId of this.cronsByWorkflow.keys()) {
			this.deregisterCrons(workflowId);
		}

		clearInterval(this.logInterval);
		this.logInterval = undefined;
	}

	/**
	 * Enforces `N8N_MIN_SCHEDULE_INTERVAL_SECONDS`. The minimum is computed by
	 * taking two consecutive next-fire times from the cron expression — this
	 * works uniformly for cron strings and for any of the Schedule Trigger's
	 * higher-level rule shapes, since they are all canonicalised to a cron
	 * expression before reaching this point. Set the env var to 0 to disable.
	 *
	 * Optional chaining and the `?? 0` fallback let upstream test fixtures
	 * (and any caller that hasn't wired `globalConfig` through DI) reach this
	 * method without crashing — an absent config means "no minimum", which is
	 * the same opt-in default the env var produces.
	 */
	private assertMinScheduleInterval(cronTime: CronTime, ctx: CronContext) {
		const minSeconds = this.globalConfig?.workflows?.minScheduleIntervalSeconds ?? 0;
		if (!Number.isFinite(minSeconds) || minSeconds <= 0) return;

		const next = cronTime.sendAt().toMillis();
		const after = cronTime.getNextDateFrom(new Date(next)).toMillis();
		const intervalSeconds = (after - next) / 1000;

		if (intervalSeconds < minSeconds) {
			throw new UserError(
				`Schedule interval too short: minimum allowed is ${minSeconds}s, requested ~${Math.ceil(intervalSeconds)}s`,
				{ extra: { workflowId: ctx.workflowId, nodeId: ctx.nodeId, expression: ctx.expression } },
			);
		}
	}

	private toCronKey(ctx: CronContext): CronKey {
		const { recurrence, ...rest } = ctx;
		const flattened: Record<string, unknown> = !recurrence
			? rest
			: {
					...rest,
					recurrenceActivated: recurrence.activated,
					...(recurrence.activated && {
						recurrenceIndex: recurrence.index,
						recurrenceIntervalSize: recurrence.intervalSize,
						recurrenceTypeInterval: recurrence.typeInterval,
					}),
				};

		const sorted = Object.keys(flattened)
			.sort()
			.reduce<Record<string, unknown>>((result, key) => {
				result[key] = flattened[key];
				return result;
			}, {});

		return JSON.stringify(sorted);
	}
}
