import { getMetricDatasetColumns, getMetricsByIds } from '../metric-catalog';

describe('metric-catalog', () => {
	describe('getMetricsByIds', () => {
		it('keeps only known metric ids in caller-provided order', () => {
			expect(
				getMetricsByIds(['tool_use', 'nope', 'correctness']).map((metric) => metric.id),
			).toEqual(['tool_use', 'correctness']);
		});
	});

	describe('getMetricDatasetColumns', () => {
		it('returns only columns required by the selected metrics', () => {
			expect(getMetricDatasetColumns(getMetricsByIds(['tool_use']))).toEqual(['expected_tools']);
			expect(getMetricDatasetColumns(getMetricsByIds(['correctness']))).toEqual([
				'expected_output',
			]);
		});
	});
});
