import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { IWorkflowSettings } from 'n8n-workflow';
import type { WorkflowSettingsUpdated } from '@n8n/api-types/push/workflow';

import { workflowSettingsUpdated } from './workflowSettingsUpdated';
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

vi.mock('@/app/stores/workflowDocument.store', () => ({
	useWorkflowDocumentStore: vi.fn(() => mockWorkflowDocumentStore),
	createWorkflowDocumentId: (id: string) => id,
}));

const makeEvent = (
	workflowId: string,
	settings: Partial<IWorkflowSettings>,
	checksum?: string,
): WorkflowSettingsUpdated => ({
	type: 'workflowSettingsUpdated',
	data: { workflowId, settings, ...(checksum !== undefined ? { checksum } : {}) },
});

describe('workflowSettingsUpdated', () => {
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
	let workflowsListStore: ReturnType<typeof mockedStore<typeof useWorkflowsListStore>>;

	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia({ stubActions: false }));
		workflowsStore = mockedStore(useWorkflowsStore);
		workflowsListStore = mockedStore(useWorkflowsListStore);
	});

	it('merges partial settings into an existing list entry', async () => {
		workflowsListStore.workflowsById = {
			'wf-1': {
				id: 'wf-1',
				name: 'wf',
				settings: { availableInMCP: false, executionOrder: 'v1' },
			},
		} as unknown as typeof workflowsListStore.workflowsById;

		await workflowSettingsUpdated(makeEvent('wf-1', { availableInMCP: true }));

		expect(workflowsListStore.workflowsById['wf-1'].settings).toEqual({
			availableInMCP: true,
			executionOrder: 'v1',
		});
	});

	it('creates a settings object on list entries that have none', async () => {
		workflowsListStore.workflowsById = {
			'wf-1': { id: 'wf-1', name: 'wf' },
		} as unknown as typeof workflowsListStore.workflowsById;

		await workflowSettingsUpdated(makeEvent('wf-1', { availableInMCP: true }));

		expect(workflowsListStore.workflowsById['wf-1'].settings).toEqual({
			availableInMCP: true,
		});
	});

	it('does nothing for the document store when the workflow is not the active one', async () => {
		workflowsStore.workflow.id = 'other-workflow';

		await workflowSettingsUpdated(makeEvent('wf-1', { availableInMCP: true }));

		expect(mockWorkflowDocumentStore.mergeSettings).not.toHaveBeenCalled();
		expect(mockWorkflowDocumentStore.setChecksum).not.toHaveBeenCalled();
	});

	it('merges settings and uses payload checksum for the active document', async () => {
		workflowsStore.workflow.id = 'wf-current';
		workflowsListStore.workflowsById = {
			'wf-current': {
				id: 'wf-current',
				name: 'wf',
				settings: { availableInMCP: false, executionOrder: 'v1' },
				checksum: 'stale-checksum',
			},
		} as unknown as typeof workflowsListStore.workflowsById;

		await workflowSettingsUpdated(
			makeEvent('wf-current', { availableInMCP: true }, 'fresh-checksum'),
		);

		expect(mockWorkflowDocumentStore.mergeSettings).toHaveBeenCalledWith({ availableInMCP: true });
		expect(mockWorkflowDocumentStore.setChecksum).toHaveBeenCalledWith('fresh-checksum');
		expect(workflowsListStore.workflowsById['wf-current'].checksum).toBe('fresh-checksum');
	});

	it('applies settings but skips checksum refresh when none is provided', async () => {
		workflowsStore.workflow.id = 'wf-current';
		workflowsListStore.workflowsById = {
			'wf-current': {
				id: 'wf-current',
				name: 'wf',
				settings: { availableInMCP: false, executionOrder: 'v1' },
				checksum: 'stale-checksum',
			},
		} as unknown as typeof workflowsListStore.workflowsById;

		await workflowSettingsUpdated(makeEvent('wf-current', { availableInMCP: true }));

		expect(mockWorkflowDocumentStore.mergeSettings).toHaveBeenCalledWith({ availableInMCP: true });
		expect(mockWorkflowDocumentStore.setChecksum).not.toHaveBeenCalled();
		expect(workflowsListStore.workflowsById['wf-current'].checksum).toBe('stale-checksum');
	});

	it('merges multiple settings keys in one event', async () => {
		workflowsStore.workflow.id = 'wf-current';
		workflowsListStore.workflowsById = {
			'wf-current': {
				id: 'wf-current',
				name: 'wf',
				settings: { executionOrder: 'v0' },
			},
		} as unknown as typeof workflowsListStore.workflowsById;

		await workflowSettingsUpdated(
			makeEvent('wf-current', { availableInMCP: true, timezone: 'UTC' }),
		);

		expect(mockWorkflowDocumentStore.mergeSettings).toHaveBeenCalledWith({
			availableInMCP: true,
			timezone: 'UTC',
		});
		expect(workflowsListStore.workflowsById['wf-current'].settings).toEqual({
			executionOrder: 'v0',
			availableInMCP: true,
			timezone: 'UTC',
		});
	});
});
