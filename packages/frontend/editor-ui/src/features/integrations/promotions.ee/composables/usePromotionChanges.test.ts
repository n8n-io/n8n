import { vi, describe, it, expect, beforeEach } from 'vitest';
import { usePromotionChanges } from './usePromotionChanges';
import * as promotionsApi from '../promotions.api';

const publicApiContext = { baseUrl: 'https://example.test/public-api' };
const restApiContext = { baseUrl: 'https://example.test/rest' };

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext, publicApiContext }),
}));

vi.mock('../promotions.api');

const mockChanges = [
	{
		id: 'wf-001',
		name: 'Workflow A',
		type: 'workflow' as const,
		status: 'modified' as const,
		version: 5,
		updatedAt: new Date().toISOString(),
		updatedBy: 'user-1',
		dependencyCount: 3,
		changedDependencies: [],
		parentId: null,
	},
	{
		id: 'wf-002',
		name: 'Workflow B',
		type: 'workflow' as const,
		status: 'new' as const,
		version: 1,
		updatedAt: new Date().toISOString(),
		updatedBy: null,
		dependencyCount: 0,
		changedDependencies: [],
		parentId: null,
	},
	{
		id: 'wf-003',
		name: 'Workflow C',
		type: 'workflow' as const,
		status: 'archived' as const,
		version: null,
		updatedAt: new Date().toISOString(),
		updatedBy: 'user-2',
		dependencyCount: 1,
		changedDependencies: [],
		parentId: null,
	},
	{
		id: 'wf-004',
		name: 'Workflow D',
		type: 'workflow' as const,
		status: 'deleted' as const,
		version: null,
		updatedAt: new Date().toISOString(),
		updatedBy: null,
		dependencyCount: 0,
		changedDependencies: [],
		parentId: null,
	},
];

const COMMIT_SHA = 'a'.repeat(40);
const SOURCE = { configId: 'config-1', branchName: 'main' };

