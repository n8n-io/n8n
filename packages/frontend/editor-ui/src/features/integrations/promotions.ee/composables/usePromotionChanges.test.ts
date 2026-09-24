import { vi, describe, it, expect, beforeEach } from 'vitest';
import { usePromotionChanges } from './usePromotionChanges';
import * as promotionsApi from '../promotions.api';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
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
	},
];

const COMMIT_SHA = 'a'.repeat(40);

describe('usePromotionChanges', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(promotionsApi.getPromotableChanges).mockResolvedValue({
			commitSha: COMMIT_SHA,
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
			changes: mockChanges.filter((change) => change.id !== 'wf-001'),
		});
		await fetchChanges();

		expect(selectedIds.value).toEqual(new Set(['wf-002']));
		expect(selectedCount.value).toBe(1);
	});

	it('should request the given direction and keep the commit the rows came from', async () => {
		const { fetchChanges, commitSha } = usePromotionChanges('project-1', 'apply');
		expect(commitSha.value).toBeNull();

		await fetchChanges();

		expect(promotionsApi.getPromotableChanges).toHaveBeenCalledWith({}, 'project-1', 'apply');
		expect(commitSha.value).toBe(COMMIT_SHA);
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
});
