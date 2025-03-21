import { GlobalConfig } from '@n8n/config';
import { Container, Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';
import { z } from 'zod';

import { sql } from '@/utils/sql';

import { InsightsByPeriod } from '../entities/insights-by-period';
const dbType = Container.get(GlobalConfig).database.type;

const summaryParser = z
	.object({
		period: z.enum(['previous', 'current']),
		type: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),

		// depending on db engine, sum(value) can be a number or a string - because of big numbers
		total_value: z.union([z.number(), z.string()]),
	})
	.array();

@Service()
export class InsightsByPeriodRepository extends Repository<InsightsByPeriod> {
	constructor(dataSource: DataSource) {
		super(InsightsByPeriod, dataSource.manager);
	}

	async getPreviousAndCurrentPeriodTypeAggregates() {
		const cte =
			dbType === 'sqlite'
				? sql`
						SELECT
							datetime('now', '-7 days') AS current_start,
							datetime('now') AS current_end,
							datetime('now', '-14 days') AS previous_start
					`
				: dbType === 'postgresdb'
					? sql`
								SELECT
								(CURRENT_DATE - INTERVAL '7 days')::timestamptz AS current_start,
								CURRENT_DATE::timestamptz AS current_end,
								(CURRENT_DATE - INTERVAL '14 days')::timestamptz AS previous_start
							`
					: sql`
								SELECT
									DATE_SUB(CURDATE(), INTERVAL 7 DAY) AS current_start,
									CURDATE() AS current_end,
									DATE_SUB(CURDATE(), INTERVAL 14 DAY) AS previous_start
							`;

		const rawRows = await this.createQueryBuilder('insights')
			.addCommonTableExpression(cte, 'date_ranges')
			.select(
				sql`
						CASE
							WHEN insights.periodStart >= date_ranges.current_start AND insights.periodStart <= date_ranges.current_end
							THEN 'current'
							ELSE 'previous'
						END
					`,
				'period',
			)
			.addSelect('insights.type', 'type')
			.addSelect('SUM(value)', 'total_value')
			// Use a cross join with the CTE
			.innerJoin('date_ranges', 'date_ranges', '1=1')
			// Filter to only include data from the last 14 days
			.where('insights.periodStart >= date_ranges.previous_start')
			.andWhere('insights.periodStart <= date_ranges.current_end')
			// Group by both period and type
			.groupBy('period')
			.addGroupBy('insights.type')
			.getRawMany();

		return summaryParser.parse(rawRows);
	}
}
