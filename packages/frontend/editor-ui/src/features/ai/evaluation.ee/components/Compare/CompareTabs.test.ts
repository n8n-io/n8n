import { fireEvent, waitFor } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import type { CompareCaseRow } from '../../composables/useCompareCases';
import type { CompareMetricGroup, CompareVersion } from '../../composables/useCompareData';
import CompareTabs from './CompareTabs.vue';

const versions: CompareVersion[] = [
	{
		index: 0,
		testRunId: 'run-a',
		workflowVersionId: 'v0',
		letter: 'A',
		label: 'v0',
		status: 'completed',
		avgScore: null,
	},
	{
		index: 1,
		testRunId: 'run-b',
		workflowVersionId: 'v1',
		letter: 'B',
		label: 'v1',
		status: 'completed',
		avgScore: null,
	},
];

const metricGroups: CompareMetricGroup[] = [
	{ key: 'helpfulness', label: 'Helpfulness', values: [0.7, 0.9], bestIndex: 1 },
];

const caseRows: CompareCaseRow[] = [
	{
		index: 0,
		displayIndex: 1,
		inputPreview: 'case 0',
		cells: [
			{
				versionIndex: 0,
				testCaseId: 'a',
				executionId: null,
				inputs: {},
				outputs: { output: 'x' },
				metrics: { helpfulness: 0.7 },
				score: 0.7,
			},
			{
				versionIndex: 1,
				testCaseId: 'b',
				executionId: null,
				inputs: {},
				outputs: { output: 'y' },
				metrics: { helpfulness: 0.9 },
				score: 0.9,
			},
		],
		bestVersionIndex: 1,
	},
];

const renderComponent = createComponentRenderer(CompareTabs);

describe('CompareTabs', () => {
	it('shows the Cases tab by default', () => {
		const { container } = renderComponent({
			props: { versions, metricGroups, caseRows, casesLoading: false },
		});

		expect(container.querySelector('[data-test-id="compare-cases-table"]')).not.toBeNull();
	});

	it('shows a loading message while cases load', () => {
		const { container } = renderComponent({
			props: { versions, metricGroups, caseRows: [], casesLoading: true },
		});

		expect(container.querySelector('[data-test-id="compare-cases-table"]')).toBeNull();
		expect(container.textContent).toContain('Loading cases');
	});

	it('drilling into a case row switches to the Outputs tab', async () => {
		const { container } = renderComponent({
			props: { versions, metricGroups, caseRows, casesLoading: false },
		});

		await fireEvent.click(container.querySelector('[data-test-id="compare-cases-row"]')!);
		await waitFor(() =>
			expect(container.querySelector('[data-test-id="compare-outputs-tab"]')).not.toBeNull(),
		);
	});
});
