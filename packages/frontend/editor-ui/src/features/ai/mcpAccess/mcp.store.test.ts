import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

import * as mcpApi from './mcp.api';
import { useMCPStore } from './mcp.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';

const { mockWorkflowDocumentStore } = vi.hoisted(() => ({
	mockWorkflowDocumentStore: {
		allNodes: [],
		name: '',
		settings: {},
		mergeSettings: vi.fn(),
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

describe('mcp.store', () => {
	let store: ReturnType<typeof useMCPStore>;
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let workflowsListStore: ReturnType<typeof useWorkflowsListStore>;

	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createPinia());
		store = useMCPStore();
		workflowsStore = useWorkflowsStore();
		workflowsListStore = useWorkflowsListStore();
	});

	describe('toggleWorkflowMcpAccess', () => {
		it('patches the list store entry when the backend confirms the update', async () => {
			workflowsListStore.workflowsById = {
				'wf-1': {
					id: 'wf-1',
					name: 'wf',
					settings: { availableInMCP: false, executionOrder: 'v1' },
				},
			} as unknown as typeof workflowsListStore.workflowsById;

			vi.spyOn(mcpApi, 'toggleWorkflowsMcpAccessApi').mockResolvedValue({
				updatedCount: 1,
				updatedIds: ['wf-1'],
				skippedCount: 0,
				failedCount: 0,
			});

			await store.toggleWorkflowMcpAccess('wf-1', true);

			expect(workflowsListStore.workflowsById['wf-1'].settings?.availableInMCP).toBe(true);
		});

		it('creates a settings object on list entries that have none', async () => {
			workflowsListStore.workflowsById = {
				'wf-1': {
					id: 'wf-1',
					name: 'wf',
					// No `settings` object on this entry — simulates legacy
					// workflows or sparse list responses.
				},
			} as unknown as typeof workflowsListStore.workflowsById;

			vi.spyOn(mcpApi, 'toggleWorkflowsMcpAccessApi').mockResolvedValue({
				updatedCount: 1,
				updatedIds: ['wf-1'],
				skippedCount: 0,
				failedCount: 0,
			});

			await store.toggleWorkflowMcpAccess('wf-1', true);

			expect(workflowsListStore.workflowsById['wf-1'].settings?.availableInMCP).toBe(true);
		});

		it('merges settings into the active workflow document when toggling its own id', async () => {
			workflowsStore.workflow.id = 'wf-current';

			vi.spyOn(mcpApi, 'toggleWorkflowsMcpAccessApi').mockResolvedValue({
				updatedCount: 1,
				updatedIds: ['wf-current'],
				skippedCount: 0,
				failedCount: 0,
			});

			await store.toggleWorkflowMcpAccess('wf-current', true);

			expect(mockWorkflowDocumentStore.mergeSettings).toHaveBeenCalledWith({
				availableInMCP: true,
			});
		});

		it('throws when the backend silently skipped the workflow', async () => {
			workflowsListStore.workflowsById = {
				'wf-1': {
					id: 'wf-1',
					name: 'wf',
					settings: { availableInMCP: false, executionOrder: 'v1' },
				},
			} as unknown as typeof workflowsListStore.workflowsById;

			vi.spyOn(mcpApi, 'toggleWorkflowsMcpAccessApi').mockResolvedValue({
				updatedCount: 0,
				updatedIds: [],
				skippedCount: 1,
				failedCount: 0,
			});

			await expect(store.toggleWorkflowMcpAccess('wf-1', true)).rejects.toThrow(
				/could not be updated/i,
			);

			// Local store must remain untouched when the backend rejected the change.
			expect(workflowsListStore.workflowsById['wf-1'].settings?.availableInMCP).toBe(false);
			expect(mockWorkflowDocumentStore.mergeSettings).not.toHaveBeenCalled();
		});

		it('propagates network errors without patching local state', async () => {
			workflowsListStore.workflowsById = {
				'wf-1': {
					id: 'wf-1',
					name: 'wf',
					settings: { availableInMCP: false, executionOrder: 'v1' },
				},
			} as unknown as typeof workflowsListStore.workflowsById;

			vi.spyOn(mcpApi, 'toggleWorkflowsMcpAccessApi').mockRejectedValue(new Error('network'));

			await expect(store.toggleWorkflowMcpAccess('wf-1', true)).rejects.toThrow('network');

			expect(workflowsListStore.workflowsById['wf-1'].settings?.availableInMCP).toBe(false);
			expect(mockWorkflowDocumentStore.mergeSettings).not.toHaveBeenCalled();
		});
	});

	describe('toggleWorkflowsMcpAccess (bulk)', () => {
		it('applies the new value only to workflows the backend confirmed were updated', async () => {
			workflowsListStore.workflowsById = {
				'wf-1': {
					id: 'wf-1',
					name: 'wf-1',
					settings: { availableInMCP: false, executionOrder: 'v1' },
				},
				'wf-2': {
					id: 'wf-2',
					name: 'wf-2',
					settings: { availableInMCP: false, executionOrder: 'v1' },
				},
			} as unknown as typeof workflowsListStore.workflowsById;

			vi.spyOn(mcpApi, 'toggleWorkflowsMcpAccessApi').mockResolvedValue({
				updatedCount: 1,
				updatedIds: ['wf-1'],
				skippedCount: 1,
				failedCount: 0,
			});

			const response = await store.toggleWorkflowsMcpAccess(
				{ workflowIds: ['wf-1', 'wf-2'] },
				true,
			);

			expect(response.updatedIds).toEqual(['wf-1']);
			expect(workflowsListStore.workflowsById['wf-1'].settings?.availableInMCP).toBe(true);
			// Skipped workflow remains untouched.
			expect(workflowsListStore.workflowsById['wf-2'].settings?.availableInMCP).toBe(false);
		});

		it('does not throw when none of the targeted workflows were updated', async () => {
			vi.spyOn(mcpApi, 'toggleWorkflowsMcpAccessApi').mockResolvedValue({
				updatedCount: 0,
				updatedIds: [],
				skippedCount: 2,
				failedCount: 0,
			});

			await expect(
				store.toggleWorkflowsMcpAccess({ workflowIds: ['wf-1', 'wf-2'] }, true),
			).resolves.toEqual({
				updatedCount: 0,
				updatedIds: [],
				skippedCount: 2,
				failedCount: 0,
			});
		});

		it('forwards projectId scope to the API', async () => {
			// Project-scoped responses from the backend omit `updatedIds`.
			const spy = vi.spyOn(mcpApi, 'toggleWorkflowsMcpAccessApi').mockResolvedValue({
				updatedCount: 0,
				skippedCount: 0,
				failedCount: 0,
			});

			await store.toggleWorkflowsMcpAccess({ projectId: 'project-1' }, false);

			expect(spy).toHaveBeenCalledWith({}, { projectId: 'project-1' }, false);
		});

		it('forwards folderId scope to the API', async () => {
			// Folder-scoped responses from the backend omit `updatedIds`.
			const spy = vi.spyOn(mcpApi, 'toggleWorkflowsMcpAccessApi').mockResolvedValue({
				updatedCount: 0,
				skippedCount: 0,
				failedCount: 0,
			});

			await store.toggleWorkflowsMcpAccess({ folderId: 'folder-1' }, true);

			expect(spy).toHaveBeenCalledWith({}, { folderId: 'folder-1' }, true);
		});

		it('does not patch local stores when the response omits updatedIds (scope mode)', async () => {
			workflowsListStore.workflowsById = {
				'wf-1': {
					id: 'wf-1',
					name: 'wf-1',
					settings: { availableInMCP: false, executionOrder: 'v1' },
				},
			} as unknown as typeof workflowsListStore.workflowsById;

			vi.spyOn(mcpApi, 'toggleWorkflowsMcpAccessApi').mockResolvedValue({
				updatedCount: 5,
				skippedCount: 0,
				failedCount: 0,
			});

			await expect(
				store.toggleWorkflowsMcpAccess({ projectId: 'project-1' }, true),
			).resolves.toEqual({ updatedCount: 5, skippedCount: 0, failedCount: 0 });

			expect(workflowsListStore.workflowsById['wf-1'].settings?.availableInMCP).toBe(false);
		});

		it('surfaces partial failures from the backend via failedCount', async () => {
			vi.spyOn(mcpApi, 'toggleWorkflowsMcpAccessApi').mockResolvedValue({
				updatedCount: 500,
				skippedCount: 0,
				failedCount: 100,
			});

			await expect(
				store.toggleWorkflowsMcpAccess({ projectId: 'big-project' }, true),
			).resolves.toEqual({ updatedCount: 500, skippedCount: 0, failedCount: 100 });
		});
	});
});
