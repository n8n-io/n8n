import { defineStore } from 'pinia';

export type Summary = {
	id: string;
	title: string;
	count: number;
	sign?: string;
	deviation: number;
	evaluation?: 'positive' | 'negative';
};

export const useInsightsStore = defineStore('insights', () => {
	const fetchSummary = async (): Promise<Summary[]> => {
		return [
			{
				id: 'executions',
				title: 'Executions',
				count: 525,
				deviation: 85,
				sign: undefined,
				evaluation: 'positive' as const,
			},
			{
				id: 'failed',
				title: 'Failed executions',
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
				id: 'runTime',
				title: 'Avg. run time',
				count: 2.5,
				deviation: -5,
				sign: 's',
				evaluation: 'positive' as const,
			},
			{
				id: 'timeSaved',
				title: 'Time saved',
				count: 54,
				deviation: -5,
				sign: 'h',
				evaluation: 'negative' as const,
			},
		];
	};

	return {
		fetchSummary,
	};
});
