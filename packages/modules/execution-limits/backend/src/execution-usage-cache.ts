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
} from './execution-usage.types';

/** One fold cycle of the execution ledger. */
export const USAGE_REFRESH_INTERVAL_MS = 5 * Time.seconds.toMilliseconds;

const FAILURES_BETWEEN_LOGS = 12;

/** The totals of the scopes that have a limit. `instance` is `null` with no instance limit. */
type ScopeTotals = {
	instance: UsageTotals | null;
	projects: ReadonlyMap<string, UsageTotals>;
};

type Loaded = {
	period: UsagePeriod;
	today: string;
	limitsGeneration: number;
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
	 * `null` means the usage is not known: nothing is loaded, the scope has no limit, or
	 * the loaded period is over or has another unit than the limits.
	 */
	read(scope: UsageScope, now: Date): ExecutionUsage | null {
		const { loaded } = this;
		const limits = this.snapshot.readLimitedScopes();
		if (!loaded || !limits) return null;
		if (loaded.period.unit !== limits.periodUnit || now >= loaded.period.resetsAt) return null;

		const { period, closed, current } = loaded;
		if (scope.type === 'instance') {
			if (!limits.hasInstanceLimit || !closed.instance || !current.instance) return null;
			return toUsage(scope, period, closed.instance, current.instance);
		}

		const { projectId } = scope;
		if ((this.snapshot.read(projectId)?.projectMaxExecutions ?? null) === null) return null;

		const closedTotals = closed.projects.get(projectId);
		const currentTotals = current.projects.get(projectId);
		// A limit newer than the load: no row can mean no usage, or usage that is not loaded.
		const loadedForTheseLimits = loaded.limitsGeneration === limits.generation;
		if (!closedTotals && !currentTotals && !loadedForTheseLimits) return null;

		return toUsage(scope, period, closedTotals ?? NO_USAGE, currentTotals ?? NO_USAGE);
	}

	/** Never throws. A failed refresh keeps the usage that is loaded. */
	async refresh(): Promise<void> {
		await this.refreshLatest();
	}

	private readonly refreshLatest = latestWins(async () => {
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
		if (!limits || (!limits.hasInstanceLimit && !limits.hasProjectLimits)) {
			this.loaded = null;
			return false;
		}

		const period = periodRange(limits.periodUnit, now);
		const today = toUtcDay(now);
		const previous = this.loaded;
		const closedIsLoaded =
			previous !== null &&
			previous.period.unit === period.unit &&
			previous.today === today &&
			previous.limitsGeneration === limits.generation;

		const closed = closedIsLoaded
			? previous.closed
			: await this.loadTotals(limits, period.firstDay, addUtcDays(today, -1));
		const current = await this.loadTotals(limits, today, today);

		this.loaded = { period, today, limitsGeneration: limits.generation, closed, current };
		return true;
	}

	// One query after the other, so a refresh holds one pool connection at a time.
	private async loadTotals(
		limits: LimitedScopes,
		firstDay: string,
		lastDay: string,
	): Promise<ScopeTotals> {
		const projects = limits.hasProjectLimits
			? await this.repository.sumUsageOfLimitedProjects(firstDay, lastDay, {})
			: new Map<string, UsageTotals>();
		const instance = limits.hasInstanceLimit
			? await this.repository.sumInstanceUsage(firstDay, lastDay, {})
			: null;

		return { instance, projects };
	}
}
