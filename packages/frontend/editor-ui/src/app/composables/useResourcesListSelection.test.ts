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

	it('should select every item on a page within the default limit', () => {
		const resources = createResources(3);
		const selection = useResourcesListSelection<TestResource>();

		selection.togglePage(resources, true);

		expect(selection.selectedCount.value).toBe(3);
		expect(selection.isPageChecked(resources)).toBe(true);
	});

	it('should select the first items in projection order up to the maximum', () => {
		const selection = useResourcesListSelection<TestResource>({ maxSelected: 2 });
		const resources = createResources(4);

		selection.togglePage(resources, true);

		expect(selection.selectedItems.value.map(({ id }) => id)).toEqual(['0', '1']);
		expect(selection.isLimitReached.value).toBe(true);
		// With fewer slots than page items, the page is partially - not fully - selected.
		expect(selection.isPageChecked(resources)).toBe(false);
		expect(selection.isPageIndeterminate(resources)).toBe(true);
	});

	it('should report indeterminate state below the page target', () => {
		const selection = useResourcesListSelection<TestResource>({ maxSelected: 2 });
		const resources = createResources(4);

		selection.toggleItem(resources[0], true);

		expect(selection.isPageChecked(resources)).toBe(false);
		expect(selection.isPageIndeterminate(resources)).toBe(true);
	});

	it('should block additional items at the maximum but allow deselection', () => {
		const selection = useResourcesListSelection<TestResource>({ maxSelected: 2 });
		const resources = createResources(3);
		selection.togglePage(resources, true);

		expect(selection.canSelect(resources[2])).toBe(false);
		expect(selection.toggleItem(resources[2], true)).toBe(false);
		expect(selection.toggleItem(resources[0], false)).toBe(true);
		expect(selection.canSelect(resources[2])).toBe(true);
		expect(selection.selectedCount.value).toBe(1);
	});

	it('should clear selected items from the provided projection', () => {
		const selection = useResourcesListSelection<TestResource>({ maxSelected: 2 });
		const resources = createResources(3);
		selection.togglePage(resources, true);

		selection.togglePage(resources, false);

		expect(selection.selectedCount.value).toBe(0);
		expect(selection.isLimitReached.value).toBe(false);
	});
});
