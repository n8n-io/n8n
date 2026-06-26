import { Logger } from '@n8n/backend-common';
import { DataSource, ScheduledJobRepository } from '@n8n/db';
import { OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { recurrenceCheckAt } from 'n8n-nodes-base/dist/nodes/Schedule/GenericFunctions';
import { getNextScheduleTime } from 'n8n-nodes-base/dist/nodes/Schedule/ScheduleTriggerHelpers';

import { PrometheusDistributedSchedulerMetricsService } from '@/metrics/prometheus/distributed-scheduler-metrics.service';

import { DistributedScheduleTriggerService } from './distributed-schedule-trigger.service';

const sweepIntervalMs = 10_000;
const materializeHorizonMs = 60_000;
const maxOccurrencesPerJob = 1_000;

@Service()
export class DistributedSchedulerService {
	private timeout: NodeJS.Timeout | undefined;

	private running = false;

	private shuttingDown = false;

	constructor(
		private readonly logger: Logger,
		private readonly dataSource: DataSource,
		private readonly scheduledJobRepository: ScheduledJobRepository,
		private readonly distributedScheduleTriggerService: DistributedScheduleTriggerService,
		private readonly metrics: PrometheusDistributedSchedulerMetricsService,
	) {
		this.logger = this.logger.scoped(['workflow-activation']);
	}

	init() {
		if (!this.distributedScheduleTriggerService.enabled || this.shuttingDown) return;
		if (this.running) return;

		this.running = true;
		this.scheduleNextSweep(0);
		this.logger.info('Started distributed scheduler sweep loop');
	}

	@OnShutdown()
	shutdown() {
		this.shuttingDown = true;
		this.running = false;
		clearTimeout(this.timeout);
		this.timeout = undefined;
	}

	private scheduleNextSweep(delayMs = sweepIntervalMs) {
		clearTimeout(this.timeout);
		if (!this.running || this.shuttingDown) return;

		this.timeout = setTimeout(async () => {
			try {
				await this.sweep();
			} catch (error) {
				this.logger.error('Distributed scheduler sweep failed', { error });
			}

			this.scheduleNextSweep();
		}, delayMs);
	}

	async sweep() {
		const horizon = new Date(Date.now() + materializeHorizonMs);

		await this.dataSource.manager.transaction(async (tx) => {
			const jobs = await this.scheduledJobRepository.claimDueJobs(horizon, 100, tx);

			for (const job of jobs) {
				if (!job.nextRunAt) continue;

				const materialized = this.computeOccurrences({ ...job, nextRunAt: job.nextRunAt }, horizon);
				const materializedCount = await this.scheduledJobRepository.materializeOccurrences(
					job,
					materialized.occurrences,
					materialized.nextRunAt,
					materialized.recurrenceLastValue,
					tx,
				);
				this.metrics.observeMaterialized(materializedCount);
			}
		});
	}

	private computeOccurrences(
		job: {
			cronExpression: string;
			timezone: string;
			nextRunAt: Date;
			recurrence: Parameters<typeof recurrenceCheckAt>[0] | null;
			recurrenceLastValue: number | null;
		},
		horizon: Date,
	) {
		const occurrences: Date[] = [];
		let cursor = job.nextRunAt;
		let recurrenceLastValue = job.recurrenceLastValue;
		let iterations = 0;

		while (cursor.getTime() <= horizon.getTime() && iterations < maxOccurrencesPerJob) {
			iterations++;
			const recurrence = job.recurrence ?? { activated: false };
			const recurrenceResult = recurrenceCheckAt(
				recurrence,
				recurrenceLastValue ?? undefined,
				job.timezone,
				cursor,
			);

			if (recurrenceResult.shouldRun) {
				occurrences.push(cursor);
				recurrenceLastValue = recurrenceResult.nextLastValue;
			}

			cursor = getNextScheduleTime(
				job.cronExpression,
				job.timezone,
				new Date(cursor.getTime() + 1),
			);
		}

		return {
			occurrences,
			nextRunAt: cursor,
			recurrenceLastValue,
		};
	}
}
