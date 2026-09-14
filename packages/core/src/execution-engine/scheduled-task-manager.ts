import { Logger } from '@n8n/backend-common';
import { CronLoggingConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { CronJob, CronTime } from 'cron';
import type { CronContext } from 'n8n-workflow';

import { InstanceSettings } from '@/instance-settings';

type CronKey = string; // see `ScheduledTaskManager.toCronKey`
type RegisteredCron = { job: CronJob; summary: string; ctx: ScheduledTaskContext };
type CronsByGroup = Map<string, Map<CronKey, RegisteredCron>>;

export type ScheduledTaskGroup = {
	type: string;
	id: string;
};

export type ScheduledTaskContext = {
	group: ScheduledTaskGroup;
	targetId: string;
	timezone: string;
	expression: string;
	recurrence?: CronContext['recurrence'];
};

@Service()
export class ScheduledTaskManager {
	private readonly cronsByGroupType = new Map<string, CronsByGroup>();

	private logInterval?: NodeJS.Timeout;

	/** Crons currently active instance-wide, to display in logs. */
	private get loggableCrons() {
		const loggableCrons: Record<string, string[]> = {};

		for (const [groupType, cronsByGroup] of this.cronsByGroupType) {
			for (const [groupId, crons] of cronsByGroup) {
				loggableCrons[`${groupType}GroupId-${groupId}`] = Array.from(crons.values()).map(
					({ summary }) => summary,
				);
			}
		}

		return loggableCrons;
	}

	constructor(
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
		{ activeInterval }: CronLoggingConfig,
	) {
		this.logger = this.logger.scoped('cron');

		if (activeInterval === 0) return;

		this.logInterval = setInterval(() => {
			if (Object.keys(this.loggableCrons).length === 0) return;
			this.logger.debug('Currently active crons', { active: this.loggableCrons });
		}, activeInterval * Time.minutes.toMilliseconds);
		this.logInterval.unref?.();
	}

	/**
	 * @param onTick - Callback invoked when the cron fires.
	 */
	register(ctx: ScheduledTaskContext, onTick: (scheduledTime: Date) => void): boolean {
		const { group, targetId, timezone, expression, recurrence } = ctx;

		if (!this.instanceSettings.isLeader) {
			this.logger.debug('Skipped cron registration on follower instance', {
				groupType: group.type,
				groupId: group.id,
				targetId,
				timezone,
				expression,
				recurrence,
				instanceRole: this.instanceSettings.instanceRole,
			});
			return false;
		}

		const summary = recurrence?.activated
			? `${expression} (every ${recurrence.intervalSize} ${recurrence.typeInterval})`
			: expression;

		const groupCrons = this.getGroupCrons(group);
		const key = this.toCronKey(ctx);

		if (groupCrons?.has(key)) {
			this.logger.warn('Skipped registration for already registered cron', {
				groupType: group.type,
				groupId: group.id,
				targetId,
				timezone,
				expression,
				recurrence,
				instanceRole: this.instanceSettings.instanceRole,
			});
			return false;
		}

		// `scheduledTime` always holds the canonical time of the upcoming
		// fire. We use it as a unique key to identify the cron execution.
		// It gets updated on each tick.
		const cronTime = new CronTime(expression, timezone);
		const computeNext = (): Date => cronTime.sendAt().toJSDate();
		let scheduledTime: Date = computeNext();

		const handleTick = () => {
			if (!this.instanceSettings.isLeader) return;

			// Capture the time this firing was scheduled for, then advance
			// `scheduledTime` to the next upcoming fire.
			const firedFor = scheduledTime;
			scheduledTime = computeNext();

			this.logger.debug('Executing cron', {
				groupType: group.type,
				groupId: group.id,
				targetId,
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

		this.setCron(group, key, { job, summary, ctx });

		this.logger.debug('Registered cron', {
			groupType: group.type,
			groupId: group.id,
			targetId,
			cron: summary,
			instanceRole: this.instanceSettings.instanceRole,
		});

		return true;
	}

	/** Returns whether any crons were registered for the group and got stopped. */
	deregisterGroup(group: ScheduledTaskGroup): boolean {
		const groupCrons = this.getGroupCrons(group);

		if (!groupCrons || groupCrons.size === 0) return false;

		const summaries: string[] = [];

		for (const cron of groupCrons.values()) {
			summaries.push(cron.summary);
			void cron.job.stop();
		}

		this.deleteGroupCrons(group);

		this.logger.info('Deregistered all crons', {
			groupType: group.type,
			groupId: group.id,
			crons: summaries,
			instanceRole: this.instanceSettings.instanceRole,
		});

		return true;
	}

	getGroupIds(groupType: string): string[] {
		return Array.from(this.cronsByGroupType.get(groupType)?.keys() ?? []);
	}

	getTargetIds(group: ScheduledTaskGroup): string[] {
		const groupCrons = this.getGroupCrons(group);
		if (!groupCrons) return [];

		const targetIds = new Set<string>();
		for (const cron of groupCrons.values()) {
			targetIds.add(cron.ctx.targetId);
		}

		return Array.from(targetIds);
	}

	/** Deregister the crons registered for a single target of a group. */
	deregisterTarget(group: ScheduledTaskGroup, targetId: string): void {
		const groupCrons = this.getGroupCrons(group);

		if (!groupCrons || groupCrons.size === 0) return;

		const summaries: string[] = [];

		for (const [key, cron] of groupCrons) {
			if (cron.ctx.targetId !== targetId) continue;
			summaries.push(cron.summary);
			void cron.job.stop();
			groupCrons.delete(key);
		}

		if (groupCrons.size === 0) this.deleteGroupCrons(group);

		if (summaries.length === 0) return;

		this.logger.info('Deregistered crons', {
			groupType: group.type,
			groupId: group.id,
			targetId,
			crons: summaries,
			instanceRole: this.instanceSettings.instanceRole,
		});
	}

	hasGroup(group: ScheduledTaskGroup): boolean {
		const groupCrons = this.getGroupCrons(group);
		return groupCrons !== undefined && groupCrons.size > 0;
	}

	hasTarget(group: ScheduledTaskGroup, targetId: string): boolean {
		return this.getTargetIds(group).includes(targetId);
	}

	deregisterGroups(groupType: string): void {
		for (const groupId of this.getGroupIds(groupType)) {
			this.deregisterGroup({ type: groupType, id: groupId });
		}
	}

	private getGroupCrons(group: ScheduledTaskGroup) {
		return this.cronsByGroupType.get(group.type)?.get(group.id);
	}

	private deleteGroupCrons(group: ScheduledTaskGroup) {
		const cronsByGroup = this.cronsByGroupType.get(group.type);
		if (!cronsByGroup) return;

		cronsByGroup.delete(group.id);
		if (cronsByGroup.size === 0) this.cronsByGroupType.delete(group.type);
	}

	private setCron(group: ScheduledTaskGroup, key: CronKey, cron: RegisteredCron) {
		let cronsByGroup = this.cronsByGroupType.get(group.type);
		if (!cronsByGroup) {
			cronsByGroup = new Map();
			this.cronsByGroupType.set(group.type, cronsByGroup);
		}

		const groupCrons = cronsByGroup.get(group.id);
		if (!groupCrons) {
			cronsByGroup.set(group.id, new Map([[key, cron]]));
		} else {
			groupCrons.set(key, cron);
		}
	}

	private toCronKey(ctx: ScheduledTaskContext): CronKey {
		const { recurrence, group, ...rest } = ctx;
		const flattened: Record<string, unknown> = !recurrence
			? { ...rest, groupType: group.type, groupId: group.id }
			: {
					...rest,
					groupType: group.type,
					groupId: group.id,
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
