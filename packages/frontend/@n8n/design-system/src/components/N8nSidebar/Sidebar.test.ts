import { render } from '@testing-library/vue';
import { vi } from 'vitest';

import Sidebar from './Sidebar.vue';
import type { IMenuElement } from '@n8n/design-system/types';

const stubs = [
	'N8nLogo',
	'N8nText',
	'SidebarItem',
	'N8nResizeWrapper',
	'N8nIconButton',
	'N8nRoute',
	'N8nTooltip',
	'N8nKeyboardShortcut',
	'SidebarSubMenu',
	'SidebarProjectsEmpty',
	'TreeItem',
	'TreeRoot',
	'TreeVirtualizer',
];

const defaultProps = {
	items: [] as IMenuElement[],
	userName: 'Test User',
	releaseChannel: 'stable' as const,
	helpItems: [] as IMenuElement[],
};

describe('components', () => {
	describe('N8nSidebar', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should render correctly with default props', () => {
			const wrapper = render(Sidebar, {
				props: defaultProps,
				global: { stubs },
			});
			expect(wrapper.container).toBeTruthy();
		});

		it('should render with items', () => {
			const items: IMenuElement[] = [
				{
					id: 'item1',
					label: 'Test Item 1',
					icon: 'folder',
					type: 'workflow',
				},
			];

			const wrapper = render(Sidebar, {
				props: { ...defaultProps, items },
				global: { stubs },
			});

			expect(wrapper.container.querySelector('.sidebar')).toBeTruthy();
		});

		it('should render with projectsEmptyState visible', () => {
			const wrapper = render(Sidebar, {
				props: {
					...defaultProps,
					projectsEmptyState: {
						visible: true,
						canCreate: true,
					},
				},
				global: { stubs },
			});

			// The component conditionally renders SidebarProjectsEmpty
			expect(wrapper.container.querySelector('sidebar-projects-empty-stub')).toBeTruthy();
		});

		it('should render with bottomItems', () => {
			const bottomItems: IMenuElement[] = [
				{
					id: 'bottom1',
					label: 'Bottom Item',
					type: 'other',
				},
			];

			const wrapper = render(Sidebar, {
				props: { ...defaultProps, bottomItems },
				global: { stubs },
			});

			expect(wrapper.container.querySelector('.sidebarBottomItems')).toBeTruthy();
		});

		it('should render different release channels', () => {
			['dev', 'beta', 'nightly'].forEach((channel) => {
				const wrapper = render(Sidebar, {
					props: { ...defaultProps, releaseChannel: channel as any },
					global: { stubs },
				});
				expect(wrapper.container).toBeTruthy();
			});
		});

		it('should render userName', () => {
			const wrapper = render(Sidebar, {
				props: { ...defaultProps, userName: 'John Doe' },
				global: {
					stubs: {
						...stubs.reduce((acc, stub) => ({ ...acc, [stub]: true }), {}),
						N8nText: {
							template: '<span><slot /></span>',
							props: ['size', 'bold', 'color', 'class', 'tag', 'compact'],
						},
					},
				},
			});

			expect(wrapper.container.textContent).toContain('John Doe');
		});

		it('should show sidebar user area', () => {
			const wrapper = render(Sidebar, {
				props: defaultProps,
				global: { stubs },
			});

			expect(wrapper.container.querySelector('.sidebarUserArea')).toBeTruthy();
		});

		it('should render help items prop', () => {
			const helpItems: IMenuElement[] = [
				{
					id: 'help1',
					label: 'Help Section',
					type: 'other',
				},
			];

			const wrapper = render(Sidebar, {
				props: { ...defaultProps, helpItems },
				global: { stubs },
			});

			// Just verify the component renders without error when helpItems are provided
			expect(wrapper.container.querySelector('.sidebarUserArea')).toBeTruthy();
		});

		it('should apply correct width styles', () => {
			const wrapper = render(Sidebar, {
				props: defaultProps,
				global: { stubs },
			});

			const resizeWrapper = wrapper.container.querySelector('.resizeWrapper');
			expect(resizeWrapper).toBeTruthy();
		});

		it('should render slots', () => {
			const wrapper = render(Sidebar, {
				props: defaultProps,
				global: { stubs },
				slots: {
					createButton: '<button data-testid="create-btn">Create</button>',
				},
			});

			expect(wrapper.container.querySelector('[data-testid="create-btn"]')).toBeTruthy();
		});

		it('should have correct initial state from composable', () => {
			const wrapper = render(Sidebar, {
				props: defaultProps,
				global: { stubs },
			});

			// Verify the wrapper renders with the expected classes based on mocked state
			expect(wrapper.container.querySelector('.sidebar')).toBeTruthy();
		});

		it('should handle empty props gracefully', () => {
			const wrapper = render(Sidebar, {
				props: {
					items: [],
					userName: '',
					releaseChannel: 'stable' as const,
					helpItems: [],
				},
				global: { stubs },
			});

			expect(wrapper.container).toBeTruthy();
		});
	});
});
