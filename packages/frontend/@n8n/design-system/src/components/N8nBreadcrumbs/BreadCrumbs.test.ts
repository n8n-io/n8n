import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/vue';
import { defineComponent } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';

import Breadcrumbs from '.';
import type { PathItem } from './Breadcrumbs.vue';

// Simple mock for the N8nActionToggle component to test hidden items and events
const N8nActionToggleMock = defineComponent({
	name: 'N8nActionToggle',
	props: {
		actions: {
			type: Array as () => Array<{ value: string; label: string }>,
			required: true,
		},
		loading: {
			type: Boolean,
			default: false,
		},
	},
	emits: ['visible-change', 'action'],
	data() {
		return {
			showContent: false,
		};
	},
	methods: {
		handleClick() {
			this.showContent = !this.showContent;
			this.$emit('visible-change', this.showContent);
		},
	},
	template: `
    <div data-test-id="action-toggle-mock" class="mock-action-toggle">
      <button
        data-test-id="mock-dropdown-button"
        @click="handleClick"
      >
        Toggle Dropdown
      </button>
      <div class="dropdown-content" v-if="showContent">
        <div v-if="loading" data-test-id="loading-state">
          Loading...
        </div>
        <template v-else>
          <div
            v-for="action in actions"
            :key="action.value"
            :data-test-id="'action-' + action.value"
            class="dropdown-item"
            @click="$emit('action', action.value)"
          >
            {{ action.label }}
          </div>
        </template>
      </div>
    </div>
  `,
});

const router = createRouter({
	history: createWebHistory(),
	routes: [{ path: '/', component: { template: '<div>Home</div>' } }],
});

