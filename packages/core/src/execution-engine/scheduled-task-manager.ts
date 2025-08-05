import { Logger } from '@n8n/backend-common';
import { CronLoggingConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { CronJob } from 'cron';
import type { CronContext, Workflow } from 'n8n-workflow';

import { InstanceSettings } from '@/instance-settings';

type CronKey = string; // see `ScheduledTaskManager.toCronKey`
type Cron = { job: CronJob; summary: string };
type CronsByWorkflow = Map<Workflow['id'], Map<CronKey, Cron>>;

@Service()
export class ScheduledTaskManager {
	readonly cronsByWorkflow: CronsByWorkflow = new Map();

	private readonly logInterval?: NodeJS.Timeout;

	constructor(
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
		{ activeInterval }: CronLoggingConfig,
	) {
		this.logger = this.logger.scoped('cron');

		if (activeInterval === 0) return;

		this.logInterval = setInterval(
			() => this.logActiveCrons(),
			activeInterval * Time.minutes.toMilliseconds,
		);
	}

	registerCron(
		{ workflowId, timezone, nodeId, expression, recurrence }: CronContext,
		onTick: () => void,
	) {
		const summary = recurrence?.activated
			? `${expression} (every ${recurrence.intervalSize} ${recurrence.typeInterval})`
			: expression;

		const workflowCrons = this.cronsByWorkflow.get(workflowId);
		const key = this.toCronKey({ workflowId, nodeId, expression, timezone, recurrence });

		if (workflowCrons?.has(key)) {
			// @TODO: Report to Sentry
			this.logger.debug('Skipped registration for already registered cron', {
				workflowId,
				nodeId,
				cron: summary,
				instanceRole: this.instanceSettings.instanceRole,
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

		const cron: Cron = { job, summary };

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

		const summariesToLog: string[] = [];

		for (const cron of workflowCrons.values()) {
			summariesToLog.push(cron.summary);
			cron.job.stop();
		}

		this.cronsByWorkflow.delete(workflowId);

		this.logger.info('Deregistered all crons for workflow', {
			workflowId,
			crons: summariesToLog,
			instanceRole: this.instanceSettings.instanceRole,
		});
	}

	deregisterAllCrons() {
		for (const workflowId of this.cronsByWorkflow.keys()) {
			this.deregisterCrons(workflowId);
		}

		clearInterval(this.logInterval);
	}

	private logActiveCrons() {
		const active: Record<string, string[]> = {};

		for (const [workflowId, crons] of this.cronsByWorkflow) {
			active[`workflowId:${workflowId}`] = Array.from(crons.values()).map(({ summary }) => summary);
		}

		if (Object.keys(active).length === 0) return;

		this.logger.debug('Currently active crons', { active });
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
