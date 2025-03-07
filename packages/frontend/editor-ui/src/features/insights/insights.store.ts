import { defineStore } from 'pinia';
import {
	getDatesArrayFromToday,
	getRandomIntBetween,
	randomCumulativeData,
	randomDataPoint,
} from '@/features/insights/chartjs.utils';

export type Summary = {
	id: string;
	title: string;
	count: number;
	sign?: string;
	deviation: number;
	evaluation?: 'positive' | 'negative';
};

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
	const fetchSummary = async (): Promise<Summary[]> => {
		return [
			{
				id: 'total',
				title: 'Total',
				count: 525,
				deviation: 85,
				sign: undefined,
				evaluation: 'positive' as const,
			},
			{
				id: 'failed',
				title: 'Failed',
				count: 14,
				deviation: 3,
				sign: undefined,
				evaluation: 'negative' as const,
			},
			{
				id: 'failureRate',
				title: 'Failure rate',
				count: 1.9,
				deviation: -5,
				sign: '%',
				evaluation: 'negative' as const,
			},
			{
				id: 'timeSaved',
				title: 'Time saved',
				count: 54,
				deviation: -5,
				sign: 'h',
				evaluation: 'negative' as const,
			},
			{
				id: 'runTime',
				title: 'Avg. run time',
				count: 2.5,
				deviation: -5,
				sign: 's',
				evaluation: 'positive' as const,
			},
		];
	};

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
		fetchSummary,
		fetchCounts,
	};
});