describe('usePromotionChanges', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(promotionsApi.getPromotableChanges).mockResolvedValue({
			commitSha: COMMIT_SHA,
			source: SOURCE,
			changes: mockChanges,
		});
	});

	it('should drop selections whose resource disappears after a refresh', async () => {
		const { fetchChanges, toggleSelected, selectedIds, selectedCount } =
			usePromotionChanges('project-1');
		await fetchChanges();
		toggleSelected('wf-001');
		toggleSelected('wf-002');
		expect(selectedCount.value).toBe(2);

		vi.mocked(promotionsApi.getPromotableChanges).mockResolvedValueOnce({
			commitSha: COMMIT_SHA,
			source: SOURCE,
			changes: mockChanges.filter((change) => change.id !== 'wf-001'),
		});
		await fetchChanges();

		expect(selectedIds.value).toEqual(new Set(['wf-002']));
		expect(selectedCount.value).toBe(1);
	});

	it('should request the given direction and keep the source the rows came from', async () => {
		const { fetchChanges, commitSha, source } = usePromotionChanges('project-1', 'apply');
		expect(commitSha.value).toBeNull();
		expect(source.value).toBeNull();

		await fetchChanges();

		expect(promotionsApi.getPromotableChanges).toHaveBeenCalledWith(
			restApiContext,
			'project-1',
			'apply',
		);
		expect(commitSha.value).toBe(COMMIT_SHA);
		expect(source.value).toEqual(SOURCE);
	});

	it('should handle fetch errors', async () => {
		vi.mocked(promotionsApi.getPromotableChanges).mockRejectedValue(new Error('Network error'));

		const { fetchChanges, error, isLoading } = usePromotionChanges('project-1');
		await fetchChanges();

		expect(error.value).toBeInstanceOf(Error);
		expect(error.value?.message).toBe('Network error');
		expect(isLoading.value).toBe(false);
	});

	it('should stamp the last refresh on success only', async () => {
		vi.useFakeTimers();
		try {
			const { fetchChanges, lastRefreshedAt } = usePromotionChanges('project-1');
			expect(lastRefreshedAt.value).toBeNull();

			await fetchChanges();
			const firstRefresh = lastRefreshedAt.value;
			expect(firstRefresh).not.toBeNull();

			vi.mocked(promotionsApi.getPromotableChanges).mockRejectedValueOnce(
				new Error('Network error'),
			);
			await fetchChanges();
			expect(lastRefreshedAt.value).toBe(firstRefresh);

			// Two stamps in the same millisecond would compare equal, so move the clock first.
			vi.advanceTimersByTime(60_000);
			await fetchChanges();
			expect(lastRefreshedAt.value).not.toBe(firstRefresh);
		} finally {
			vi.useRealTimers();
		}
	});

	it('should return null when submit is called with no selection', async () => {
		const { submitSelection } = usePromotionChanges('project-1');
		await expect(submitSelection()).resolves.toBeNull();
		expect(promotionsApi.promoteProjectSelection).not.toHaveBeenCalled();
	});

	it('should post selected workflow ids to the promote endpoint', async () => {
		vi.mocked(promotionsApi.promoteProjectSelection).mockResolvedValue({
			connectionId: 'c1',
			configId: 'cfg1',
			counts: {
				workflows: 1,
				folders: 0,
				credentials: 0,
				dataTables: 0,
				variables: 0,
				tags: 0,
			},
			git: { commitSha: 'a'.repeat(40), branchName: 'main' },
		});

		const { fetchChanges, toggleSelected, submitSelection } = usePromotionChanges('project-1');
		await fetchChanges();
		toggleSelected('wf-001');

		await submitSelection();

		expect(promotionsApi.promoteProjectSelection).toHaveBeenCalledWith(
			publicApiContext,
			'project-1',
			{
				workflowIds: ['wf-001'],
			},
		);
	});

	it('should select only the visible rows when a search filter is active', async () => {
		const {
			fetchChanges,
			searchQuery,
			filteredChanges,
			toggleSelectAll,
			selectedIds,
			allSelected,
		} = usePromotionChanges('project-1');
		await fetchChanges();

		searchQuery.value = 'Workflow A';
		expect(filteredChanges.value).toHaveLength(1);

		toggleSelectAll();

		expect(selectedIds.value.has('wf-001')).toBe(true);
		expect(selectedIds.value.has('wf-002')).toBe(false);
		expect(selectedIds.value.has('wf-003')).toBe(false);
		expect(selectedIds.value.has('wf-004')).toBe(false);
		expect(allSelected.value).toBe(true);
	});

	it('derives a renamed folder state from the workflows inside it', async () => {
		vi.mocked(promotionsApi.getPromotableChanges).mockResolvedValue({
			commitSha: COMMIT_SHA,
			source: SOURCE,
			changes: [
				{
					id: 'folder-1',
					name: 'Revenue',
					type: 'folder',
					status: 'renamed',
					version: null,
					updatedAt: null,
					updatedBy: null,
					dependencyCount: 0,
					changedDependencies: [],
					parentId: null,
				},
				{
					id: 'wf-a',
					name: 'Alpha',
					type: 'workflow',
					status: 'renamed',
					version: 2,
					updatedAt: null,
					updatedBy: null,
					dependencyCount: 0,
					changedDependencies: [],
					parentId: 'folder-1',
				},
				{
					id: 'wf-b',
					name: 'Beta',
					type: 'workflow',
					status: 'modified',
					version: 3,
					updatedAt: null,
					updatedBy: null,
					dependencyCount: 0,
					changedDependencies: [],
					parentId: 'folder-1',
				},
				{
					id: 'wf-c',
					name: 'Gamma',
					type: 'workflow',
					status: 'modified',
					version: 1,
					updatedAt: null,
					updatedBy: null,
					dependencyCount: 0,
					changedDependencies: [],
					parentId: null,
				},
			],
		});

		const {
			fetchChanges,
			toggleSelected,
			selectedIds,
			selectedCount,
			selectionState,
			searchQuery,
			filteredChanges,
			submitSelection,
		} = usePromotionChanges('project-1');
		await fetchChanges();

		// One workflow includes the folder rename. The other workflow stays out.
		toggleSelected('wf-a');
		expect(selectedIds.value).toEqual(new Set(['wf-a']));
		expect(selectionState('folder-1')).toBe('mixed');
		expect(selectedCount.value).toBe(2);

		toggleSelected('wf-b');
		expect(selectionState('folder-1')).toBe('checked');
		expect(selectedCount.value).toBe(3);

		// A child clears on its own, and the folder stays included while a workflow is left.
		toggleSelected('wf-a');
		expect(selectedIds.value).toEqual(new Set(['wf-b']));
		expect(selectionState('folder-1')).toBe('mixed');

		// A mixed folder selects everything inside it, and a full folder clears it.
		toggleSelected('folder-1');
		expect(selectedIds.value).toEqual(new Set(['wf-a', 'wf-b']));
		toggleSelected('folder-1');
		expect(selectedIds.value).toEqual(new Set());
		expect(selectionState('folder-1')).toBe('unchecked');
		expect(selectedCount.value).toBe(0);

		// A search keeps the folder above the match, and the folder acts on what is visible.
		searchQuery.value = 'Alpha';
		expect(filteredChanges.value.map((change) => change.id)).toEqual(['folder-1', 'wf-a']);
		toggleSelected('folder-1');
		expect(selectedIds.value).toEqual(new Set(['wf-a']));
		searchQuery.value = '';
		toggleSelected('wf-a');

		toggleSelected('wf-c');
		expect(selectedIds.value).toEqual(new Set(['wf-c']));
		expect(selectedCount.value).toBe(1);

		vi.mocked(promotionsApi.promoteProjectSelection).mockResolvedValue({
			connectionId: 'c1',
			configId: 'cfg1',
			counts: {
				workflows: 1,
				folders: 0,
				credentials: 0,
				dataTables: 0,
				variables: 0,
				tags: 0,
			},
			git: { commitSha: 'a'.repeat(40), branchName: 'main' },
		});
		await submitSelection();
		expect(promotionsApi.promoteProjectSelection).toHaveBeenCalledWith(
			publicApiContext,
			'project-1',
			{ workflowIds: ['wf-c'] },
		);
	});
});
