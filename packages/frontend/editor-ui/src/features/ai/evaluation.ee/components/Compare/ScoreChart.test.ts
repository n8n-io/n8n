import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import type { CompareMetricGroup, CompareVersion } from '../../composables/useCompareData';
import ScoreChart from './ScoreChart.vue';

const versions: CompareVersion[] = [
	{
		index: 0,
		testRunId: 'run-a',
		workflowVersionId: 'v1',
		letter: 'A',
		label: 'v1',
		status: 'completed',
		avgScore: 0.7,
	},
	{
		index: 1,
		testRunId: 'run-b',
		workflowVersionId: 'v2',
		letter: 'B',
		label: 'v2',
		status: 'completed',
		avgScore: 0.9,
	},
];

const metricGroups: CompareMetricGroup[] = [
	{ key: 'helpfulness', label: 'Helpfulness', values: [0.7, 0.9], bestIndex: 1 },
	{ key: 'correctness', label: 'Correctness', values: [0.5, 0.55], bestIndex: 1 },
];

const renderComponent = createComponentRenderer(ScoreChart);

describe('ScoreChart', () => {
	it('renders one panel per metric group with its label', () => {
		const { container } = renderComponent({ props: { metricGroups, versions } });
		const panels = container.querySelectorAll('[data-test-id="compare-score-chart-panel"]');

		expect(panels).toHaveLength(2);
		expect(container.textContent).toContain('Helpfulness');
		expect(container.textContent).toContain('Correctness');
	});

	it('shows an empty state when there are no score-shaped metrics', () => {
		const { container } = renderComponent({ props: { metricGroups: [], versions } });

		expect(container.querySelectorAll('[data-test-id="compare-score-chart-panel"]')).toHaveLength(
			0,
		);
		expect(container.textContent).toContain('No score-shaped metrics to chart yet.');
	});

	it('offers the Average/Per case toggle', () => {
		const { container } = renderComponent({ props: { metricGroups, versions } });

		expect(container.querySelector('[role="radiogroup"]')).not.toBeNull();
		expect(container.textContent).toContain('Average');
		expect(container.textContent).toContain('Per case');
	});
});