describe('Breadcrumbs', async () => {
	it('renders default version correctly', () => {
		const wrapper = render(Breadcrumbs, {
			props: {
				items: [
					{ id: '1', label: 'Folder 1', href: '/folder1' },
					{ id: '2', label: 'Folder 2', href: '/folder2' },
					{ id: '3', label: 'Folder 3', href: '/folder3' },
					{ id: '4', label: 'Current' },
				],
			},
			global: {
				plugins: [router],
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('renders small version correctly', () => {
		const wrapper = render(Breadcrumbs, {
			props: {
				items: [
					{ id: '1', label: 'Folder 1', href: '/folder1' },
					{ id: '2', label: 'Folder 2', href: '/folder2' },
					{ id: '3', label: 'Folder 3', href: '/folder3' },
					{ id: '4', label: 'Current' },
				],
				theme: 'small',
			},
			global: {
				plugins: [router],
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('renders custom separator correctly', () => {
		const wrapper = render(Breadcrumbs, {
			props: {
				items: [
					{ id: '1', label: 'Folder 1', href: '/folder1' },
					{ id: '2', label: 'Folder 2', href: '/folder2' },
					{ id: '3', label: 'Folder 3', href: '/folder3' },
					{ id: '4', label: 'Current' },
				],
				separator: '➮',
			},
			global: {
				plugins: [router],
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('renders slots correctly', () => {
		const wrapper = render(Breadcrumbs, {
			props: {
				items: [
					{ id: '1', label: 'Folder 1', href: '/folder1' },
					{ id: '2', label: 'Folder 2', href: '/folder2' },
					{ id: '3', label: 'Folder 3', href: '/folder3' },
					{ id: '4', label: 'Current' },
				],
			},
			global: {
				plugins: [router],
			},
			slots: {
				prepend: '<div>[PRE] Custom content</div>',
				append: '<div>[POST] Custom content</div>',
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('renders ellipsis when for "pathTruncated = true"', () => {
		const { getByTestId } = render(Breadcrumbs, {
			props: {
				items: [
					{ id: '1', label: 'Folder 1', href: '/folder1' },
					{ id: '2', label: 'Folder 2', href: '/folder2' },
					{ id: '3', label: 'Folder 3', href: '/folder3' },
					{ id: '4', label: 'Current' },
				],
				pathTruncated: true,
			},
			global: {
				plugins: [router],
			},
		});
		expect(getByTestId('ellipsis')).toBeTruthy();
		expect(getByTestId('hidden-items-menu')).toBeTruthy();
		expect(getByTestId('ellipsis')).toHaveClass('disabled');
		expect(getByTestId('hidden-items-menu').querySelector('.el-dropdown')).toHaveClass(
			'is-disabled',
		);
	});

	it('does not highlight last item for "highlightLastItem = false" ', () => {
		const wrapper = render(Breadcrumbs, {
			props: {
				items: [
					{ id: '1', label: 'Folder 1', href: '/folder1' },
					{ id: '2', label: 'Folder 2', href: '/folder2' },
					{ id: '3', label: 'Folder 3', href: '/folder3' },
					{ id: '4', label: 'Current' },
				],
				highlightLastItem: false,
			},
			global: {
				plugins: [router],
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('renders hidden items correctly', async () => {
		const hiddenItems = [
			{ id: '3', label: 'Parent 1', href: '/hidden1' },
			{ id: '4', label: 'Parent 2', href: '/hidden2' },
		];

		const { container, getByTestId, queryByTestId } = render(Breadcrumbs, {
			props: {
				items: [
					{ id: '1', label: 'Folder 1', href: '/folder1' },
					{ id: '2', label: 'Folder 2', href: '/folder2' },
					{ id: '3', label: 'Folder 3', href: '/folder3' },
					{ id: '4', label: 'Current' },
				],
				hiddenItems,
			},
			global: {
				stubs: {
					N8nActionToggle: N8nActionToggleMock,
				},
				plugins: [router],
			},
		});
		await userEvent.click(getByTestId('mock-dropdown-button'));
		// Should not show the loading state
		expect(queryByTestId('loading-state')).toBeFalsy();
		const dropdownItems = container.querySelectorAll('.dropdown-item');

		// Check if the number of rendered items matches the hidden items
		expect(dropdownItems.length).toBe(hiddenItems.length);
		hiddenItems.forEach((item, index) => {
			const dropdownItem = dropdownItems[index];
			expect(dropdownItem).toBeTruthy();
			expect(dropdownItem.textContent?.trim()).toBe(item.label);
			expect(dropdownItem.getAttribute('data-test-id')).toBe(`action-${item.id}`);
		});
	});

	it('renders async hidden items correctly', async () => {
		const FETCH_TIMEOUT = 1000;
		const hiddenItems = [
			{ id: 'home', label: 'Home' },
			{ id: 'projects', label: 'Projects' },
			{ id: 'folder1', label: 'Folder 1' },
		];
		const fetchHiddenItems = async (): Promise<PathItem[]> => {
			await new Promise((resolve) => setTimeout(resolve, FETCH_TIMEOUT));
			return hiddenItems;
		};
		const hiddenItemsPromise = fetchHiddenItems();
		const { container, getByTestId, queryByTestId } = render(Breadcrumbs, {
			props: {
				items: [
					{ id: '1', label: 'Folder 1', href: '/folder1' },
					{ id: '2', label: 'Folder 2', href: '/folder2' },
					{ id: '3', label: 'Folder 3', href: '/folder3' },
					{ id: '4', label: 'Current' },
				],
				hiddenItems: hiddenItemsPromise,
			},
			global: {
				stubs: {
					N8nActionToggle: N8nActionToggleMock,
				},
				plugins: [router],
			},
		});
		await userEvent.click(getByTestId('mock-dropdown-button'));
		// Should show loading state at first
		expect(container.querySelector('.dropdown-item')).toBeFalsy();
		expect(getByTestId('loading-state')).toBeTruthy();
		// Wait for the hidden items to be fetched
		await new Promise((resolve) => setTimeout(resolve, FETCH_TIMEOUT));
		// Should not show the loading state
		expect(queryByTestId('loading-state')).toBeFalsy();
		const dropdownItems = container.querySelectorAll('.dropdown-item');
		// Check if the number of rendered items matches the hidden items
		expect(dropdownItems.length).toBe(hiddenItems.length);
		hiddenItems.forEach((item, index) => {
			const dropdownItem = dropdownItems[index];
			expect(dropdownItem).toBeTruthy();
			expect(dropdownItem.textContent?.trim()).toBe(item.label);
			expect(dropdownItem.getAttribute('data-test-id')).toBe(`action-${item.id}`);
		});
	});

	it('emits event when item is clicked', async () => {
		const items = [
			{ id: '1', label: 'Folder 1', href: '/folder1' },
			{ id: '2', label: 'Folder 2', href: '/folder2' },
			{ id: '3', label: 'Folder 3', href: '/folder3' },
			{ id: '4', label: 'Current' },
		];
		const hiddenItems = [
			{ id: '5', label: 'Parent 1', href: '/hidden1' },
			{ id: '6', label: 'Parent 2', href: '/hidden2' },
		];

		const { container, emitted, getByTestId, getAllByTestId } = render(Breadcrumbs, {
			props: {
				items,
				hiddenItems,
			},
			global: {
				stubs: {
					N8nActionToggle: N8nActionToggleMock,
				},
				plugins: [router],
			},
		});
		const visibleItems = getAllByTestId('breadcrumbs-item');
		await userEvent.click(visibleItems[0]);
		expect(emitted()).toHaveProperty('itemSelected');
		expect(emitted().itemSelected[0]).toEqual([items[0]]);
		// Click on the hidden item, should fire the same event
		await userEvent.click(getByTestId('mock-dropdown-button'));
		const dropdownItems = container.querySelectorAll('.dropdown-item');
		await userEvent.click(dropdownItems[0]);
		expect(emitted()).toHaveProperty('itemSelected');
		expect(emitted().itemSelected[1]).toEqual([hiddenItems[0]]);
	});

	it('emits tooltipOpened and tooltipClosed events', async () => {
		const { emitted, getByTestId } = render(Breadcrumbs, {
			props: {
				items: [
					{ id: '1', label: 'Folder 1', href: '/folder1' },
					{ id: '2', label: 'Folder 2', href: '/folder2' },
					{ id: '3', label: 'Folder 3', href: '/folder3' },
					{ id: '4', label: 'Current' },
				],
				hiddenItems: [
					{ id: '3', label: 'Parent 1', href: '/hidden1' },
					{ id: '4', label: 'Parent 2', href: '/hidden2' },
				],
			},
			global: {
				stubs: {
					N8nActionToggle: N8nActionToggleMock,
				},
				plugins: [router],
			},
		});
		await userEvent.click(getByTestId('mock-dropdown-button'));
		expect(emitted()).toHaveProperty('tooltipOpened');
		// close the tooltip
		await userEvent.click(getByTestId('mock-dropdown-button'));
		expect(emitted()).toHaveProperty('tooltipClosed');
	});
});
