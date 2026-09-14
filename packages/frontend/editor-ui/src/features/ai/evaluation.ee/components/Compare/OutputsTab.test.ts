import { fireEvent } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import type { CompareCaseCell, CompareCaseRow } from '../../composables/useCompareCases';
import type { CompareVersion } from '../../composables/useCompareData';
import OutputsTab from './OutputsTab.vue';

const versions: CompareVersion[] = [
	{
		index: 0,
		testRunId: 'run-a',
		workflowVersionId: 'v0',
		letter: 'A',
		label: 'Baseline',
		status: 'completed',
		avgScore: null,
	},
	{
		index: 1,
		testRunId: 'run-b',
		workflowVersionId: 'v1',
		letter: 'B',
		label: 'Candidate',
		status: 'completed',
		avgScore: null,
	},
];

const cell = (versionIndex: number, output: string): CompareCaseCell => ({
	versionIndex,
	testCaseId: `c${versionIndex}`,
	executionId: null,
	inputs: { q: 'What is 2+2?' },
	outputs: { output },
	metrics: { helpfulness: 0.8 },
	score: 0.8,
});

const rows: CompareCaseRow[] = [
	{
		index: 0,
		displayIndex: 1,
		inputPreview: 'What is 2+2?',
		cells: [cell(0, 'four'), cell(1, 'the answer is four')],
		bestVersionIndex: 1,
	},
	{
		index: 1,
		displayIndex: 2,
		inputPreview: 'Capital of France?',
		cells: [cell(0, 'Paris'), cell(1, 'Paris, France')],
		bestVersionIndex: 1,
	},
];

const renderComponent = createComponentRenderer(OutputsTab);

describe('OutputsTab', () => {
	it('renders one output column per version for the selected case', () => {
		const { container } = renderComponent({
			props: { versions, caseRows: rows, selectedIndex: 0, workflowId: 'wf-1' },
		});

		expect(container.querySelectorAll('[data-test-id="compare-outputs-column"]')).toHaveLength(2);
		expect(container.textContent).toContain('four');
		expect(container.textContent).toContain('the answer is four');
	});

	it('emits the new index when a sidebar case is clicked', async () => {
		const { container, emitted } = renderComponent({
			props: { versions, caseRows: rows, selectedIndex: 0, workflowId: 'wf-1' },
		});

		const items = container.querySelectorAll('[data-test-id="compare-outputs-case"]');
		await fireEvent.click(items[1]);
		expect(emitted()['update:selectedIndex']).toEqual([[1]]);
	});
});
