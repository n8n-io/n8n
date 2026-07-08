import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

import * as mcpApi from './mcp.api';
import { useMCPStore } from './mcp.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { createOAuthClient, createWorkflow } from './mcp.test.utils';

const { mockWorkflowDocumentStore } = vi.hoisted(() => ({
	mockWorkflowDocumentStore: {
		allNodes: [],
		workflowTriggerNodes: [],
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
	let workflowsListStore: ReturnType<typeof useWorkflowsListStore>;

	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createPinia());
		store = useMCPStore();
		workflowsListStore = useWorkflowsListStore();
	});

	describe('fetchWorkflowsAvailableForMCP', () => {
		it('returns paginated workflows and total count', async () => {
			const workflow = createWorkflow({ id: 'wf-1' });
			const fetchSpy = vi
				.spyOn(workflowsListStore, 'fetchWorkflowsPageWithCount')
				.mockResolvedValue({
					data: [workflow],
					count: 11,
				});

			await expect(store.fetchWorkflowsAvailableForMCP(2, 25)).resolves.toEqual({
				data: [workflow],
				count: 11,
			});
			expect(fetchSpy).toHaveBeenCalledWith(
				undefined,
				2,
				25,
				'updatedAt:desc',
				{ isArchived: false, availableInMCP: true },
				false,
				false,
			);
		});
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
				unchangedCount: 0,
				unchangedIds: [],
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
				unchangedCount: 0,
				unchangedIds: [],
				skippedCount: 0,
				failedCount: 0,
			});

			await store.toggleWorkflowMcpAccess('wf-1', true);

			expect(workflowsListStore.workflowsById['wf-1'].settings?.availableInMCP).toBe(true);
		});

		it('merges settings into the active workflow document when toggling its own id', async () => {
			vi.spyOn(mcpApi, 'toggleWorkflowsMcpAccessApi').mockResolvedValue({
				updatedCount: 1,
				updatedIds: ['wf-current'],
				unchangedCount: 0,
				unchangedIds: [],
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
				unchangedCount: 0,
				unchangedIds: [],
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

	describe('OAuth clients ownership', () => {
		it('fetches the current page with ownership, pagination and filters', async () => {
			const client = createOAuthClient();
			const fetchSpy = vi.spyOn(mcpApi, 'fetchOAuthClients').mockResolvedValue({
				data: [client],
				count: 1,
				totals: { mine: 1, all: 3 },
			});

			await store.getAllOAuthClients();

			expect(fetchSpy).toHaveBeenCalledWith({}, { ownership: 'mine', skip: 0, take: 10 });
			expect(store.oauthClients).toEqual([client]);
			expect(store.oauthClientTotals).toEqual({ mine: 1, all: 3 });
			expect(store.oauthClientsCount).toBe(1);
		});

		it('switches ownership, resetting page and filters, and refetches', async () => {
			const fetchSpy = vi.spyOn(mcpApi, 'fetchOAuthClients').mockResolvedValue({
				data: [],
				count: 0,
				totals: { mine: 0, all: 0 },
			});

			store.oauthClientsFilters = {
				search: 'claude',
				type: 'cli',
				ownerId: 'user-1',
				connected: 'last7',
			};

			await store.setOAuthClientsOwnership('all');

			expect(store.oauthClientsOwnership).toBe('all');
			expect(store.oauthClientsFilters).toEqual({
				search: '',
				type: null,
				ownerId: null,
				connected: null,
			});
			expect(fetchSpy).toHaveBeenCalledWith({}, { ownership: 'all', skip: 0, take: 10 });
		});

		it('sends the active filters as query params and resets the page', async () => {
			const fetchSpy = vi.spyOn(mcpApi, 'fetchOAuthClients').mockResolvedValue({
				data: [],
				count: 0,
				totals: { mine: 0 },
			});

			store.oauthClientsPage = 2;
			await store.setOAuthClientsFilters({
				search: '  claude ',
				type: 'cli',
				ownerId: 'user-1',
				connected: 'last30',
			});

			expect(store.oauthClientsPage).toBe(0);
			expect(fetchSpy).toHaveBeenCalledWith(
				{},
				{
					ownership: 'mine',
					skip: 0,
					take: 10,
					name: 'claude',
					ownerId: 'user-1',
					type: 'cli',
					connected: 'last30',
				},
			);
		});

		it('paginates server-side and restarts from the first page on a page-size change', async () => {
			const fetchSpy = vi.spyOn(mcpApi, 'fetchOAuthClients').mockResolvedValue({
				data: [createOAuthClient()],
				count: 40,
				totals: { mine: 40 },
			});

			await store.setOAuthClientsPagination(2, 10);
			expect(fetchSpy).toHaveBeenLastCalledWith({}, { ownership: 'mine', skip: 20, take: 10 });

			await store.setOAuthClientsPagination(2, 25);
			expect(store.oauthClientsPage).toBe(0);
			expect(fetchSpy).toHaveBeenLastCalledWith({}, { ownership: 'mine', skip: 0, take: 25 });
		});

		it('clamps to the last page when the requested one shrank away', async () => {
			const fetchSpy = vi
				.spyOn(mcpApi, 'fetchOAuthClients')
				.mockResolvedValueOnce({ data: [], count: 11, totals: { mine: 11 } })
				.mockResolvedValueOnce({
					data: [createOAuthClient()],
					count: 11,
					totals: { mine: 11 },
				});

			await store.setOAuthClientsPagination(5, 10);

			expect(store.oauthClientsPage).toBe(1);
			expect(fetchSpy).toHaveBeenLastCalledWith({}, { ownership: 'mine', skip: 10, take: 10 });
		});

		it('stores the distinct owners returned by the server', async () => {
			const jane = { id: 'user-1', firstName: 'Jane', lastName: 'Doe', email: 'jane@n8n.io' };
			const adam = { id: 'user-2', firstName: 'Adam', lastName: 'Ant', email: 'adam@n8n.io' };
			vi.spyOn(mcpApi, 'fetchOAuthClients').mockResolvedValue({
				data: [createOAuthClient({ id: 'a', owner: jane })],
				count: 1,
				totals: { mine: 1, all: 3 },
				owners: [adam, jane],
			});

			await store.getAllOAuthClients();

			expect(store.oauthClientOwners).toEqual([adam, jane]);
		});

		it('passes the target userId on revoke and refetches the list', async () => {
			const deleteSpy = vi.spyOn(mcpApi, 'deleteOAuthClient').mockResolvedValue({
				success: true,
				message: 'ok',
			});
			const fetchSpy = vi.spyOn(mcpApi, 'fetchOAuthClients').mockResolvedValue({
				data: [],
				count: 0,
				totals: { mine: 0, all: 0 },
			});

			await store.removeOAuthClient('client-1', 'user-2');

			expect(deleteSpy).toHaveBeenCalledWith({}, 'client-1', 'user-2');
			expect(fetchSpy).toHaveBeenCalled();
			expect(store.oauthClientTotals).toEqual({ mine: 0, all: 0 });
		});
	});

	describe('toggleWorkflowsMcpAccess (bulk)', () => {
		it('applies the new value only to workflows the backend confirmed', async () => {
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
				'wf-3': {
					id: 'wf-3',
					name: 'wf-3',
					settings: { availableInMCP: false, executionOrder: 'v1' },
				},
			} as unknown as typeof workflowsListStore.workflowsById;

			vi.spyOn(mcpApi, 'toggleWorkflowsMcpAccessApi').mockResolvedValue({
				updatedCount: 1,
				updatedIds: ['wf-1'],
				unchangedCount: 1,
				unchangedIds: ['wf-2'],
				skippedCount: 1,
				failedCount: 0,
			});

			const response = await store.toggleWorkflowsMcpAccess(
				{ workflowIds: ['wf-1', 'wf-2', 'wf-3'] },
				true,
			);

			expect(response.updatedIds).toEqual(['wf-1']);
			expect(response.unchangedIds).toEqual(['wf-2']);
			expect(workflowsListStore.workflowsById['wf-1'].settings?.availableInMCP).toBe(true);
			expect(workflowsListStore.workflowsById['wf-2'].settings?.availableInMCP).toBe(true);
			// Skipped workflow remains untouched.
			expect(workflowsListStore.workflowsById['wf-3'].settings?.availableInMCP).toBe(false);
		});

		it('does not throw when none of the targeted workflows were updated', async () => {
			vi.spyOn(mcpApi, 'toggleWorkflowsMcpAccessApi').mockResolvedValue({
				updatedCount: 0,
				updatedIds: [],
				unchangedCount: 2,
				unchangedIds: ['wf-1', 'wf-2'],
				skippedCount: 0,
				failedCount: 0,
			});

			await expect(
				store.toggleWorkflowsMcpAccess({ workflowIds: ['wf-1', 'wf-2'] }, true),
			).resolves.toEqual({
				updatedCount: 0,
				updatedIds: [],
				unchangedCount: 2,
				unchangedIds: ['wf-1', 'wf-2'],
				skippedCount: 0,
				failedCount: 0,
			});
		});

		it('forwards projectId scope to the API', async () => {
			// Project-scoped responses from the backend omit `updatedIds`.
			const spy = vi.spyOn(mcpApi, 'toggleWorkflowsMcpAccessApi').mockResolvedValue({
				updatedCount: 0,
				unchangedCount: 0,
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
				unchangedCount: 0,
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
				unchangedCount: 0,
				skippedCount: 0,
				failedCount: 0,
			});

			await expect(
				store.toggleWorkflowsMcpAccess({ projectId: 'project-1' }, true),
			).resolves.toEqual({ updatedCount: 5, unchangedCount: 0, skippedCount: 0, failedCount: 0 });

			expect(workflowsListStore.workflowsById['wf-1'].settings?.availableInMCP).toBe(false);
		});

		it('surfaces partial failures from the backend via failedCount', async () => {
			vi.spyOn(mcpApi, 'toggleWorkflowsMcpAccessApi').mockResolvedValue({
				updatedCount: 500,
				unchangedCount: 0,
				skippedCount: 0,
				failedCount: 100,
			});

			await expect(
				store.toggleWorkflowsMcpAccess({ projectId: 'big-project' }, true),
			).resolves.toEqual({
				updatedCount: 500,
				unchangedCount: 0,
				skippedCount: 0,
				failedCount: 100,
			});
		});
	});
});
