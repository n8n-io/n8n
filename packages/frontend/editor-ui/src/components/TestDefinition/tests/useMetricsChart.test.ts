import { describe, it, expect } from 'vitest';
import { useMetricsChart } from '../composables/useMetricsChart';
import type { TestRunRecord } from '@/api/testDefinition.ee';

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
		},
	] as TestRunRecord[];

	describe('generateChartData', () => {
		it('should generate correct chart data structure', () => {
			const { generateChartData } = useMetricsChart('light');
			const result = generateChartData(mockRuns, 'responseTime');

			expect(result.labels).toHaveLength(2);
			expect(result.datasets).toHaveLength(1);
			expect(result.datasets[0].data).toEqual([100, 150]);
		});

		it('should sort runs by date', () => {
			const unsortedRuns = [
				{
					id: '1',
					testDefinitionId: 'test1',
					status: 'completed',
					createdAt: '2025-01-06T10:05:00Z',
					updatedAt: '2025-01-06T10:05:00Z',
					completedAt: '2025-01-06T10:05:00Z',
					runAt: '2025-01-06T10:05:00Z',
					metrics: { responseTime: 150 },
				},
				{
					id: '2',
					testDefinitionId: 'test1',
					status: 'completed',
					createdAt: '2025-01-06T10:00:00Z',
					updatedAt: '2025-01-06T10:00:00Z',
					completedAt: '2025-01-06T10:00:00Z',
					runAt: '2025-01-06T10:00:00Z',
					metrics: { responseTime: 100 },
				},
			] as TestRunRecord[];

			const { generateChartData } = useMetricsChart('light');
			const result = generateChartData(unsortedRuns, 'responseTime');

			expect(result.datasets[0].data).toEqual([100, 150]);
		});

		it('should filter out runs without specified metric', () => {
			const runsWithMissingMetrics = [
				{
					id: '1',
					testDefinitionId: 'test1',
					status: 'completed',
					createdAt: '2025-01-06T10:00:00Z',
					updatedAt: '2025-01-06T10:00:00Z',
					completedAt: '2025-01-06T10:00:00Z',
					runAt: '2025-01-06T10:00:00Z',
					metrics: { responseTime: 100 },
				},
				{
					id: '2',
					testDefinitionId: 'test1',
					status: 'completed',
					createdAt: '2025-01-06T10:00:00Z',
					updatedAt: '2025-01-06T10:00:00Z',
					completedAt: '2025-01-06T10:00:00Z',
					runAt: '2025-01-06T10:00:00Z',
					metrics: {},
				},
			] as TestRunRecord[];

			const { generateChartData } = useMetricsChart('light');
			const result = generateChartData(runsWithMissingMetrics, 'responseTime');

			expect(result.labels).toHaveLength(1);
			expect(result.datasets[0].data).toEqual([100]);
		});

		it('should handle dark theme colors', () => {
			const { generateChartData } = useMetricsChart('dark');
			const result = generateChartData(mockRuns, 'responseTime');

			expect(result.datasets[0].pointHoverBackgroundColor).toBe('rgb(32, 32, 32)');
		});
	});

	describe('generateChartOptions', () => {
		it('should generate correct chart options structure', () => {
			const { generateChartOptions } = useMetricsChart('light');
			const result = generateChartOptions({ metric: 'responseTime', xTitle: 'Time' });

			expect(result.scales?.y?.title?.text).toBe('responseTime');
			expect(result.scales?.x?.title?.text).toBe('Time');
			expect(result.responsive).toBe(true);
			expect(result.maintainAspectRatio).toBe(false);
		});

		it('should apply correct theme colors', () => {
			const { generateChartOptions } = useMetricsChart('dark');
			const result = generateChartOptions({ metric: 'responseTime', xTitle: 'Time' });

			expect(result.scales?.y?.ticks?.color).toBe('rgb(255, 255, 255)');
			expect(result.plugins?.tooltip?.backgroundColor).toBe('rgb(32, 32, 32)');
		});
	});
});
