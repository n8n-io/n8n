/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useAgentResourcesLocator } from './useAgentResourcesLocator';

const { listAgentsPage, getAgent } = vi.hoisted(() => ({
	listAgentsPage: vi.fn(),
	getAgent: vi.fn(),
}));

vi.mock('@/features/agents/composables/useAgentApi', () => ({
	listAgentsPage,
	getAgent,
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '', pushRef: '' } }),
}));

const flushPromises = async () => await new Promise(setImmediate);
const noProjectName = () => null;

describe('useAgentResourcesLocator', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		listAgentsPage.mockResolvedValue({ count: 0, data: [] });
	});

	it('initializes with an empty catalog and no more pages', () => {
		const { agentsResources, hasMoreAgentsToLoad } = useAgentResourcesLocator(
			ref('proj-1'),
			noProjectName,
		);

		expect(agentsResources.value).toEqual([]);
		expect(hasMoreAgentsToLoad.value).toBe(false);
	});

	it('loads the first project-scoped page and reports more when the count exceeds the page', async () => {
		listAgentsPage.mockResolvedValue({
			count: 100,
			data: [{ id: 'a1', name: 'Agent 1', projectId: 'proj-1' }],
		});

		const { setAgentsResources, agentsResources, hasMoreAgentsToLoad } = useAgentResourcesLocator(
			ref('proj-1'),
			noProjectName,
		);

		await setAgentsResources();

		expect(listAgentsPage).toHaveBeenCalledWith(
			expect.anything(),
			'proj-1',
			expect.objectContaining({ skip: 0, take: 40, sortBy: 'updatedAt:desc' }),
		);
		expect(agentsResources.value).toEqual([{ name: 'Agent 1', value: 'a1' }]);
		expect(hasMoreAgentsToLoad.value).toBe(true);
	});

	it('appends the next page on loadMore with an advancing skip', async () => {
		listAgentsPage
			.mockResolvedValueOnce({
				count: 100,
				data: [{ id: 'a1', name: 'Agent 1', projectId: 'proj-1' }],
			})
			.mockResolvedValueOnce({
				count: 100,
				data: [{ id: 'a2', name: 'Agent 2', projectId: 'proj-1' }],
			});

		const { setAgentsResources, loadMore, agentsResources } = useAgentResourcesLocator(
			ref('proj-1'),
			noProjectName,
		);

		await setAgentsResources();
		await loadMore();

		expect(listAgentsPage).toHaveBeenNthCalledWith(
			2,
			expect.anything(),
			'proj-1',
			expect.objectContaining({ skip: 40 }),
		);
		expect(agentsResources.value.map((a) => a.value)).toEqual(['a1', 'a2']);
	});

	it('resets the list and skip when searching', async () => {
		const { setAgentsResources, onSearchFilter, agentsResources } = useAgentResourcesLocator(
			ref('proj-1'),
			noProjectName,
		);

		listAgentsPage.mockResolvedValueOnce({
			count: 1,
			data: [{ id: 'a1', name: 'Agent 1', projectId: 'proj-1' }],
		});
		await setAgentsResources();

		listAgentsPage.mockResolvedValueOnce({
			count: 1,
			data: [{ id: 'a2', name: 'Support', projectId: 'proj-1' }],
		});
		await onSearchFilter('support');

		expect(listAgentsPage).toHaveBeenLastCalledWith(
			expect.anything(),
			'proj-1',
			expect.objectContaining({ skip: 0, filter: { query: 'support' } }),
		);
		expect(agentsResources.value).toEqual([{ name: 'Support', value: 'a2' }]);
	});

	it('discards a stale search response that resolves after a newer one', async () => {
		let resolveFirst: (value: { count: number; data: unknown[] }) => void = () => {};
		const firstResponse = new Promise((resolve) => (resolveFirst = resolve));

		listAgentsPage.mockReturnValueOnce(firstResponse).mockResolvedValueOnce({
			count: 1,
			data: [{ id: 'newer', name: 'Newer', projectId: 'proj-1' }],
		});

		const { onSearchFilter, agentsResources } = useAgentResourcesLocator(
			ref('proj-1'),
			noProjectName,
		);

		const stale = onSearchFilter('a');
		await onSearchFilter('ab');

		// The older request resolves last; its generation is stale and must be ignored.
		resolveFirst({ count: 1, data: [{ id: 'older', name: 'Older', projectId: 'proj-1' }] });
		await stale;
		await flushPromises();

		expect(agentsResources.value).toEqual([{ name: 'Newer', value: 'newer' }]);
	});

	it('ignores a stale error from a request a newer search superseded', async () => {
		let rejectFirst: (reason?: unknown) => void = () => {};
		const firstResponse = new Promise((_resolve, reject) => (rejectFirst = reject));

		listAgentsPage.mockReturnValueOnce(firstResponse).mockResolvedValueOnce({
			count: 1,
			data: [{ id: 'newer', name: 'Newer', projectId: 'proj-1' }],
		});

		const { onSearchFilter, agentsResources, loadError } = useAgentResourcesLocator(
			ref('proj-1'),
			noProjectName,
		);

		const stale = onSearchFilter('a');
		await onSearchFilter('ab');

		// The older request rejects last; its generation is stale, so it must not
		// flip the dropdown into the error view over the newer results.
		rejectFirst(new Error('boom'));
		await stale;
		await flushPromises();

		expect(loadError.value).toBeNull();
		expect(agentsResources.value).toEqual([{ name: 'Newer', value: 'newer' }]);
	});

	it('surfaces loadMore errors via loadError without throwing', async () => {
		listAgentsPage.mockResolvedValueOnce({
			count: 100,
			data: [{ id: 'a1', name: 'Agent 1', projectId: 'proj-1' }],
		});

		const { setAgentsResources, loadMore, loadError } = useAgentResourcesLocator(
			ref('proj-1'),
			noProjectName,
		);
		await setAgentsResources();

		listAgentsPage.mockRejectedValueOnce(new Error('boom'));
		await expect(loadMore()).resolves.toBeUndefined();

		expect(loadError.value).toBeInstanceOf(Error);
	});

	it('clears a prior load error once a later page loads successfully', async () => {
		listAgentsPage.mockResolvedValueOnce({
			count: 100,
			data: [{ id: 'a1', name: 'Agent 1', projectId: 'proj-1' }],
		});

		const { setAgentsResources, loadMore, loadError, agentsResources } = useAgentResourcesLocator(
			ref('proj-1'),
			noProjectName,
		);
		await setAgentsResources();

		listAgentsPage.mockRejectedValueOnce(new Error('boom'));
		await loadMore();
		expect(loadError.value).toBeInstanceOf(Error);

		listAgentsPage.mockResolvedValueOnce({
			count: 100,
			data: [{ id: 'a2', name: 'Agent 2', projectId: 'proj-1' }],
		});
		await loadMore();

		expect(loadError.value).toBeNull();
		expect(agentsResources.value.map((a) => a.value)).toEqual(['a1', 'a2']);
	});

	it('retries the same page after a failed loadMore instead of skipping it', async () => {
		listAgentsPage.mockResolvedValueOnce({
			count: 100,
			data: [{ id: 'a1', name: 'Agent 1', projectId: 'proj-1' }],
		});

		const { setAgentsResources, loadMore } = useAgentResourcesLocator(ref('proj-1'), noProjectName);
		await setAgentsResources();

		listAgentsPage.mockRejectedValueOnce(new Error('boom'));
		await loadMore();

		listAgentsPage.mockResolvedValueOnce({
			count: 100,
			data: [{ id: 'a2', name: 'Agent 2', projectId: 'proj-1' }],
		});
		await loadMore();

		// The failed page (skip=40) is re-requested, not skipped past to skip=80.
		expect(listAgentsPage).toHaveBeenNthCalledWith(
			2,
			expect.anything(),
			'proj-1',
			expect.objectContaining({ skip: 40 }),
		);
		expect(listAgentsPage).toHaveBeenNthCalledWith(
			3,
			expect.anything(),
			'proj-1',
			expect.objectContaining({ skip: 40 }),
		);
	});

	it('caches the display name across pages and falls back to the id on a miss', async () => {
		listAgentsPage.mockResolvedValue({
			count: 1,
			data: [{ id: 'a1', name: 'Cached Agent', projectId: 'proj-1' }],
		});

		const { setAgentsResources, getAgentName } = useAgentResourcesLocator(
			ref('proj-1'),
			noProjectName,
		);
		await setAgentsResources();

		expect(getAgentName('a1')).toBe('Cached Agent');
		expect(getAgentName('unknown')).toBe('unknown');
	});

	it('prefixes the resolved project name for cross-project agents', async () => {
		listAgentsPage.mockResolvedValue({
			count: 1,
			data: [{ id: 'a1', name: 'Team Agent', projectId: 'team-1' }],
		});
		const resolveProjectName = (id: string) => (id === 'team-1' ? 'Marketing' : null);

		const { setAgentsResources, agentsResources } = useAgentResourcesLocator(
			ref('proj-1'),
			resolveProjectName,
		);
		await setAgentsResources();

		expect(agentsResources.value).toEqual([{ name: 'Marketing — Team Agent', value: 'a1' }]);
	});

	it('does not query and yields an empty catalog when no project is resolved', async () => {
		const { setAgentsResources, agentsResources, hasMoreAgentsToLoad } = useAgentResourcesLocator(
			ref(''),
			noProjectName,
		);

		await setAgentsResources();

		expect(listAgentsPage).not.toHaveBeenCalled();
		expect(agentsResources.value).toEqual([]);
		expect(hasMoreAgentsToLoad.value).toBe(false);
	});

	describe('refreshAgentName', () => {
		it('returns the agent current display name', async () => {
			getAgent.mockResolvedValue({ id: 'a1', name: 'Renamed Agent', projectId: 'proj-1' });

			const { refreshAgentName } = useAgentResourcesLocator(ref('proj-1'), noProjectName);

			await expect(refreshAgentName('a1')).resolves.toBe('Renamed Agent');
			expect(getAgent).toHaveBeenCalledWith(expect.anything(), 'proj-1', 'a1');
		});

		it('returns null without querying when no project is resolved', async () => {
			const { refreshAgentName } = useAgentResourcesLocator(ref(''), noProjectName);

			await expect(refreshAgentName('a1')).resolves.toBeNull();
			expect(getAgent).not.toHaveBeenCalled();
		});

		it('returns null when the fetch fails, so the caller keeps the cached name', async () => {
			getAgent.mockRejectedValueOnce(new Error('boom'));

			const { refreshAgentName } = useAgentResourcesLocator(ref('proj-1'), noProjectName);

			await expect(refreshAgentName('a1')).resolves.toBeNull();
		});
	});
});
