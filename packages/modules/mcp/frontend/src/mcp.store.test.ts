import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';

import * as mcpApi from './mcp.api';
import { useMCPStore } from './mcp.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createOAuthClient, createWorkflow } from './mcp.test.utils';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

// There is no shell in a module test, so stub the capability the store calls.
const syncWorkflowMcpAccess = vi.fn<(workflowIds: string[], availableInMCP: boolean) => void>();

describe('mcp.store', () => {
	let store: ReturnType<typeof useMCPStore>;

	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createPinia());
		store = useMCPStore();
		capabilityRegistry.provide(capabilities.workflowMcpAccessSync, syncWorkflowMcpAccess);
	});

	afterEach(() => {
		capabilityRegistry.clear();
	});

	describe('fetchWorkflowsAvailableForMCP', () => {
		it('returns paginated workflows and total count', async () => {
			const workflow = createWorkflow({ id: 'wf-1' });
			const fetchSpy = vi.spyOn(mcpApi, 'fetchMcpExposedWorkflows').mockResolvedValue({
				data: [workflow],
				count: 11,
			});

			await expect(store.fetchWorkflowsAvailableForMCP(2, 25)).resolves.toEqual({
				data: [workflow],
				count: 11,
			});
			expect(fetchSpy).toHaveBeenCalledWith({}, { skip: 25, take: 25 });
		});
	});

	describe('fetchAgentsAvailableForMCP', () => {
		it('fetches exposed agents through the permission-aware MCP endpoint', async () => {
			const fetchSpy = vi.spyOn(mcpApi, 'fetchMcpAgents').mockResolvedValue({
				data: [],
				count: 11,
			});

			await expect(store.fetchAgentsAvailableForMCP(2, 25)).resolves.toEqual({
				data: [],
				count: 11,
			});
			expect(fetchSpy).toHaveBeenCalledWith(
				{},
				{
					offset: 25,
					limit: 25,
					availableInMCP: true,
				},
			);
		});

		it('keeps the eligible-agent query on the default availability filter', async () => {
			const fetchSpy = vi.spyOn(mcpApi, 'fetchMcpAgents').mockResolvedValue({
				data: [],
				count: 0,
			});

			await store.getMcpEligibleAgents({ limit: 10, query: 'sales' });

			expect(fetchSpy).toHaveBeenCalledWith({}, { limit: 10, query: 'sales' });
		});
	});

	describe('toggleWorkflowMcpAccess', () => {
		it('syncs the confirmed workflow into the shell stores', async () => {
			vi.spyOn(mcpApi, 'toggleWorkflowsMcpAccessApi').mockResolvedValue({
				updatedCount: 1,
				updatedIds: ['wf-1'],
				unchangedCount: 0,
				unchangedIds: [],
				skippedCount: 0,
				failedCount: 0,
			});

			await store.toggleWorkflowMcpAccess('wf-1', true);

			expect(syncWorkflowMcpAccess).toHaveBeenCalledWith(['wf-1'], true);
		});

		it('throws when the backend silently skipped the workflow', async () => {
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

			// Local state must remain untouched when the backend rejected the change.
			expect(syncWorkflowMcpAccess).not.toHaveBeenCalled();
		});

		it('propagates network errors without patching local state', async () => {
			vi.spyOn(mcpApi, 'toggleWorkflowsMcpAccessApi').mockRejectedValue(new Error('network'));

			await expect(store.toggleWorkflowMcpAccess('wf-1', true)).rejects.toThrow('network');

			expect(syncWorkflowMcpAccess).not.toHaveBeenCalled();
		});
	});

	describe('updateOAuthClientDetails', () => {
		type ListResponse = Awaited<ReturnType<typeof mcpApi.fetchOAuthClients>>;

		it('saves the details and applies them to every cached row of the client', async () => {
			const owner = { id: 'user-1', firstName: 'Jane', lastName: 'Doe', email: 'jane@n8n.io' };
			const other = { id: 'user-2', firstName: 'John', lastName: 'Doe', email: 'john@n8n.io' };
			const ownRow = createOAuthClient({ id: 'client-1', owner });
			const otherRow = createOAuthClient({ id: 'client-1', owner: other });
			const unrelated = createOAuthClient({ id: 'client-2', name: 'Cursor' });
			store.oauthClients = [ownRow, otherRow, unrelated];
			store.oauthClientsPreview = [createOAuthClient({ id: 'client-1' })];
			const updateSpy = vi.spyOn(mcpApi, 'updateOAuthClient').mockResolvedValue({
				id: 'client-1',
				name: 'Claude (marketing)',
				description: 'Used by the marketing team',
			});
			// The refetch fails, so the cached rows keep the locally applied values.
			vi.spyOn(mcpApi, 'fetchOAuthClients').mockRejectedValue(new Error('refetch failed'));

			const result = await store.updateOAuthClientDetails(ownRow, {
				name: 'Claude (marketing)',
				description: 'Used by the marketing team',
			});

			expect(updateSpy).toHaveBeenCalledWith({}, 'client-1', {
				name: 'Claude (marketing)',
				description: 'Used by the marketing team',
			});
			expect(result).toEqual({
				...ownRow,
				name: 'Claude (marketing)',
				description: 'Used by the marketing team',
			});
			expect(store.oauthClients.map((row) => [row.name, row.description, row.owner?.id])).toEqual([
				['Claude (marketing)', 'Used by the marketing team', 'user-1'],
				['Claude (marketing)', 'Used by the marketing team', 'user-2'],
				['Cursor', null, undefined],
			]);
			expect(store.oauthClientsPreview[0]).toMatchObject({
				name: 'Claude (marketing)',
				description: 'Used by the marketing team',
			});
		});

		it('refetches the list with its active filters after the save', async () => {
			const client = createOAuthClient({ id: 'client-1', name: 'Claude' });
			store.oauthClients = [client];
			store.oauthClientsFilters = { search: 'claude', type: null, ownerId: null, connected: null };
			vi.spyOn(mcpApi, 'updateOAuthClient').mockResolvedValue({
				id: 'client-1',
				name: 'Cursor',
				description: null,
			});
			const fetchSpy = vi
				.spyOn(mcpApi, 'fetchOAuthClients')
				.mockResolvedValue({ data: [], count: 0, totals: { mine: 1 } });

			await store.updateOAuthClientDetails(client, { name: 'Cursor' });

			expect(fetchSpy).toHaveBeenCalledTimes(1);
			expect(fetchSpy).toHaveBeenCalledWith({}, expect.objectContaining({ name: 'claude' }));
			// The renamed client no longer matches the search, so it leaves the list.
			expect(store.oauthClients).toEqual([]);
			expect(store.oauthClientsCount).toBe(0);
		});

		it('refetches the preview instead of the list when the caller does not show the list', async () => {
			const client = createOAuthClient({ id: 'client-1', name: 'Claude' });
			store.oauthClientsPreview = [client];
			vi.spyOn(mcpApi, 'updateOAuthClient').mockResolvedValue({
				id: 'client-1',
				name: 'Renamed',
				description: null,
			});
			const fetchSpy = vi.spyOn(mcpApi, 'fetchOAuthClients').mockResolvedValue({
				data: [{ ...client, name: 'Renamed' }],
				count: 1,
				totals: { mine: 1 },
			});

			await store.updateOAuthClientDetails(client, { name: 'Renamed' }, { refreshList: false });

			expect(fetchSpy).toHaveBeenCalledTimes(1);
			expect(fetchSpy).toHaveBeenCalledWith({}, { ownership: 'mine', skip: 0, take: 3 });
			expect(store.oauthClientsPreview.map((row) => row.name)).toEqual(['Renamed']);
		});

		it('does not let a list fetch that started before the save restore the old values', async () => {
			const client = createOAuthClient({ id: 'client-1', name: 'Claude' });
			let resolveStale!: (value: ListResponse) => void;
			const stale = new Promise<ListResponse>((resolve) => {
				resolveStale = resolve;
			});
			vi.spyOn(mcpApi, 'fetchOAuthClients')
				.mockReturnValueOnce(stale)
				.mockResolvedValueOnce({
					data: [{ ...client, name: 'Renamed' }],
					count: 1,
					totals: { mine: 1 },
				});
			vi.spyOn(mcpApi, 'updateOAuthClient').mockResolvedValue({
				id: 'client-1',
				name: 'Renamed',
				description: null,
			});

			const staleCall = store.getAllOAuthClients(); // in flight
			await store.updateOAuthClientDetails(client, { name: 'Renamed' });
			resolveStale({ data: [client], count: 1, totals: { mine: 1 } });
			await staleCall;

			expect(store.oauthClients.map((row) => row.name)).toEqual(['Renamed']);
		});

		it('keeps the cached rows when the save fails', async () => {
			const client = createOAuthClient({ id: 'client-1', name: 'Claude' });
			store.oauthClients = [client];
			vi.spyOn(mcpApi, 'updateOAuthClient').mockRejectedValue(new Error('network'));

			await expect(store.updateOAuthClientDetails(client, { name: 'Renamed' })).rejects.toThrow(
				'network',
			);
			expect(store.oauthClients[0].name).toBe('Claude');
		});
	});

	describe('fetchOAuthClientsPreview', () => {
		it("fetches the user's own first clients regardless of the list's ownership and filters", async () => {
			const client = createOAuthClient();
			const fetchSpy = vi.spyOn(mcpApi, 'fetchOAuthClients').mockResolvedValue({
				data: [client],
				count: 1,
				totals: { mine: 1, all: 3 },
				scopeTools: { 'workflow:read': ['list_workflows'] },
			});
			store.oauthClientsOwnership = 'all';
			store.oauthClientsPage = 2;
			store.oauthClientsFilters = {
				search: 'claude',
				type: 'cli',
				ownerId: 'user-1',
				connected: 'last7',
			};

			await store.fetchOAuthClientsPreview();

			expect(fetchSpy).toHaveBeenCalledWith({}, { ownership: 'mine', skip: 0, take: 3 });
			expect(store.oauthClientsPreview).toEqual([client]);
			expect(store.oauthClientTotals).toEqual({ mine: 1, all: 3 });
			expect(store.oauthClientScopeTools).toEqual({ 'workflow:read': ['list_workflows'] });
		});

		it('discards a stale preview response superseded by a newer one', async () => {
			let resolveStale!: (value: Awaited<ReturnType<typeof mcpApi.fetchOAuthClients>>) => void;
			const stale = new Promise<Awaited<ReturnType<typeof mcpApi.fetchOAuthClients>>>((resolve) => {
				resolveStale = resolve;
			});
			vi.spyOn(mcpApi, 'fetchOAuthClients')
				.mockReturnValueOnce(stale)
				.mockResolvedValueOnce({
					data: [createOAuthClient({ id: 'new' })],
					count: 1,
					totals: { mine: 1 },
				});

			const staleCall = store.fetchOAuthClientsPreview(); // in flight
			await store.fetchOAuthClientsPreview(); // newer request commits 'new'
			resolveStale({
				data: [createOAuthClient({ id: 'stale' })],
				count: 1,
				totals: { mine: 99 },
			});
			await staleCall;

			expect(store.oauthClientsPreview.map((client) => client.id)).toEqual(['new']);
			expect(store.oauthClientTotals).toEqual({ mine: 1 });
		});

		it("does not let a slow preview overwrite the list's newer totals and scope tools", async () => {
			let resolvePreview!: (value: Awaited<ReturnType<typeof mcpApi.fetchOAuthClients>>) => void;
			const preview = new Promise<Awaited<ReturnType<typeof mcpApi.fetchOAuthClients>>>(
				(resolve) => {
					resolvePreview = resolve;
				},
			);
			vi.spyOn(mcpApi, 'fetchOAuthClients')
				.mockReturnValueOnce(preview)
				.mockResolvedValueOnce({
					data: [],
					count: 0,
					totals: { mine: 2, all: 5 },
					scopeTools: { 'workflow:read': ['search_workflows'] },
				});

			const previewCall = store.fetchOAuthClientsPreview(); // in flight
			await store.getAllOAuthClients(); // newer list fetch commits its metadata
			resolvePreview({
				data: [createOAuthClient()],
				count: 1,
				totals: { mine: 1, all: 4 },
				scopeTools: { 'workflow:read': ['stale'] },
			});
			await previewCall;

			// The preview rows are still applied (no newer preview exists)...
			expect(store.oauthClientsPreview).toHaveLength(1);
			// ...but the instance-wide metadata keeps the newer list response.
			expect(store.oauthClientTotals).toEqual({ mine: 2, all: 5 });
			expect(store.oauthClientScopeTools).toEqual({ 'workflow:read': ['search_workflows'] });
		});

		it('clears the cached preview', async () => {
			vi.spyOn(mcpApi, 'fetchOAuthClients').mockResolvedValue({
				data: [createOAuthClient()],
				count: 1,
				totals: { mine: 1 },
			});
			await store.fetchOAuthClientsPreview();
			expect(store.oauthClientsPreview).toHaveLength(1);

			store.clearOAuthClientsPreview();

			expect(store.oauthClientsPreview).toEqual([]);
		});

		it('keeps a fetch that was in flight when the preview was cleared from repopulating it', async () => {
			let resolveInFlight!: (value: Awaited<ReturnType<typeof mcpApi.fetchOAuthClients>>) => void;
			vi.spyOn(mcpApi, 'fetchOAuthClients').mockReturnValue(
				new Promise((resolve) => {
					resolveInFlight = resolve;
				}),
			);

			const inFlight = store.fetchOAuthClientsPreview();
			store.clearOAuthClientsPreview(); // e.g. the overview unmounted
			resolveInFlight({ data: [createOAuthClient()], count: 1, totals: { mine: 1 } });
			await inFlight;

			expect(store.oauthClientsPreview).toEqual([]);
		});

		it("leaves the clients page's list state untouched", async () => {
			const listed = createOAuthClient({ id: 'listed' });
			vi.spyOn(mcpApi, 'fetchOAuthClients').mockResolvedValue({
				data: [createOAuthClient({ id: 'previewed' })],
				count: 1,
				totals: { mine: 1 },
			});
			store.oauthClients = [listed];
			store.oauthClientsOwnership = 'all';
			store.oauthClientsPage = 2;
			store.oauthClientsCount = 40;

			await store.fetchOAuthClientsPreview();

			expect(store.oauthClients).toEqual([listed]);
			expect(store.oauthClientsOwnership).toBe('all');
			expect(store.oauthClientsPage).toBe(2);
			expect(store.oauthClientsCount).toBe(40);
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

		it('keeps a successful revoke successful when the totals refetch fails', async () => {
			vi.spyOn(mcpApi, 'deleteOAuthClient').mockResolvedValue({ success: true, message: 'ok' });
			vi.spyOn(mcpApi, 'fetchOAuthClients').mockRejectedValue(new Error('refetch failed'));

			await expect(store.removeOAuthClient('client-1')).resolves.toEqual({
				success: true,
				message: 'ok',
			});
		});

		it("skips the list refetch when the caller doesn't show the list", async () => {
			vi.spyOn(mcpApi, 'deleteOAuthClient').mockResolvedValue({ success: true, message: 'ok' });
			const fetchSpy = vi.spyOn(mcpApi, 'fetchOAuthClients');

			await store.removeOAuthClient('client-1', undefined, { refreshList: false });

			expect(fetchSpy).not.toHaveBeenCalled();
		});

		it('ignores a stale in-flight list response superseded by a newer request', async () => {
			let resolveStale!: (value: Awaited<ReturnType<typeof mcpApi.fetchOAuthClients>>) => void;
			const stale = new Promise<Awaited<ReturnType<typeof mcpApi.fetchOAuthClients>>>((resolve) => {
				resolveStale = resolve;
			});
			vi.spyOn(mcpApi, 'fetchOAuthClients')
				.mockReturnValueOnce(stale)
				.mockResolvedValueOnce({
					data: [createOAuthClient({ id: 'new' })],
					count: 1,
					totals: { mine: 1 },
				});

			const staleCall = store.getAllOAuthClients(); // in flight
			await store.getAllOAuthClients(); // newer request commits 'new'

			resolveStale({
				data: [createOAuthClient({ id: 'old' })],
				count: 1,
				totals: { mine: 99 },
			});
			await staleCall;

			// the superseded response must not overwrite the newer selection
			expect(store.oauthClients.map((client) => client.id)).toEqual(['new']);
			expect(store.oauthClientTotals).toEqual({ mine: 1 });
		});
	});

	describe('toggleWorkflowsMcpAccess (bulk)', () => {
		it('syncs only the workflows the backend confirmed', async () => {
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
			// The skipped workflow is left out of the sync.
			expect(syncWorkflowMcpAccess).toHaveBeenCalledWith(['wf-1', 'wf-2'], true);
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

		it('does not sync when the response omits updatedIds (scope mode)', async () => {
			vi.spyOn(mcpApi, 'toggleWorkflowsMcpAccessApi').mockResolvedValue({
				updatedCount: 5,
				unchangedCount: 0,
				skippedCount: 0,
				failedCount: 0,
			});

			await expect(
				store.toggleWorkflowsMcpAccess({ projectId: 'project-1' }, true),
			).resolves.toEqual({ updatedCount: 5, unchangedCount: 0, skippedCount: 0, failedCount: 0 });

			expect(syncWorkflowMcpAccess).not.toHaveBeenCalled();
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

	describe('setMcpAccessEnabled', () => {
		it.each([
			{
				desc: 'syncs both values from the response when enabling (auto-expose surfaced)',
				response: { mcpAccessEnabled: true, autoExposeNewWorkflows: true },
			},
			{
				desc: 'syncs both values from the response when disabling (auto-expose gated to false)',
				response: { mcpAccessEnabled: false, autoExposeNewWorkflows: false },
			},
		])('$desc', async ({ response }) => {
			const updateSpy = vi.spyOn(mcpApi, 'updateMcpSettings').mockResolvedValue(response);
			const settingsStore = useSettingsStore();
			const getModuleSettings = vi.spyOn(settingsStore, 'getModuleSettings').mockResolvedValue();
			settingsStore.moduleSettings.mcp = {
				mcpAccessEnabled: !response.mcpAccessEnabled,
				mcpManagedByEnv: false,
				autoExposeNewWorkflows: !response.autoExposeNewWorkflows,
				serverUrl: 'https://example.com/mcp',
			};

			const result = await useMCPStore().setMcpAccessEnabled(response.mcpAccessEnabled);

			expect(updateSpy).toHaveBeenCalledWith(expect.anything(), {
				mcpAccessEnabled: response.mcpAccessEnabled,
			});
			expect(result).toBe(response.mcpAccessEnabled);
			expect(settingsStore.moduleSettings.mcp).toEqual({
				mcpAccessEnabled: response.mcpAccessEnabled,
				mcpManagedByEnv: false,
				autoExposeNewWorkflows: response.autoExposeNewWorkflows,
				serverUrl: 'https://example.com/mcp',
			});
			// The response carries both values, so no follow-up module-settings fetch.
			expect(getModuleSettings).not.toHaveBeenCalled();
		});

		it('defaults sibling fields when no local settings exist yet', async () => {
			vi.spyOn(mcpApi, 'updateMcpSettings').mockResolvedValue({
				mcpAccessEnabled: true,
				autoExposeNewWorkflows: false,
			});
			const settingsStore = useSettingsStore();
			settingsStore.moduleSettings.mcp = undefined;

			const result = await useMCPStore().setMcpAccessEnabled(true);

			expect(result).toBe(true);
			expect(settingsStore.moduleSettings.mcp).toEqual({
				mcpAccessEnabled: true,
				mcpManagedByEnv: false,
				autoExposeNewWorkflows: false,
			});
		});
	});

	describe('autoExposeNewWorkflows', () => {
		it('patches only autoExposeNewWorkflows and syncs both values from the response', async () => {
			const updateSpy = vi
				.spyOn(mcpApi, 'updateMcpSettings')
				.mockResolvedValue({ mcpAccessEnabled: true, autoExposeNewWorkflows: true });
			const settingsStore = useSettingsStore();
			settingsStore.moduleSettings.mcp = {
				mcpAccessEnabled: true,
				mcpManagedByEnv: false,
				autoExposeNewWorkflows: false,
			};

			const result = await useMCPStore().setAutoExposeNewWorkflows(true);

			expect(updateSpy).toHaveBeenCalledWith(expect.anything(), {
				autoExposeNewWorkflows: true,
			});
			expect(result).toBe(true);
			expect(settingsStore.moduleSettings.mcp?.autoExposeNewWorkflows).toBe(true);
			expect(settingsStore.moduleSettings.mcp?.mcpAccessEnabled).toBe(true);
		});
	});
});
