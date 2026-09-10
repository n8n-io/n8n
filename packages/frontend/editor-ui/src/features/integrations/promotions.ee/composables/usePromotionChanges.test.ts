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

describe('usePromotionChanges', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(promotionsApi.getPromotableChanges).mockResolvedValue(mockChanges);
	});

	it('should handle fetch errors', async () => {
		vi.mocked(promotionsApi.getPromotableChanges).mockRejectedValue(new Error('Network error'));

		const { fetchChanges, error, isLoading } = usePromotionChanges('project-1');
		await fetchChanges();

		expect(error.value).toBeInstanceOf(Error);
		expect(error.value?.message).toBe('Network error');
		expect(isLoading.value).toBe(false);
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
