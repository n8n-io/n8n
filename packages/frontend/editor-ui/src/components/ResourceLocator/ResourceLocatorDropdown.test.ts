import { createComponentRenderer } from '@/__tests__/render';
import { fireEvent, screen } from '@testing-library/vue';
import { vi } from 'vitest';
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
	beforeEach(() => {
		vi.useRealTimers();
	});

	describe('cached result display', () => {
		it('should show cached result when selected item is not in resources list', async () => {
			vi.useFakeTimers();

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

				// Fast-forward time by 250ms to trigger the hover timeout
				await vi.advanceTimersByTimeAsync(250);

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

	describe('pagination', () => {
		it('should trigger onResultsEnd handler when scrolling to bottom with pagination', async () => {
			// Generate multiple pages of mock data (enough to require scrolling)
			const manyResources: IResourceLocatorResultExpanded[] = Array.from(
				{ length: 50 },
				(_, i) => ({
					name: `Workflow ${i + 1}`,
					value: `workflow-${i + 1}`,
					url: `/workflow/workflow-${i + 1}`,
				}),
			);

			const wrapper = renderComponent({
				props: {
					show: true,
					resources: manyResources,
					hasMore: true, // Indicates there are more items to load
					loading: false,
				},
			});

			const resultsContainer = screen
				.getByTestId('resource-locator-dropdown')
				.querySelector('[class*="container"]') as HTMLDivElement;
			expect(resultsContainer).toBeInTheDocument();

			// Mock scroll to bottom - simulate scrolling to the end
			Object.defineProperty(resultsContainer, 'scrollTop', {
				writable: true,
				value: resultsContainer.scrollHeight - resultsContainer.offsetHeight,
			});

			// Trigger scroll event
			await fireEvent.scroll(resultsContainer);

			// Verify loadMore event was emitted
			expect(wrapper.emitted().loadMore).toHaveLength(1);
		});

		it('should not trigger loadMore when already loading', async () => {
			const wrapper = renderComponent({
				props: {
					show: true,
					resources: [],
					hasMore: true,
					loading: true, // Currently loading
				},
			});

			const resultsContainer = screen
				.getByTestId('resource-locator-dropdown')
				.querySelector('[class*="container"]') as HTMLDivElement;

			// Mock scroll to bottom
			Object.defineProperty(resultsContainer, 'scrollTop', {
				writable: true,
				value: resultsContainer.scrollHeight - resultsContainer.offsetHeight,
			});

			await fireEvent.scroll(resultsContainer);

			// Should not emit loadMore when loading
			expect(wrapper.emitted().loadMore).toBeUndefined();
		});

		it('should not trigger loadMore when no more items available', async () => {
			const wrapper = renderComponent({
				props: {
					show: true,
					resources: [],
					hasMore: false, // No more items to load
					loading: false,
				},
			});

			const resultsContainer = screen
				.getByTestId('resource-locator-dropdown')
				.querySelector('[class*="container"]') as HTMLDivElement;

			// Mock scroll to bottom
			Object.defineProperty(resultsContainer, 'scrollTop', {
				writable: true,
				value: resultsContainer.scrollHeight - resultsContainer.offsetHeight,
			});

			await fireEvent.scroll(resultsContainer);

			// Should not emit loadMore when hasMore is false
			expect(wrapper.emitted().loadMore).toBeUndefined();
		});
	});
});
