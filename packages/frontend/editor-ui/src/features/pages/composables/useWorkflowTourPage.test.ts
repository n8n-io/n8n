import type { PageSummary } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';

import { useNodePagesStore } from '../nodePages.store';
import { useWorkflowTourPage } from './useWorkflowTourPage';

const toSummary = (id: string, updatedAt: string): PageSummary => ({
	id,
	title: id,
	projectId: 'p1',
	version: 1,
	createdAt: '2026-11-01T00:00:00.000Z',
	updatedAt,
});

const runbook = toSummary('runbook', '2026-11-02T00:00:00.000Z');
const notes = toSummary('notes', '2026-11-05T00:00:00.000Z');

describe('useWorkflowTourPage', () => {
	let nodePagesStore: ReturnType<typeof useNodePagesStore>;

	beforeEach(() => {
		createTestingPinia({ stubActions: false });
		nodePagesStore = useNodePagesStore();
		nodePagesStore.workflowId = 'w1';
	});

	it('should give no page when no page links to a node of the workflow', () => {
		expect(useWorkflowTourPage('w1').value).toBeUndefined();
	});

	it('should pick the page that links to the most nodes', () => {
		nodePagesStore.pagesByNodeId = { a: [runbook, notes], b: [runbook] };

		expect(useWorkflowTourPage('w1').value?.id).toBe('runbook');
	});

	it('should pick the newest page among pages with the same number of nodes', () => {
		nodePagesStore.pagesByNodeId = { a: [runbook, notes] };

		expect(useWorkflowTourPage('w1').value?.id).toBe('notes');
	});

	it('should give no page while the store holds another workflow', () => {
		nodePagesStore.pagesByNodeId = { a: [runbook] };

		expect(useWorkflowTourPage('w2').value).toBeUndefined();
	});
});
