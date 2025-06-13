import type {
	INSIGHTS_UNIT_MAPPING,
	INSIGHTS_DEVIATION_UNIT_MAPPING,
} from '@/features/insights/insights.constants';

type InsightsDisplayUnits = typeof INSIGHTS_UNIT_MAPPING;
type InsightsDisplayDeviationUnits = typeof INSIGHTS_DEVIATION_UNIT_MAPPING;

export type InsightsSummaryDisplay = Array<
	{
		[K in keyof InsightsDisplayUnits]: {
			id: K;
			value: number;
			deviation: number | null;
			deviationUnit: ReturnType<InsightsDisplayDeviationUnits[K]>;
			unit: ReturnType<InsightsDisplayUnits[K]>;
		};
	}[keyof InsightsDisplayUnits]
>;
