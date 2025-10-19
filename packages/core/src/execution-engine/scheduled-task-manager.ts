import { Logger } from '@n8n/backend-common';
import { CronLoggingConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { CronJob } from 'cron';
import type { CronContext, Workflow } from 'n8n-workflow';

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
	) {
		this.logger = this.logger.scoped('cron');

		if (activeInterval === 0) return;

		this.logInterval = setInterval(() => {
			if (Object.keys(this.loggableCrons).length === 0) return;
			this.logger.debug('Currently active crons', { active: this.loggableCrons });
		}, activeInterval * Time.minutes.toMilliseconds);
	}

	registerCron(ctx: CronContext, onTick: () => void) {
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

		const job = new CronJob(
			expression,
			() => {
				if (!this.instanceSettings.isLeader) return;

				this.logger.debug('Executing cron for workflow', {
					workflowId,
					nodeId,
					cron: summary,
					instanceRole: this.instanceSettings.instanceRole,
				});

				onTick();
			},
			undefined,
			true,
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

	deregisterCrons(workflowId: string) {
		const workflowCrons = this.cronsByWorkflow.get(workflowId);

		if (!workflowCrons || workflowCrons.size === 0) return;

		const summaries: string[] = [];

		for (const cron of workflowCrons.values()) {
			summaries.push(cron.summary);
			cron.job.stop();
		}

		this.cronsByWorkflow.delete(workflowId);

		this.logger.info('Deregistered all crons for workflow', {
			workflowId,
			crons: summaries,
			instanceRole: this.instanceSettings.instanceRole,
		});
	}

	deregisterAllCrons() {
		for (const workflowId of this.cronsByWorkflow.keys()) {
			this.deregisterCrons(workflowId);
		}

		clearInterval(this.logInterval);
		this.logInterval = undefined;
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
