import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAgentEvalsStore } from '../agentEvals.store';
import type { AgentEvalCaseSource } from '../utils/agentEvalCases.utils';

const { updateRow, fetchDataTableById } = vi.hoisted(() => ({
	updateRow: vi.fn(),
	fetchDataTableById: vi.fn(),
}));

vi.mock('../agentEvals.api', () => ({}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({ restApiContext: { instanceId: 'test-instance-id' } })),
}));

vi.mock('@/features/core/dataTable/dataTable.store', () => ({
	useDataTableStore: vi.fn(() => ({ updateRow, fetchDataTableById })),
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
	});

	// A caller that only holds a result's snapshot must not overwrite the row's
	// current input with the one the case last ran with.
	it('writes only the rule column, never the input', async () => {
		updateRow.mockResolvedValue(true);
		const store = useAgentEvalsStore();

		await expect(store.updateCaseRule('project-1', source(), 7, 'New rule')).resolves.toBe(true);

		expect(updateRow).toHaveBeenCalledWith('dt-1', 'table-project', 7, { criteria: 'New rule' });
	});

	it('reports a failed write without touching the cached cases', async () => {
		updateRow.mockResolvedValue(false);
		const store = useAgentEvalsStore();

		await expect(store.updateCaseRule('project-1', source(), 7, 'New rule')).resolves.toBe(false);
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
		const store = useAgentEvalsStore();

		await expect(store.updateCaseRule('project-1', source(), 7, 'New rule')).rejects.toThrow(
			'offline',
		);

		expect(store.isMutatingCase('ds-1', 7)).toBe(false);
	});
});
