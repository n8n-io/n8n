import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { Time } from '@n8n/constants';
import { OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { latestWins } from '@n8n/utils/promise/latest-wins';

import { ExecutionLimitUsageRepository } from './execution-limit-usage.repository';
import { ExecutionLimitsSnapshot, type LimitedScopes } from './execution-limits-snapshot';
import { addUtcDays, periodRange, toUtcDay, type UsagePeriod } from './execution-usage-period';
import {
	NO_USAGE,
	toUsage,
	type ExecutionUsage,
	type UsageScope,
	type UsageTotals,
} from './execution-usage';

/** One fold cycle of the execution ledger. */
export const USAGE_REFRESH_INTERVAL_MS = 5 * Time.seconds.toMilliseconds;

const FAILURES_BETWEEN_LOGS = 12;

type ScopeTotals = {
	instance: UsageTotals;
	projects: ReadonlyMap<string, UsageTotals>;
};

type Loaded = {
	period: UsagePeriod;
	today: string;
	/** The limits that this load read usage for. */
	limits: LimitedScopes;
	/** The days of the period before today. They change rarely, so a refresh reuses them. */
	closed: ScopeTotals;
	current: ScopeTotals;
};

/**
 * The usage of the current period for each scope that has a limit, held in memory so a
 * read at an execution start does no I/O. The usage tables stay the source of truth.
 *
 * Each process loads its own copy. A timer reloads it every `USAGE_REFRESH_INTERVAL_MS`.
 */
@Service()
export class ExecutionUsageCache {
	private loaded: Loaded | null = null;

	private refreshTimer: NodeJS.Timeout | undefined;

	private failuresInARow = 0;

	constructor(
		private readonly snapshot: ExecutionLimitsSnapshot,
		private readonly repository: ExecutionLimitUsageRepository,
		private readonly eventService: EventService,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('policy');
	}

	/** A failed first load does not stop the boot: the timer tries again. */
	async start(): Promise<void> {
		await this.refresh();

		this.refreshTimer ??= setInterval(async () => await this.refresh(), USAGE_REFRESH_INTERVAL_MS);
		this.refreshTimer.unref();
	}

	@OnShutdown()
	stop(): void {
		clearInterval(this.refreshTimer);
		this.refreshTimer = undefined;
	}

	/**
	 * `null` means the usage is not known: nothing is loaded, the scope had no limit at
	 * the load, or the loaded period is over or has another unit than the limits.
	 */
	read(scope: UsageScope, now: Date): ExecutionUsage | null {
		const { loaded } = this;
		if (!loaded || now >= loaded.period.resetsAt) return null;
		if (this.snapshot.readLimitedScopes()?.periodUnit !== loaded.period.unit) return null;

		const { period, limits, closed, current } = loaded;
		if (scope.type === 'instance') {
			if (!limits.hasInstanceLimit) return null;
			return toUsage(scope, period, closed.instance, current.instance);
		}

		const { projectId } = scope;
		if (!limits.limitedProjectIds.has(projectId)) return null;
		return toUsage(
			scope,
			period,
			closed.projects.get(projectId) ?? NO_USAGE,
			current.projects.get(projectId) ?? NO_USAGE,
		);
	}

	/** Never throws. A failed refresh keeps the usage that is loaded. */
	readonly refresh = latestWins(async () => {
		const startedAt = Date.now();
		try {
			const queried = await this.load(new Date(startedAt));
			this.failuresInARow = 0;
			if (queried) {
				this.eventService.emit('execution-limit-usage-refreshed', {
					durationMs: Date.now() - startedAt,
				});
			}
		} catch (error) {
			// A database that stays down must not write a log line at every refresh.
			if (this.failuresInARow++ % FAILURES_BETWEEN_LOGS === 0) {
				this.logger.error('Failed to load execution usage', { error });
			}
			this.eventService.emit('execution-limit-usage-refresh-failed', {});
		}
	});

	/** Returns `false` when no scope has a limit, so nothing was read. */
	private async load(now: Date): Promise<boolean> {
		const limits = this.snapshot.readLimitedScopes();
		if (!limits || (!limits.hasInstanceLimit && limits.limitedProjectIds.size === 0)) {
			this.loaded = null;
			return false;
		}

		const period = periodRange(limits.periodUnit, now);
		const today = toUtcDay(now);
		const previous = this.loaded;
		// The snapshot loads the limits about each minute and makes a new object each time,
		// so the closed days are read again then. That picks up a new limit and late rows.
		const closed =
			previous?.limits === limits && previous.today === today
				? previous.closed
				: await this.loadTotals(limits, period.firstDay, addUtcDays(today, -1));
		const current = await this.loadTotals(limits, today, today);

		this.loaded = { period, today, limits, closed, current };
		return true;
	}

	// One query after the other, so a refresh holds one pool connection at a time.
	private async loadTotals(
		limits: LimitedScopes,
		firstDay: string,
		lastDay: string,
	): Promise<ScopeTotals> {
		const projects =
			limits.limitedProjectIds.size > 0
				? await this.repository.sumUsageOfLimitedProjects(firstDay, lastDay, {})
				: new Map<string, UsageTotals>();
		const instance = limits.hasInstanceLimit
			? await this.repository.sumInstanceUsage(firstDay, lastDay, {})
			: NO_USAGE;

		return { instance, projects };
	}
}
