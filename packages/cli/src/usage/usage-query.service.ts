import { UsageRepository, type UsagePhase } from '@n8n/db';
import { Service } from '@n8n/di';

import { USAGE_UNITS, type UsageUnit } from './usage-units';

/** Reads usage totals. Every reader applies units here, so they cannot disagree. */
@Service()
export class UsageQueryService {
	constructor(private readonly usageRepository: UsageRepository) {}

	/**
	 * Total of one unit for one project over `[from, to)`, on UTC-day boundaries. The phase
	 * picks the clock; only `finished` facts are written today.
	 */
	async total(
		projectId: string,
		unit: UsageUnit,
		from: Date,
		to: Date,
		phase: UsagePhase = 'finished',
	): Promise<number> {
		const { total } = await this.usageRepository.sumUsage(
			projectId,
			from,
			to,
			USAGE_UNITS[unit],
			phase,
		);
		return total;
	}
}
