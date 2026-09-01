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
];

describe('usePromotionChanges', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(promotionsApi.getPromotableChanges).mockResolvedValue(mockChanges);
		vi.mocked(promotionsApi.promoteChanges).mockResolvedValue({ branchName: 'promote/test' });
	});

	it('should fetch changes on request', async () => {
		const { changes, fetchChanges, isLoading } = usePromotionChanges('project-1');
		expect(changes.value).toEqual([]);

		await fetchChanges();

		expect(changes.value).toEqual(mockChanges);
		expect(isLoading.value).toBe(false);
	});

	it('should toggle individual selection', async () => {
		const { fetchChanges, toggleSelected, selectedIds, selectedCount } =
			usePromotionChanges('project-1');
		await fetchChanges();

		toggleSelected('wf-001');
		expect(selectedIds.value.has('wf-001')).toBe(true);
		expect(selectedCount.value).toBe(1);

		toggleSelected('wf-002');
		expect(selectedCount.value).toBe(2);

		toggleSelected('wf-001');
		expect(selectedIds.value.has('wf-001')).toBe(false);
		expect(selectedCount.value).toBe(1);
	});

	it('should select all and deselect all', async () => {
		const { fetchChanges, toggleSelectAll, allSelected, someSelected, selectedCount } =
			usePromotionChanges('project-1');
		await fetchChanges();

		toggleSelectAll();
		expect(allSelected.value).toBe(true);
		expect(someSelected.value).toBe(false);
		expect(selectedCount.value).toBe(3);

		toggleSelectAll();
		expect(allSelected.value).toBe(false);
		expect(selectedCount.value).toBe(0);
	});

	it('should report indeterminate state correctly', async () => {
		const { fetchChanges, toggleSelected, someSelected, allSelected } =
			usePromotionChanges('project-1');
		await fetchChanges();

		toggleSelected('wf-001');
		expect(someSelected.value).toBe(true);
		expect(allSelected.value).toBe(false);
	});

	it('should call promote with correct parameters', async () => {
		const { fetchChanges, toggleSelected, promote } = usePromotionChanges('project-1');
		await fetchChanges();

		toggleSelected('wf-001');
		toggleSelected('wf-003');

		await promote(true);

		expect(promotionsApi.promoteChanges).toHaveBeenCalledWith({}, 'project-1', {
			workflowIds: expect.arrayContaining(['wf-001', 'wf-003']),
			createBranch: true,
		});
	});

	it('should handle fetch errors', async () => {
		vi.mocked(promotionsApi.getPromotableChanges).mockRejectedValue(new Error('Network error'));

		const { fetchChanges, error, isLoading } = usePromotionChanges('project-1');
		await fetchChanges();

		expect(error.value).toBeInstanceOf(Error);
		expect(error.value?.message).toBe('Network error');
		expect(isLoading.value).toBe(false);
	});
});
