import { createPinia, setActivePinia } from 'pinia';
import { deepCopy } from 'n8n-workflow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAgentEvalsStore } from '../agentEvals.store';
import type { AgentEvalCaseSource } from '../utils/agentEvalCases.utils';

const { updateRow, fetchDataTableById, fetchDataTableContent } = vi.hoisted(() => ({
	updateRow: vi.fn(),
	fetchDataTableById: vi.fn(),
	fetchDataTableContent: vi.fn(),
}));

vi.mock('../agentEvals.api', () => ({}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({ restApiContext: { instanceId: 'test-instance-id' } })),
}));

vi.mock('@/features/core/dataTable/dataTable.store', () => ({
	useDataTableStore: vi.fn(() => ({ updateRow, fetchDataTableById, fetchDataTableContent })),
}));

const source = (whatToCheck: string | null = 'criteria'): AgentEvalCaseSource => ({
	datasetId: 'ds-1',
	dataTableId: 'dt-1',
	columns: { input: 'question', whatToCheck },
});

describe('useAgentEvalsStore › updateCaseRule', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		fetchDataTableById.mockResolvedValue({ projectId: 'table-project' });
		fetchDataTableContent.mockResolvedValue({
			count: 1,
			data: [{ id: 7, question: 'Where is my order?', criteria: 'Old rule' }],
		});
	});

	/** A store whose cache already holds the check, so a write can be seen to change it or not. */
	const seededStore = async () => {
		const store = useAgentEvalsStore();
		await store.fetchCases('project-1', source());
		return store;
	};

	// A caller that only holds a result's snapshot must not overwrite the row's
	// current input with the one the case last ran with.
	it('writes only the rule column, never the input', async () => {
		updateRow.mockResolvedValue(true);
		const store = useAgentEvalsStore();

		await expect(store.updateCaseRule('project-1', source(), 7, 'New rule')).resolves.toBe(true);

		expect(updateRow).toHaveBeenCalledWith('dt-1', 'table-project', 7, { criteria: 'New rule' });
	});

	it('updates the cached rule once the write succeeds', async () => {
		updateRow.mockResolvedValue(true);
		const store = await seededStore();

		await store.updateCaseRule('project-1', source(), 7, 'New rule');

		expect(store.getCases('ds-1')).toEqual([
			expect.objectContaining({ rowId: 7, input: 'Where is my order?', whatToCheck: 'New rule' }),
		]);
	});

	it('reports a failed write, and leaves the cached case as it was', async () => {
		updateRow.mockResolvedValue(false);
		const store = await seededStore();
		const before = deepCopy(store.getCases('ds-1'));

		await expect(store.updateCaseRule('project-1', source(), 7, 'New rule')).resolves.toBe(false);

		expect(before).toHaveLength(1);
		expect(store.getCases('ds-1')).toEqual(before);
		expect(store.getCases('ds-1')[0].whatToCheck).toBe('Old rule');
	});

	it('does nothing when the table has no column to store a rule in', async () => {
		const store = useAgentEvalsStore();

		await expect(store.updateCaseRule('project-1', source(null), 7, 'New rule')).resolves.toBe(
			false,
		);

		expect(updateRow).not.toHaveBeenCalled();
	});

	it('lets a request failure reach the caller, and clears its busy flag', async () => {
		updateRow.mockRejectedValue(new Error('offline'));
		const store = await seededStore();

		await expect(store.updateCaseRule('project-1', source(), 7, 'New rule')).rejects.toThrow(
			'offline',
		);

		expect(store.isMutatingCase('ds-1', 7)).toBe(false);
		expect(store.getCases('ds-1')[0].whatToCheck).toBe('Old rule');
	});
});
