import { Logger } from '@n8n/backend-common';
import { CronLoggingConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { CronJob } from 'cron';
import type { CronContext, Workflow } from 'n8n-workflow';

import { InstanceSettings } from '@/instance-settings';

type Cron = { job: CronJob; summary: string };
type CronsByWorkflow = Map<Workflow['id'], Cron[]>;

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
		const workflowCrons = this.cronsByWorkflow.get(workflowId) ?? [];
		workflowCrons.push(cron);
		this.cronsByWorkflow.set(workflowId, workflowCrons);

		this.logger.debug('Registered cron for workflow', {
			workflowId,
			cron: summary,
			instanceRole: this.instanceSettings.instanceRole,
		});
	}

	deregisterCrons(workflowId: string) {
		const cronsByWorkflow = this.cronsByWorkflow.get(workflowId) ?? [];

		if (cronsByWorkflow.length === 0) return;

		const cronsToLog: string[] = [];

		while (cronsByWorkflow.length > 0) {
			const cron = cronsByWorkflow.pop();
			if (cron) {
				cronsToLog.push(cron.summary);
				cron.job.stop();
			}
		}

		this.cronsByWorkflow.delete(workflowId);

		this.logger.info('Deregistered all crons for workflow', {
			workflowId,
			crons: cronsToLog,
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
			active[`workflowId:${workflowId}`] = crons.map(({ summary }) => summary);
		}

		if (Object.keys(active).length === 0) return;

		this.logger.debug('Currently active crons', { active });
	}
}
