import { computed, defineComponent, ref } from 'vue';
import { createRouter, createMemoryHistory } from 'vue-router';
import { fireEvent, waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';
import AppNavigation from './AppNavigation.vue';
import type { AppNavRailItem, AppNavSection } from './useAppNavigation';
import { PEEK_CLOSE_DELAY, PEEK_OPEN_DELAY } from './useNavigationPeek';

const activeItemId = ref('overview');

const railItems: AppNavRailItem[] = [
	{
		id: 'overview',
		label: 'Overview',
		icon: { type: 'icon', value: 'house' },
		to: '/overview',
		group: 'main',
		testId: 'app-nav-overview',
	},
	{
		id: 'project:p1',
		label: 'Marketing',
		icon: { type: 'icon', value: 'layers' },
		to: '/projects/p1',
		group: 'project',
		testId: 'app-nav-project',
	},
];

const sectionsFor = (itemId: string | null | undefined): AppNavSection[] =>
	itemId
		? [
				{
					id: `${itemId}-pages`,
					links: [
						{
							id: `${itemId}-workflows`,
							label: `${itemId} workflows`,
							icon: 'workflow',
							to: '/workflows',
							active: false,
						},
					],
				},
			]
		: [];

vi.mock('./useAppNavigation', async (importOriginal) => ({
	...(await importOriginal<typeof import('./useAppNavigation')>()),
	useAppNavigation: () => ({
		railItems: computed(() => railItems),
		activeItemId: computed(() => activeItemId.value),
		sectionsFor,
		railItemById: (id: string | null | undefined) => railItems.find((item) => item.id === id),
	}),
}));

vi.mock('@/features/ai/instanceAi/composables/useInstanceAiAvailability', () => ({
	useInstanceAiAvailable: () => ref(false),
}));

const Empty = defineComponent({ template: '<div />' });

const renderComponent = createComponentRenderer(AppNavigation, {
	global: {
		stubs: {
			MainSidebarAccountMenu: { template: '<div data-test-id="account-menu" />' },
			ProjectIcon: {
				props: ['icon'],
				template: '<span data-test-id="rail-icon" :data-icon="icon.value" />',
			},
		},
	},
});

function setup({ collapsed }: { collapsed: boolean }) {
	createTestingPinia();
	const uiStore = mockedStore(useUIStore);
	uiStore.sidebarMenuCollapsed = collapsed;
	uiStore.toggleSidebarMenuCollapse = vi.fn(() => {
		uiStore.sidebarMenuCollapsed = !uiStore.sidebarMenuCollapsed;
	});

	const router = createRouter({
		history: createMemoryHistory(),
		routes: ['/', '/overview', '/projects/p1', '/workflows'].map((path) => ({
			path,
			component: Empty,
		})),
	});

	const result = renderComponent({ global: { plugins: [router] } });
	return { ...result, uiStore, router };
}

const panelTitle = (el: HTMLElement) => el.querySelector('h2')?.textContent?.trim();

describe('AppNavigation', () => {
	beforeEach(() => {
		activeItemId.value = 'overview';
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('shows the rail items with a divider before the projects, and the account menu', () => {
		const { getByTestId, getByRole } = setup({ collapsed: false });

		expect(getByTestId('app-nav-overview')).toHaveAttribute('aria-current', 'page');
		expect(getByTestId('app-nav-project')).not.toHaveAttribute('aria-current');
		expect(getByRole('separator')).toBeInTheDocument();
		expect(getByTestId('account-menu')).toBeInTheDocument();
	});

	it('shows the solid icon of the active item, and the outline icon of the others', async () => {
		const { getByTestId, getAllByTestId } = setup({ collapsed: false });
		const icons = () => getAllByTestId('rail-icon').map((icon) => icon.dataset.icon);

		expect(icons()).toEqual(['house-filled', 'layers']);

		activeItemId.value = 'project:p1';
		await waitFor(() => expect(icons()).toEqual(['house', 'layers-filled']));
		expect(getByTestId('app-nav-project')).toHaveAttribute('aria-current', 'page');
	});

	describe('expanded', () => {
		it('docks the panel of the active item in the layout', () => {
			const { getByTestId, queryByTestId } = setup({ collapsed: false });

			expect(panelTitle(getByTestId('app-nav-panel'))).toBe('Overview');
			expect(getByTestId('app-nav-panel')).toHaveTextContent('overview workflows');
			expect(queryByTestId('app-nav-floating')).not.toBeInTheDocument();
		});

		it('opens no floating panel on hover', async () => {
			vi.useFakeTimers();
			const { getByTestId, queryByTestId } = setup({ collapsed: false });

			await fireEvent.mouseEnter(getByTestId('app-nav-project'));
			vi.advanceTimersByTime(PEEK_OPEN_DELAY * 2);

			expect(queryByTestId('app-nav-floating')).not.toBeInTheDocument();
			expect(panelTitle(getByTestId('app-nav-panel'))).toBe('Overview');
		});

		it('collapses with the panel toggle', async () => {
			const { getByTestId, queryByTestId, uiStore } = setup({ collapsed: false });

			await fireEvent.click(getByTestId('app-nav-toggle'));

			expect(uiStore.toggleSidebarMenuCollapse).toHaveBeenCalledTimes(1);
			expect(queryByTestId('app-nav-panel')).not.toBeInTheDocument();
		});

		it('follows the route when the active item changes', async () => {
			const { getByTestId } = setup({ collapsed: false });

			activeItemId.value = 'project:p1';

			await waitFor(() => expect(panelTitle(getByTestId('app-nav-panel'))).toBe('Marketing'));
		});
	});

	describe('collapsed', () => {
		it('shows only the rail', () => {
			const { queryByTestId } = setup({ collapsed: true });

			expect(queryByTestId('app-nav-panel')).not.toBeInTheDocument();
		});

		it('floats the panel of a hovered item after a short delay', async () => {
			vi.useFakeTimers();
			const { getByTestId, queryByTestId } = setup({ collapsed: true });

			await fireEvent.mouseEnter(getByTestId('app-nav-project'));
			vi.advanceTimersByTime(PEEK_OPEN_DELAY - 1);
			await Promise.resolve();
			expect(queryByTestId('app-nav-floating')).not.toBeInTheDocument();

			vi.advanceTimersByTime(1);
			await waitFor(() => expect(queryByTestId('app-nav-floating')).toBeInTheDocument());
			expect(panelTitle(getByTestId('app-nav-floating'))).toBe('Marketing');
		});

		it('keeps the panel open while the pointer moves into it, and closes it after leaving', async () => {
			vi.useFakeTimers();
			const { getByTestId, queryByTestId } = setup({ collapsed: true });
			await fireEvent.mouseEnter(getByTestId('app-nav-project'));
			vi.advanceTimersByTime(PEEK_OPEN_DELAY);
			await waitFor(() => expect(queryByTestId('app-nav-floating')).toBeInTheDocument());
			const floating = getByTestId('app-nav-floating');

			await fireEvent.mouseLeave(getByTestId('app-nav-rail'));
			vi.advanceTimersByTime(PEEK_CLOSE_DELAY / 2);
			await fireEvent.mouseEnter(floating);
			vi.advanceTimersByTime(PEEK_CLOSE_DELAY * 2);
			await Promise.resolve();
			expect(panelTitle(getByTestId('app-nav-floating'))).toBe('Marketing');

			await fireEvent.mouseLeave(floating);
			vi.advanceTimersByTime(PEEK_CLOSE_DELAY);
			await waitFor(() => expect(queryByTestId('app-nav-floating')).not.toBeInTheDocument());
		});

		it('pins the floating panel open with its toggle', async () => {
			vi.useFakeTimers();
			const { getByTestId, uiStore } = setup({ collapsed: true });
			await fireEvent.mouseEnter(getByTestId('app-nav-project'));
			vi.advanceTimersByTime(PEEK_OPEN_DELAY);
			await waitFor(() => expect(getByTestId('app-nav-floating')).toBeInTheDocument());

			const toggle = getByTestId('app-nav-floating').querySelector(
				'[data-test-id="app-nav-toggle"]',
			);
			await fireEvent.click(toggle!);

			expect(uiStore.toggleSidebarMenuCollapse).toHaveBeenCalledTimes(1);
			expect(uiStore.sidebarMenuCollapsed).toBe(false);
			// The pinned panel keeps the hovered item, not the active one.
			await waitFor(() => expect(panelTitle(getByTestId('app-nav-docked'))).toBe('Marketing'));
		});

		it('keeps the floating panel open after a rail click, until the pointer leaves', async () => {
			vi.useFakeTimers();
			const { getByTestId, queryByTestId, router } = setup({ collapsed: true });
			await fireEvent.mouseEnter(getByTestId('app-nav-project'));
			vi.advanceTimersByTime(PEEK_OPEN_DELAY);
			await waitFor(() => expect(queryByTestId('app-nav-floating')).toBeInTheDocument());

			await fireEvent.click(getByTestId('app-nav-project'));
			await router.push('/projects/p1');
			vi.advanceTimersByTime(PEEK_CLOSE_DELAY);

			expect(queryByTestId('app-nav-floating')).toBeInTheDocument();

			await fireEvent.mouseLeave(getByTestId('app-nav-rail'));
			vi.advanceTimersByTime(PEEK_CLOSE_DELAY);

			await waitFor(() => expect(queryByTestId('app-nav-floating')).not.toBeInTheDocument());
		});
	});
});
