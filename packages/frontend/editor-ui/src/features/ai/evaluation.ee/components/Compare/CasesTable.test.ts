import { fireEvent } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import type { CompareCaseCell, CompareCaseRow } from '../../composables/useCompareCases';
import type { CompareVersion } from '../../composables/useCompareData';
import CasesTable from './CasesTable.vue';

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

// A null score with no `testCaseId` represents a case this version's run never
// covered (dataset drift → `⊘`); a null score with a `testCaseId` is a case
// still running (→ `–`).
const cell = (versionIndex: number, score: number | null): CompareCaseCell => ({
	versionIndex,
	testCaseId: score === null ? null : `c${versionIndex}`,
	executionId: null,
	inputs: { q: 'x' },
	outputs: { output: 'y' },
	metrics: score === null ? undefined : { helpfulness: score },
	score,
});

const row = (index: number, scores: Array<number | null>, best: number | null): CompareCaseRow => ({
	index,
	displayIndex: index + 1,
	inputPreview: `case ${index}`,
	cells: scores.map((s, i) => cell(i, s)),
	bestVersionIndex: best,
});

const renderComponent = createComponentRenderer(CasesTable);

describe('CasesTable', () => {
	it('renders one row per case with the best-version pill', () => {
		const { container } = renderComponent({
			props: { versions, caseRows: [row(0, [0.7, 0.9], 1), row(1, [0.6, 0.5], 0)] },
		});

		expect(container.querySelectorAll('[data-test-id="compare-cases-row"]')).toHaveLength(2);
		// best pills render the winning version's letter
		expect(container.textContent).toContain('B ★');
		expect(container.textContent).toContain('A ★');
	});

	it('sorts by score spread descending by default (biggest regression first)', () => {
		const { container } = renderComponent({
			props: {
				versions,
				// row 0 spread 0.05, row 1 spread 0.4 → row 1 should come first
				caseRows: [row(0, [0.9, 0.85], 0), row(1, [0.9, 0.5], 0)],
			},
		});

		const rows = container.querySelectorAll('[data-test-id="compare-cases-row"]');
		// first rendered row is the bigger-spread case (#2)
		expect(rows[0].textContent).toContain('2');
	});

	it('exposes sortable headers to the keyboard (tabindex, aria-sort, Enter)', async () => {
		const { container } = renderComponent({
			props: { versions, caseRows: [row(0, [0.9, 0.85], 0), row(1, [0.9, 0.5], 0)] },
		});

		const sortableHeaders = [...container.querySelectorAll('th[role="button"]')];
		expect(sortableHeaders.length).toBeGreaterThan(0);
		for (const th of sortableHeaders) {
			expect(th.getAttribute('tabindex')).toBe('0');
			expect(th.getAttribute('aria-sort')).not.toBeNull();
		}

		// The first sortable header ("#") is inactive by default; Enter sorts by it.
		const indexHeader = sortableHeaders[0];
		expect(indexHeader.getAttribute('aria-sort')).toBe('none');
		await fireEvent.keyDown(indexHeader, { key: 'Enter' });
		expect(indexHeader.getAttribute('aria-sort')).toBe('ascending');
	});

	it('emits drilldown with the case index when a row is clicked', async () => {
		const { container, emitted } = renderComponent({
			props: { versions, caseRows: [row(3, [0.7, 0.9], 1)] },
		});

		await fireEvent.click(container.querySelector('[data-test-id="compare-cases-row"]')!);
		expect(emitted().drilldown).toEqual([[3]]);
	});

	it('renders a missing-case marker (⊘) for a case absent from a version', () => {
		const { container } = renderComponent({
			props: { versions, caseRows: [row(0, [0.7, null], 0)] },
		});

		expect(container.textContent).toContain('⊘');
	});

	it('renders a pending marker (–) for a scored-yet case that still exists', () => {
		const pendingCell: CompareCaseCell = {
			versionIndex: 1,
			testCaseId: 'c1',
			executionId: null,
			inputs: {},
			outputs: undefined,
			metrics: undefined,
			score: null,
		};
		const { container } = renderComponent({
			props: {
				versions,
				caseRows: [
					{
						index: 0,
						displayIndex: 1,
						inputPreview: 'case 0',
						cells: [cell(0, 0.7), pendingCell],
						bestVersionIndex: 0,
					},
				],
			},
		});

		expect(container.textContent).toContain('–');
		expect(container.textContent).not.toContain('⊘');
	});
});
