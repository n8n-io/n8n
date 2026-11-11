import { waitFor } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import type { TestRunRecord } from '../../evaluation.api';
import type { TestTableColumn } from '../shared/TestTableBase.vue';
import TestRunsTable from './TestRunsTable.vue';

type TestRunRow = TestRunRecord & { index: number };

const runs: TestRunRow[] = [
	{
		id: 'run-1',
		workflowId: 'workflow-id',
		status: 'completed',
		metrics: { accuracy: 0.9 },
		createdAt: '2026-09-29T09:00:00.000Z',
		updatedAt: '2026-09-29T09:01:00.000Z',
		runAt: '2026-09-29T09:00:00.000Z',
		completedAt: '2026-09-29T09:01:00.000Z',
		index: 1,
	},
];

const columns: Array<TestTableColumn<TestRunRow>> = [
	{ prop: 'id', label: 'Run' },
	{ prop: 'status', label: 'Status' },
];

const renderComponent = createComponentRenderer(TestRunsTable);

describe('TestRunsTable', () => {
	it('renders one table row for each test run', async () => {
		const { container, getByText, unmount } = renderComponent({
			props: { runs, columns },
		});

		try {
			expect(getByText('All runs (1)')).toBeInTheDocument();
			await waitFor(() => {
				expect(container.querySelectorAll('tbody .el-table__row')).toHaveLength(1);
			});
		} finally {
			unmount();
			// Element Plus debounces table layout for 50 ms. Drain the callback
			// before Vitest removes the jsdom animation frame globals.
			await new Promise((resolve) => setTimeout(resolve, 60));
		}
	});
});
