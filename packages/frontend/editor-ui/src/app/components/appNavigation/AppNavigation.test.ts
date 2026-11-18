import { computed, defineComponent, ref } from 'vue';
import { createRouter, createMemoryHistory } from 'vue-router';
import { fireEvent, waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useFavoritesStore } from '@/app/stores/favorites.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { VIEWS } from '@/app/constants';
import AppNavigation from './AppNavigation.vue';
import type { AppNavRailItem, AppNavSection } from './useAppNavigation';
import { PEEK_CLOSE_DELAY, PEEK_OPEN_DELAY } from './useNavigationPeek';

const activeItemId = ref<string | null>('overview');

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
						{
							id: `${itemId}-favorite`,
							label: 'Starred workflow',
							icon: 'workflow',
							to: '/workflows',
							active: false,
							favorite: { resourceId: 'wf-1', resourceType: 'workflow' },
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

const quickChatToggle = vi.hoisted(() => vi.fn());
vi.mock('@/features/ai/instanceAi/quickChat/useQuickChat', () => ({
	useQuickChat: () => ({ toggle: quickChatToggle }),
}));

const createProject = vi.hoisted(() => vi.fn());
vi.mock('@/app/composables/useGlobalEntityCreation', async () => {
	const { computed } = await import('vue');
	return {
		useGlobalEntityCreation: () => ({
			createProject,
			projectsLimitReachedMessage: computed(() => 'Limit reached'),
		}),
	};
});

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

function setup({ collapsed, before }: { collapsed: boolean; before?: () => void }) {
	createTestingPinia();
	// The projects store reads license settings that these tests do not set.
	const projectsStore = mockedStore(useProjectsStore);
	projectsStore.isTeamProjectFeatureEnabled = false;
	projectsStore.canCreateProjects = false;
	projectsStore.hasPermissionToCreateProjects = false;
	before?.();
	const uiStore = mockedStore(useUIStore);
	uiStore.sidebarMenuCollapsed = collapsed;
	uiStore.toggleSidebarMenuCollapse = vi.fn(() => {
		uiStore.sidebarMenuCollapsed = !uiStore.sidebarMenuCollapsed;
	});

	const router = createRouter({
		history: createMemoryHistory(),
		routes: [
			...['/', '/overview', '/projects/p1', '/workflows'].map((path) => ({
				path,
				component: Empty,
			})),
			{ path: '/insights', name: VIEWS.INSIGHTS, component: Empty },
		],
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
		createProject.mockClear();
	});

	it('shows the rail items with a divider before the projects, and the account menu', () => {
		const { getByTestId, getAllByRole } = setup({ collapsed: false });

		expect(getByTestId('app-nav-overview')).toHaveAttribute('aria-current', 'page');
		expect(getByTestId('app-nav-project')).not.toHaveAttribute('aria-current');
		// One divider before the projects, one above the account menu.
		expect(getAllByRole('separator')).toHaveLength(2);
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

	it('shows Insights above the account menu only when the user can open it', async () => {
		const hidden = setup({ collapsed: true });
		expect(hidden.queryByTestId('app-nav-insights')).not.toBeInTheDocument();
		hidden.unmount();

		const { getByTestId, router } = setup({
			collapsed: true,
			before: () => {
				mockedStore(useSettingsStore).isModuleActive = vi.fn(() => true);
				mockedStore(useRBACStore).hasScope = vi.fn(() => true);
			},
		});
		const insights = getByTestId('app-nav-insights');
		expect(insights).toHaveAttribute('aria-label', 'Insights');
		expect(insights).not.toHaveAttribute('aria-current');

		await router.push('/insights');
		await waitFor(() => expect(insights).toHaveAttribute('aria-current', 'page'));
	});

	it('unstars a favorite from its row in the panel', async () => {
		const { getAllByTestId } = setup({
			collapsed: false,
			before: () => {
				mockedStore(useFavoritesStore).toggleFavorite = vi.fn(async () => {});
			},
		});

		const [unstar] = getAllByTestId('app-nav-unfavorite');
		await fireEvent.click(unstar);

		expect(mockedStore(useFavoritesStore).toggleFavorite).toHaveBeenCalledWith('wf-1', 'workflow');
	});

	describe('quick chat', () => {
		const assistantItem: AppNavRailItem = {
			id: 'assistant',
			label: 'Assistant',
			icon: { type: 'icon', value: 'n8n-assistant' },
			to: '/overview',
			group: 'main',
			testId: 'app-nav-assistant',
		};

		beforeEach(() => {
			railItems.unshift(assistantItem);
			quickChatToggle.mockClear();
		});

		afterEach(() => {
			railItems.splice(railItems.indexOf(assistantItem), 1);
		});

		it('opens Quick chat next to the Assistant item on Alt-click, without following the link', async () => {
			const { getByTestId } = setup({ collapsed: true });
			const event = new MouseEvent('click', { bubbles: true, cancelable: true, altKey: true });

			getByTestId('app-nav-assistant').dispatchEvent(event);

			expect(event.defaultPrevented).toBe(true);
			expect(quickChatToggle).toHaveBeenCalledWith(
				expect.objectContaining({ right: expect.any(Number), top: expect.any(Number) }),
			);
		});

		it('opens the Assistant page on a plain click', async () => {
			const { getByTestId } = setup({ collapsed: true });

			await fireEvent.click(getByTestId('app-nav-assistant'));

			expect(quickChatToggle).not.toHaveBeenCalled();
		});
	});

	describe('create project', () => {
		it('creates a project from the end of the project list', async () => {
			const { getByTestId } = setup({
				collapsed: true,
				before: () => {
					const projectsStore = mockedStore(useProjectsStore);
					projectsStore.isTeamProjectFeatureEnabled = true;
					projectsStore.canCreateProjects = true;
					projectsStore.hasPermissionToCreateProjects = true;
				},
			});

			await fireEvent.click(getByTestId('app-nav-create-project'));

			expect(createProject).toHaveBeenCalledWith('navigation_rail');
		});

		it('keeps the button, disabled, when the user cannot create more projects', async () => {
			const { getByTestId } = setup({
				collapsed: true,
				before: () => {
					const projectsStore = mockedStore(useProjectsStore);
					projectsStore.isTeamProjectFeatureEnabled = true;
					projectsStore.canCreateProjects = false;
					projectsStore.hasPermissionToCreateProjects = true;
				},
			});

			const button = getByTestId('app-nav-create-project');
			expect(button).toBeDisabled();
			await fireEvent.click(button);
			expect(createProject).not.toHaveBeenCalled();
		});

		it('hides the button without team projects', () => {
			const { queryByTestId } = setup({
				collapsed: true,
				before: () => {
					mockedStore(useProjectsStore).isTeamProjectFeatureEnabled = false;
				},
			});

			expect(queryByTestId('app-nav-create-project')).not.toBeInTheDocument();
		});
	});

	describe('expanded', () => {
		it('shows no panel and no active rail item on a page that no item owns', () => {
			activeItemId.value = null;
			const { queryByTestId, getByTestId } = setup({ collapsed: false });

			expect(queryByTestId('app-nav-docked')).not.toBeInTheDocument();
			expect(getByTestId('app-nav-overview')).not.toHaveAttribute('aria-current');
			expect(getByTestId('app-nav-project')).not.toHaveAttribute('aria-current');
		});

		it('floats a hovered panel on a page that no item owns', async () => {
			vi.useFakeTimers();
			activeItemId.value = null;
			const { getByTestId, queryByTestId } = setup({ collapsed: false });

			await fireEvent.mouseEnter(getByTestId('app-nav-project'));
			vi.advanceTimersByTime(PEEK_OPEN_DELAY);

			await waitFor(() => expect(queryByTestId('app-nav-floating')).toBeInTheDocument());
			expect(queryByTestId('app-nav-docked')).not.toBeInTheDocument();
		});

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
