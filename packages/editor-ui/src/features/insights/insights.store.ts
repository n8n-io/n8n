import { defineStore } from 'pinia';

import { useRootStore } from '@/stores/root.store';

import {
	getDatesArrayFromToday,
	getRandomIntBetween,
	randomCumulativeData,
	randomDataPoint,
} from './views/chartjs.utils';

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

/**
 * just for demo purposes
 */

const randomDelay = async () =>
	await new Promise((res) => setTimeout(res, Math.random() * (3000 - 1000) + 1000));

export const useInsightsStore = defineStore('insights', () => {
	const rootStore = useRootStore();

	const fetchSummary = async (): Promise<Summary[]> => {
		await randomDelay();
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
				sign: 'H',
				evaluation: 'negative' as const,
			},
			{
				id: 'runTime',
				title: 'Run time (average)',
				count: 2.5,
				deviation: -5,
				sign: 's',
				evaluation: 'positive' as const,
			},
		];
	};

	const fetchCounts = async ({ time_span }: { time_span: number }): Promise<CountResponse> => {
		await randomDelay();
		const dates = getDatesArrayFromToday(Number(time_span));
		const response = {
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
		return response;
	};

	const fetchInsights = async () => {
		await randomDelay();
	};

	return {
		fetchSummary,
		fetchCounts,
		fetchInsights,
	};
});
