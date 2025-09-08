import { createComponentRenderer } from '@/__tests__/render';
import { fireEvent, screen } from '@testing-library/vue';
import ResourceLocatorDropdown from './ResourceLocatorDropdown.vue';
import type { INodeParameterResourceLocator } from 'n8n-workflow';
import type { IResourceLocatorResultExpanded } from '@/Interface';

const mockResources: IResourceLocatorResultExpanded[] = [
	{
		name: 'Workflow 1',
		value: 'workflow-1',
		url: '/workflow/workflow-1',
	},
	{
		name: 'Workflow 2',
		value: 'workflow-2',
		url: '/workflow/workflow-2',
	},
];

const mockModelValue: INodeParameterResourceLocator = {
	__rl: true,
	value: 'workflow-1',
	mode: 'list',
	cachedResultName: 'Workflow 1',
	cachedResultUrl: '/workflow/workflow-1',
};

const renderComponent = createComponentRenderer(ResourceLocatorDropdown, {
	props: {
		show: true,
		resources: mockResources,
		modelValue: mockModelValue,
	},
});

describe('ResourceLocatorDropdown', () => {
	describe('cached result display', () => {
		it('should show cached result when selected item is not in resources list', async () => {
			const cachedModelValue: INodeParameterResourceLocator = {
				__rl: true,
				value: 'workflow-cached',
				mode: 'list',
				cachedResultName: 'Cached Workflow',
				cachedResultUrl: '/workflow/workflow-cached',
			};

			renderComponent({
				props: {
					show: true,
					resources: mockResources, // doesn't contain workflow-cached
					modelValue: cachedModelValue,
				},
			});

			expect(screen.getByText('Cached Workflow')).toBeInTheDocument();

			// Find the cached workflow item and hover to show the link icon
			const cachedItem = screen.getByText('Cached Workflow').closest('[data-test-id="rlc-item"]');
			expect(cachedItem).toBeInTheDocument();

			if (cachedItem) {
				await fireEvent.mouseEnter(cachedItem);

				// Wait for the hover timeout (250ms) before checking for the icon
				await new Promise((resolve) => setTimeout(resolve, 300));

				// Verify the external link icon is present after hover
				const linkIcon = cachedItem.querySelector('svg[data-icon="external-link"]');
				expect(linkIcon).toBeInTheDocument();
			}
		});

		it('should prioritize actual resource over cached when both exist', () => {
			const modelValue: INodeParameterResourceLocator = {
				__rl: true,
				value: 'workflow-1',
				mode: 'list',
				cachedResultName: 'Cached Name',
				cachedResultUrl: '/cached-url',
			};

			renderComponent({
				props: {
					show: true,
					resources: mockResources,
					modelValue,
				},
			});

			// Should show the actual resource name, not cached
			expect(screen.getByText('Workflow 1')).toBeInTheDocument();
			expect(screen.queryByText('Cached Name')).not.toBeInTheDocument();
		});
	});

	describe('model value handling', () => {
		it('should compare values correctly for selection highlighting', () => {
			const modelValue: INodeParameterResourceLocator = {
				__rl: true,
				value: 'workflow-2',
				mode: 'list',
			};

			renderComponent({
				props: {
					show: true,
					resources: mockResources,
					modelValue,
				},
			});

			// Find the item containing "Workflow 2" and check that it's selected
			const selectedItem = screen.getByText('Workflow 2').closest('[data-test-id="rlc-item"]');
			expect(selectedItem).toHaveClass('selected');

			// Find the item containing "Workflow 1" and check that it's not selected
			const unselectedItem = screen.getByText('Workflow 1').closest('[data-test-id="rlc-item"]');
			expect(unselectedItem).not.toHaveClass('selected');
		});
	});

	describe('filtering behavior', () => {
		it('should emit filter event when filter input changes', async () => {
			const wrapper = renderComponent({
				props: {
					show: true,
					resources: mockResources,
					filterable: true,
				},
			});

			const filterInput = screen.getByTestId('rlc-search');
			await fireEvent.update(filterInput, 'test search');

			expect(wrapper.emitted().filter).toEqual([['test search']]);
		});
	});

	describe('resource selection', () => {
		it('should emit update:modelValue with correct value when resource is clicked', async () => {
			const wrapper = renderComponent({
				props: {
					show: true,
					resources: mockResources,
				},
			});

			const secondItem = screen.getByText('Workflow 2').closest('[data-test-id="rlc-item"]');
			if (secondItem) {
				await fireEvent.click(secondItem);
			}

			expect(wrapper.emitted()['update:modelValue']).toEqual([['workflow-2']]);
		});
	});
});
