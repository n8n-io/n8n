import { describe, it, expect } from 'vitest';
import { useMetricsChart } from '../composables/useMetricsChart';
import type { TestRunRecord as Record } from '@/api/testDefinition.ee';

type TestRunRecord = Record & { index: number };
describe('useMetricsChart', () => {
	const mockRuns: TestRunRecord[] = [
		{
			id: '1',
			testDefinitionId: 'test1',
			status: 'completed',
			createdAt: '2025-01-06T10:00:00Z',
			updatedAt: '2025-01-06T10:00:00Z',
			completedAt: '2025-01-06T10:00:00Z',
			runAt: '2025-01-06T10:00:00Z',
			metrics: { responseTime: 100, successRate: 95 },
			index: 1,
		},
		{
			id: '2',
			testDefinitionId: 'test1',
			status: 'completed',
			createdAt: '2025-01-06T10:00:00Z',
			updatedAt: '2025-01-06T10:00:00Z',
			completedAt: '2025-01-06T10:00:00Z',
			runAt: '2025-01-06T10:00:00Z',
			metrics: { responseTime: 150, successRate: 98 },
			index: 2,
		},
	] as TestRunRecord[];

	describe('generateChartData', () => {
		it('should generate correct chart data structure', () => {
			const { generateChartData } = useMetricsChart();
			const {
				datasets: [dataset],
			} = generateChartData(mockRuns, 'responseTime');

			//@ts-expect-error vue-chartjs types are wrong
			expect(dataset.parsing?.yAxisKey).toBe('metrics.responseTime');
			expect(dataset.data).toHaveLength(2);
		});
	});

	describe('generateChartOptions', () => {
		it('should generate correct chart options structure', () => {
			const { generateChartOptions } = useMetricsChart();
			const result = generateChartOptions({ metric: 'responseTime', data: mockRuns });

			//@ts-expect-error vue-chartjs types are wrong
			expect(result.scales?.x?.ticks?.callback?.(undefined, 0, [])).toBe('#1');
			expect(result.responsive).toBe(true);
			expect(result.maintainAspectRatio).toBe(false);
		});
	});
});
