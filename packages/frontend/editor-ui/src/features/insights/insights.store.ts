import { defineStore } from 'pinia';
import { useAsyncState } from '@vueuse/core';
import * as insightsApi from '@/features/insights/insights.api';
import { useRootStore } from '@/stores/root.store';
import { transformInsightsSummary } from '@/features/insights/insights.utils';

import {
	getDatesArrayFromToday,
	getRandomIntBetween,
	randomCumulativeData,
	randomDataPoint,
} from '@/features/insights/chartjs.utils';

export type Count = { date: string; count: number };

export type CountResponse = {
	total: {
		failure: Count[];
		success: Count[];
	};
	failed: Count[];
	failureRate: Count[];
	timeSaved: {
		average: Count[];
		median: Count[];
	};
	runTime: Count[];
};

export const useInsightsStore = defineStore('insights', () => {
	const rootStore = useRootStore();

	const summary = useAsyncState(async () => {
		const raw = await insightsApi.fetchInsightsSummary(rootStore.restApiContext);
		return transformInsightsSummary(raw);
	}, []);

	const fetchCounts = async ({ time_span }: { time_span: number }): Promise<CountResponse> => {
		const dates = getDatesArrayFromToday(Number(time_span));
		return {
			total: {
				failure: dates.map((date) => ({
					date,
					count: randomDataPoint(400),
				})),
				success: dates.map((date) => ({
					date,
					count: randomDataPoint(400),
				})),
			},
			failed: dates.map((date) => ({
				date,
				count: randomDataPoint(400),
			})),
			failureRate: dates.map((date) => ({
				date,
				count: randomDataPoint(400),
			})),
			timeSaved: {
				average: randomCumulativeData(dates, 3),
				median: randomCumulativeData(dates, 4),
			},
			runTime: dates.map((date) => ({ date, count: getRandomIntBetween(0.5, 4) })),
		};
	};

	return {
		summary,
		fetchCounts,
	};
});
