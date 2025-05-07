import type { InsightsByTime, InsightsSummaryType, InsightsDateRange } from '@n8n/api-types';

export type ChartProps = {
	data: InsightsByTime[];
	type: InsightsSummaryType;
	granularity: InsightsDateRange['granularity'];
};
