import type { INSIGHTS_UNIT_MAPPING } from '@/features/insights/insights.constants';

type InsightsDisplayUnits = typeof INSIGHTS_UNIT_MAPPING;

export type InsightsSummaryDisplay = Array<
	{
		[K in keyof InsightsDisplayUnits]: {
			id: K;
			value: number;
			deviation: number | null;
			unit: InsightsDisplayUnits[K];
		};
	}[keyof InsightsDisplayUnits]
>;
