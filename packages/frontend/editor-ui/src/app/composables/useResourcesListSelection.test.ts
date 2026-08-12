import {
	DEFAULT_RESOURCE_SELECTION_LIMIT,
	useResourcesListSelection,
} from './useResourcesListSelection';

type TestResource = {
	resourceType: 'workflow';
	id: string;
};

const createResources = (count: number): TestResource[] =>
	Array.from({ length: count }, (_, index) => ({
		resourceType: 'workflow',
		id: String(index),
	}));

describe('useResourcesListSelection', () => {
	it('should select at most 100 resources by default', () => {
		const resources = createResources(DEFAULT_RESOURCE_SELECTION_LIMIT + 1);
		const selection = useResourcesListSelection<TestResource>();

		selection.togglePage(resources, true);

		expect(selection.selectedCount.value).toBe(DEFAULT_RESOURCE_SELECTION_LIMIT);
		expect(selection.isLimitReached.value).toBe(true);
		expect(selection.canSelect(resources[DEFAULT_RESOURCE_SELECTION_LIMIT])).toBe(false);
	});

	it('should allow selected resources to be deselected at the limit', () => {
		const resources = createResources(3);
		const selection = useResourcesListSelection<TestResource>({ maxSelected: 2 });
		selection.togglePage(resources, true);

		selection.toggleItem(resources[0], false);
		selection.toggleItem(resources[2], true);

		expect(selection.selectedItems.value).toEqual([resources[1], resources[2]]);
	});

	it('should apply item weights to the selected count and limit', () => {
		const resources = createResources(3);
		const selection = useResourcesListSelection<TestResource>({
			maxSelected: 5,
			getItemWeight: (item) => (item.id === '0' ? 4 : 2),
		});

		selection.togglePage(resources, true);

		expect(selection.selectedItems.value).toEqual([resources[0]]);
		expect(selection.selectedCount.value).toBe(4);
		expect(selection.canSelect(resources[1])).toBe(false);
	});
});
