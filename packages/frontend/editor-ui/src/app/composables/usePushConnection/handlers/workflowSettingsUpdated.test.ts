import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mock } from 'vitest-mock-extended';
import type { Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { IWorkflowSettings } from 'n8n-workflow';
import type { WorkflowSettingsUpdated } from '@n8n/api-types/push/workflow';

import { workflowSettingsUpdated } from './workflowSettingsUpdated';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { mockedStore } from '@/__tests__/utils';
import type { PushHandlerOptions } from './types';

const { mockWorkflowDocumentStore } = vi.hoisted(() => ({
	mockWorkflowDocumentStore: {
		workflowId: '',
		allNodes: [],
		name: '',
		settings: {},
		workflowTriggerNodes: [],
		mergeSettings: vi.fn(),
		setChecksum: vi.fn(),
		getPinDataSnapshot: vi.fn().mockReturnValue({}),
		getNodeByName: vi.fn().mockReturnValue(null),
	},
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	useWorkflowDocumentStore: vi.fn(() => mockWorkflowDocumentStore),
	createWorkflowDocumentId: (id: string) => id,
	injectWorkflowDocumentStore: () => ({ value: mockWorkflowDocumentStore }),
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
	let options: PushHandlerOptions;
	let workflowsListStore: ReturnType<typeof mockedStore<typeof useWorkflowsListStore>>;

	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia({ stubActions: false }));
		workflowsListStore = mockedStore(useWorkflowsListStore);
		mockWorkflowDocumentStore.workflowId = '';
		options = { router: mock<Router>(), documentId: createWorkflowDocumentId('current') };
	});

	it('merges partial settings into an existing list entry', async () => {
		workflowsListStore.workflowsById = {
			'wf-1': {
				id: 'wf-1',
				name: 'wf',
				settings: { availableInMCP: false, executionOrder: 'v1' },
			},
		} as unknown as typeof workflowsListStore.workflowsById;

		await workflowSettingsUpdated(makeEvent('wf-1', { availableInMCP: true }), options);

		expect(workflowsListStore.workflowsById['wf-1'].settings).toEqual({
			availableInMCP: true,
			executionOrder: 'v1',
		});
	});

	it('creates a settings object on list entries that have none', async () => {
		workflowsListStore.workflowsById = {
			'wf-1': { id: 'wf-1', name: 'wf' },
		} as unknown as typeof workflowsListStore.workflowsById;

		await workflowSettingsUpdated(makeEvent('wf-1', { availableInMCP: true }), options);

		expect(workflowsListStore.workflowsById['wf-1'].settings).toEqual({
			availableInMCP: true,
		});
	});

	it('does nothing for the document store when the workflow is not the active one', async () => {
		mockWorkflowDocumentStore.workflowId = 'other-workflow';

		await workflowSettingsUpdated(makeEvent('wf-1', { availableInMCP: true }), options);

		expect(mockWorkflowDocumentStore.mergeSettings).not.toHaveBeenCalled();
		expect(mockWorkflowDocumentStore.setChecksum).not.toHaveBeenCalled();
	});

	it('merges settings and uses payload checksum for the active document', async () => {
		mockWorkflowDocumentStore.workflowId = 'wf-current';
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
			options,
		);

		expect(mockWorkflowDocumentStore.mergeSettings).toHaveBeenCalledWith({ availableInMCP: true });
		expect(mockWorkflowDocumentStore.setChecksum).toHaveBeenCalledWith('fresh-checksum');
		expect(workflowsListStore.workflowsById['wf-current'].checksum).toBe('fresh-checksum');
	});

	it('applies settings but skips checksum refresh when none is provided', async () => {
		mockWorkflowDocumentStore.workflowId = 'wf-current';
		workflowsListStore.workflowsById = {
			'wf-current': {
				id: 'wf-current',
				name: 'wf',
				settings: { availableInMCP: false, executionOrder: 'v1' },
				checksum: 'stale-checksum',
			},
		} as unknown as typeof workflowsListStore.workflowsById;

		await workflowSettingsUpdated(makeEvent('wf-current', { availableInMCP: true }), options);

		expect(mockWorkflowDocumentStore.mergeSettings).toHaveBeenCalledWith({ availableInMCP: true });
		expect(mockWorkflowDocumentStore.setChecksum).not.toHaveBeenCalled();
		expect(workflowsListStore.workflowsById['wf-current'].checksum).toBe('stale-checksum');
	});

	it('merges multiple settings keys in one event', async () => {
		mockWorkflowDocumentStore.workflowId = 'wf-current';
		workflowsListStore.workflowsById = {
			'wf-current': {
				id: 'wf-current',
				name: 'wf',
				settings: { executionOrder: 'v0' },
			},
		} as unknown as typeof workflowsListStore.workflowsById;

		await workflowSettingsUpdated(
			makeEvent('wf-current', { availableInMCP: true, timezone: 'UTC' }),
			options,
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
