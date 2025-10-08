import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import type { CronExpression } from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';
import { CronTime } from 'cron';

// Define ScheduleInterval type locally since it's not exported from the main package
export type ScheduleInterval =
	| {
			field: 'cronExpression';
			expression: CronExpression;
	  }
	| {
			field: 'seconds';
			secondsInterval: number;
	  }
	| {
			field: 'minutes';
			minutesInterval: number;
	  }
	| {
			field: 'hours';
			hoursInterval: number;
			triggerAtMinute?: number;
	  }
	| {
			field: 'days';
			daysInterval: number;
			triggerAtHour?: number;
			triggerAtMinute?: number;
	  }
	| {
			field: 'weeks';
			weeksInterval: number;
			triggerAtDay: number[];
			triggerAtHour?: number;
			triggerAtMinute?: number;
	  }
	| {
			field: 'months';
			monthsInterval: number;
			triggerAtDayOfMonth?: number;
			triggerAtHour?: number;
			triggerAtMinute?: number;
	  };

@Service()
export class ScheduleValidationService {
	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
	) {}

	getMinScheduleIntervalMs(): number {
		const seconds = this.globalConfig.workflows.minScheduleIntervalSeconds;
		if (!Number.isFinite(seconds) || seconds <= 0) {
			throw new ApplicationError('Invalid N8N_MIN_SCHEDULE_INTERVAL_SECONDS configuration');
		}
		return seconds * 1000;
	}

	getMinScheduleIntervalSeconds(): number {
		return this.globalConfig.workflows.minScheduleIntervalSeconds;
	}

	validateScheduleInterval(interval: ScheduleInterval): void {
		const minIntervalMs = this.getMinScheduleIntervalMs();
		const intervalMs = this.calculateIntervalMs(interval);

		if (intervalMs < minIntervalMs) {
			const minSeconds = Math.ceil(minIntervalMs / 1000);
			const currentSeconds = Math.ceil(intervalMs / 1000);
			throw new ApplicationError(
				`Schedule interval too short. Minimum allowed: ${minSeconds}s, current: ${currentSeconds}s`,
			);
		}
	}

	validateCronExpression(cronExpression: string): void {
		const minIntervalMs = this.getMinScheduleIntervalMs();
		const intervalMs = this.calculateMinCronInterval(cronExpression);

		if (intervalMs < minIntervalMs) {
			const minSeconds = Math.ceil(minIntervalMs / 1000);
			const currentSeconds = Math.ceil(intervalMs / 1000);
			throw new ApplicationError(
				`Cron expression interval too short. Minimum allowed: ${minSeconds}s, current: ${currentSeconds}s`,
			);
		}
	}

	private calculateIntervalMs(interval: ScheduleInterval): number {
		switch (interval.field) {
			case 'seconds':
				return interval.secondsInterval * 1000;
			case 'minutes':
				return interval.minutesInterval * 60 * 1000;
			case 'hours':
				return interval.hoursInterval * 60 * 60 * 1000;
			case 'days':
				return interval.daysInterval * 24 * 60 * 60 * 1000;
			case 'weeks':
				return interval.weeksInterval * 7 * 24 * 60 * 60 * 1000;
			case 'months':
				return interval.monthsInterval * 30 * 24 * 60 * 60 * 1000; // Approximate
			case 'cronExpression':
				return this.calculateMinCronInterval(interval.expression);
			default:
				throw new ApplicationError(
					`Unsupported schedule interval field: ${(interval as any).field}`,
				);
		}
	}

	private calculateMinCronInterval(cronExpression: string): number {
		try {
			const cronTime = new CronTime(cronExpression);
			const now = new Date();
			const next = cronTime.getNextDateFrom(now).toJSDate();
			const afterNext = cronTime.getNextDateFrom(next).toJSDate();
			return afterNext.getTime() - next.getTime();
		} catch (error) {
			throw new ApplicationError(`Invalid cron expression: ${cronExpression}`);
		}
	}
}
