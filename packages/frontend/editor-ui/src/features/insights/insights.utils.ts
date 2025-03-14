import type { InsightsSummary } from '@n8n/api-types';
import type { InsightsSummaryDisplay } from '@/features/insights/insights.types';
import {
	INSIGHTS_SUMMARY_ORDER,
	INSIGHTS_UNIT_MAPPING,
} from '@/features/insights/insights.constants';

export const transformInsightsSummary = (data: InsightsSummary | null): InsightsSummaryDisplay =>
	data
		? INSIGHTS_SUMMARY_ORDER.map((key) => ({
				id: key,
				value: key === 'timeSaved' ? data[key].value / 3600 : data[key].value, // we want to show saved time in hours
				deviation: data[key].deviation,
				unit: INSIGHTS_UNIT_MAPPING[key],
			}))
		: [];
