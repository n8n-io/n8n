import { Logger } from '@n8n/backend-common';
import { CronLoggingConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { CronJob, CronTime } from 'cron';
import type { CronContext } from 'n8n-workflow';

import { InstanceSettings } from '@/instance-settings';

type CronKey = string; // see `CronRegistry.toCronKey`
type RegisteredCron = { job: CronJob; summary: string; ctx: CronRegistryContext };
type CronsByOwner = Map<string, Map<CronKey, RegisteredCron>>;

export type CronRegistryContext = {
	namespace: string;
	ownerId: string;
	targetId: string;
	timezone: string;
	expression: string;
	recurrence?: CronContext['recurrence'];
};

@Service()
export class CronRegistry {
	private readonly cronsByNamespace = new Map<string, CronsByOwner>();

	private logInterval?: NodeJS.Timeout;

	/** Crons currently active instance-wide, to display in logs. */
	private get loggableCrons() {
		const loggableCrons: Record<string, string[]> = {};

		for (const [namespace, cronsByOwner] of this.cronsByNamespace) {
			for (const [ownerId, crons] of cronsByOwner) {
				loggableCrons[`${namespace}OwnerId-${ownerId}`] = Array.from(crons.values()).map(
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
	register(ctx: CronRegistryContext, onTick: (scheduledTime: Date) => void): boolean {
		const { namespace, ownerId, targetId, timezone, expression, recurrence } = ctx;

		if (!this.instanceSettings.isLeader) {
			this.logger.debug('Skipped cron registration on follower instance', {
				namespace,
				ownerId,
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

		const ownerCrons = this.getOwnerCrons(namespace, ownerId);
		const key = this.toCronKey(ctx);

		if (ownerCrons?.has(key)) {
			this.logger.debug('Skipped registration for already registered cron', {
				namespace,
				ownerId,
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
				namespace,
				ownerId,
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

		this.setCron(namespace, ownerId, key, { job, summary, ctx });

		this.logger.debug('Registered cron', {
			namespace,
			ownerId,
			targetId,
			cron: summary,
			instanceRole: this.instanceSettings.instanceRole,
		});

		return true;
	}

	/** Returns whether any crons were registered for the owner and got stopped. */
	deregisterOwner(namespace: string, ownerId: string): boolean {
		const ownerCrons = this.getOwnerCrons(namespace, ownerId);

		if (!ownerCrons || ownerCrons.size === 0) return false;

		const summaries: string[] = [];

		for (const cron of ownerCrons.values()) {
			summaries.push(cron.summary);
			void cron.job.stop();
		}

		this.deleteOwnerCrons(namespace, ownerId);

		this.logger.info('Deregistered all crons', {
			namespace,
			ownerId,
			crons: summaries,
			instanceRole: this.instanceSettings.instanceRole,
		});

		return true;
	}

	getOwnerIds(namespace: string): string[] {
		return Array.from(this.cronsByNamespace.get(namespace)?.keys() ?? []);
	}

	getTargetIds(namespace: string, ownerId: string): string[] {
		const ownerCrons = this.getOwnerCrons(namespace, ownerId);
		if (!ownerCrons) return [];

		const targetIds = new Set<string>();
		for (const cron of ownerCrons.values()) {
			targetIds.add(cron.ctx.targetId);
		}

		return Array.from(targetIds);
	}

	/** Deregister the crons registered for a single target of an owner. */
	deregisterTarget(namespace: string, ownerId: string, targetId: string): void {
		const ownerCrons = this.getOwnerCrons(namespace, ownerId);

		if (!ownerCrons || ownerCrons.size === 0) return;

		const summaries: string[] = [];

		for (const [key, cron] of ownerCrons) {
			if (cron.ctx.targetId !== targetId) continue;
			summaries.push(cron.summary);
			void cron.job.stop();
			ownerCrons.delete(key);
		}

		if (ownerCrons.size === 0) this.deleteOwnerCrons(namespace, ownerId);

		if (summaries.length === 0) return;

		this.logger.info('Deregistered crons', {
			namespace,
			ownerId,
			targetId,
			crons: summaries,
			instanceRole: this.instanceSettings.instanceRole,
		});
	}

	hasOwner(namespace: string, ownerId: string): boolean {
		const ownerCrons = this.getOwnerCrons(namespace, ownerId);
		return ownerCrons !== undefined && ownerCrons.size > 0;
	}

	deregisterNamespace(namespace: string): void {
		for (const ownerId of this.getOwnerIds(namespace)) {
			this.deregisterOwner(namespace, ownerId);
		}
	}

	private getOwnerCrons(namespace: string, ownerId: string) {
		return this.cronsByNamespace.get(namespace)?.get(ownerId);
	}

	private deleteOwnerCrons(namespace: string, ownerId: string) {
		const cronsByOwner = this.cronsByNamespace.get(namespace);
		if (!cronsByOwner) return;

		cronsByOwner.delete(ownerId);
		if (cronsByOwner.size === 0) this.cronsByNamespace.delete(namespace);
	}

	private setCron(namespace: string, ownerId: string, key: CronKey, cron: RegisteredCron) {
		let cronsByOwner = this.cronsByNamespace.get(namespace);
		if (!cronsByOwner) {
			cronsByOwner = new Map();
			this.cronsByNamespace.set(namespace, cronsByOwner);
		}

		const ownerCrons = cronsByOwner.get(ownerId);
		if (!ownerCrons) {
			cronsByOwner.set(ownerId, new Map([[key, cron]]));
		} else {
			ownerCrons.set(key, cron);
		}
	}

	private toCronKey(ctx: CronRegistryContext): CronKey {
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
