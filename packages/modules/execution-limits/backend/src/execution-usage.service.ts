import type { ExecutionLimitPeriodUnit } from '@n8n/api-types';
import { Service } from '@n8n/di';

import { ExecutionLimitUsageRepository } from './execution-limit-usage.repository';
import { ExecutionUsageCache } from './execution-usage-cache';
import { periodRange } from './execution-usage-period';
import { toUsage, type ExecutionUsage, type UsageScope } from './execution-usage';

/** The one way to read execution usage, so the limit check and the reports show the same count. */
@Service()
export class ExecutionUsageService {
	constructor(
		private readonly cache: ExecutionUsageCache,
		private readonly repository: ExecutionLimitUsageRepository,
	) {}

	/**
	 * The usage of the current limit period. Reads memory only, so it is safe at every
	 * execution start. `null` means that this process does not know the usage: it is not
	 * loaded yet, or the scope has no limit.
	 */
	getCachedUsage(scope: UsageScope): ExecutionUsage | null {
		return this.cache.read(scope, new Date());
	}

	/** The usage of the period that contains `at`. Reads the database, so not for an execution start. */
	async getUsage(query: {
		scope: UsageScope;
		period: ExecutionLimitPeriodUnit;
		at?: Date;
	}): Promise<ExecutionUsage> {
		const { scope } = query;
		const period = periodRange(query.period, query.at ?? new Date());
		const { firstDay, lastDay } = period;

		// Each scope has its own table. A sum of the two would count each run two times.
		const totals =
			scope.type === 'instance'
				? await this.repository.sumInstanceUsage(firstDay, lastDay, {})
				: await this.repository.sumProjectUsage(scope.projectId, firstDay, lastDay, {});

		return toUsage(scope, period, totals);
	}
}
