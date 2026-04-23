import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { WorkflowMcpAvailabilityChanged } from '@n8n/api-types/push/workflow';

import { workflowMcpAvailabilityChanged } from './workflowMcpAvailabilityChanged';
import * as workflowsApi from '@/app/api/workflows';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { mockedStore } from '@/__tests__/utils';

const { mockWorkflowDocumentStore } = vi.hoisted(() => ({
	mockWorkflowDocumentStore: {
		allNodes: [],
		name: '',
		settings: {},
		mergeSettings: vi.fn(),
		setChecksum: vi.fn(),
		getPinDataSnapshot: vi.fn().mockReturnValue({}),
		getNodeByName: vi.fn().mockReturnValue(null),
	},
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	useWorkflowDocumentStore: vi.fn(() => mockWorkflowDocumentStore),
	createWorkflowDocumentId: (id: string) => id,
}));

const makeEvent = (
	workflowId: string,
	availableInMCP: boolean,
): WorkflowMcpAvailabilityChanged => ({
	type: 'workflowMcpAvailabilityChanged',
	data: { workflowId, availableInMCP },
});

describe('workflowMcpAvailabilityChanged', () => {
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
	let workflowsListStore: ReturnType<typeof mockedStore<typeof useWorkflowsListStore>>;

	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia({ stubActions: false }));
		workflowsStore = mockedStore(useWorkflowsStore);
		workflowsListStore = mockedStore(useWorkflowsListStore);
	});

	it('patches the list entry settings when the workflow is known', async () => {
		workflowsListStore.workflowsById = {
			'wf-1': {
				id: 'wf-1',
				name: 'wf',
				settings: { availableInMCP: false, executionOrder: 'v1' },
			},
		} as unknown as typeof workflowsListStore.workflowsById;

		await workflowMcpAvailabilityChanged(makeEvent('wf-1', true));

		expect(workflowsListStore.workflowsById['wf-1'].settings?.availableInMCP).toBe(true);
	});

	it('creates a settings object on list entries that have none', async () => {
		workflowsListStore.workflowsById = {
			'wf-1': { id: 'wf-1', name: 'wf' },
		} as unknown as typeof workflowsListStore.workflowsById;

		await workflowMcpAvailabilityChanged(makeEvent('wf-1', true));

		expect(workflowsListStore.workflowsById['wf-1'].settings?.availableInMCP).toBe(true);
	});

	it('does nothing for the document store when the workflow is not the active one', async () => {
		workflowsStore.workflow.id = 'other-workflow';
		const getWorkflowSpy = vi.spyOn(workflowsApi, 'getWorkflow');

		await workflowMcpAvailabilityChanged(makeEvent('wf-1', true));

		expect(mockWorkflowDocumentStore.mergeSettings).not.toHaveBeenCalled();
		expect(mockWorkflowDocumentStore.setChecksum).not.toHaveBeenCalled();
		expect(getWorkflowSpy).not.toHaveBeenCalled();
	});

	it('merges settings and refreshes the checksum for the active document', async () => {
		workflowsStore.workflow.id = 'wf-current';
		workflowsListStore.workflowsById = {
			'wf-current': {
				id: 'wf-current',
				name: 'wf',
				settings: { availableInMCP: false, executionOrder: 'v1' },
				checksum: 'stale-checksum',
			},
		} as unknown as typeof workflowsListStore.workflowsById;

		const getWorkflowSpy = vi.spyOn(workflowsApi, 'getWorkflow').mockResolvedValue({
			id: 'wf-current',
			checksum: 'fresh-checksum',
		} as never);

		await workflowMcpAvailabilityChanged(makeEvent('wf-current', true));

		expect(mockWorkflowDocumentStore.mergeSettings).toHaveBeenCalledWith({ availableInMCP: true });
		expect(getWorkflowSpy).toHaveBeenCalledWith({}, 'wf-current');
		expect(mockWorkflowDocumentStore.setChecksum).toHaveBeenCalledWith('fresh-checksum');
		expect(workflowsListStore.workflowsById['wf-current'].checksum).toBe('fresh-checksum');
	});

	it('still applies local settings when the checksum refresh fails', async () => {
		workflowsStore.workflow.id = 'wf-current';
		workflowsListStore.workflowsById = {
			'wf-current': {
				id: 'wf-current',
				name: 'wf',
				settings: { availableInMCP: false, executionOrder: 'v1' },
			},
		} as unknown as typeof workflowsListStore.workflowsById;
		vi.spyOn(workflowsApi, 'getWorkflow').mockRejectedValue(new Error('network'));

		await expect(
			workflowMcpAvailabilityChanged(makeEvent('wf-current', true)),
		).resolves.toBeUndefined();

		expect(mockWorkflowDocumentStore.mergeSettings).toHaveBeenCalledWith({ availableInMCP: true });
		expect(mockWorkflowDocumentStore.setChecksum).not.toHaveBeenCalled();
	});
});
