import { computed, reactive } from 'vue';
import { fireEvent, screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type { useGlobalEntityCreation } from '@/app/composables/useGlobalEntityCreation';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { defaultSettings } from '@n8n/frontend-test-utils';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import MainSidebarHeader from './MainSidebarHeader.vue';

const creation = vi.hoisted(() => ({
	items: [] as ReturnType<typeof useGlobalEntityCreation>['menu']['value'],
	handleSelect: vi.fn(),
	push: vi.fn(),
	trackOpen: vi.fn(),
	hasPermissionToCreateProjects: true,
	showClaude: false,
}));

vi.mock('@/app/composables/useGlobalEntityCreation', () => ({
	useGlobalEntityCreation: () => ({
		menu: computed(() => creation.items),
		handleSelect: creation.handleSelect,
		projectsLimitReachedMessage: 'Project limit reached',
		upgradeLabel: 'Upgrade',
		hasPermissionToCreateProjects: creation.hasPermissionToCreateProjects,
	}),
}));

vi.mock('@/experiments/surfaceMcpToClaudeTrialUsers/useClaudeCreateMenu', () => ({
	useClaudeCreateMenu: (menu: ReturnType<typeof useGlobalEntityCreation>['menu']) => ({
		claudeMenu: computed(() =>
			creation.showClaude
				? [
						...menu.value,
						{ id: 'claude-divider', isDivider: true },
						{ id: 'claude-mcp', title: 'Build with Claude' },
					]
				: menu.value,
		),
		selectItem: creation.handleSelect,
		trackOpen: creation.trackOpen,
	}),
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({
		resolve: vi.fn(() => ({ meta: {}, href: '/workflow/new' })),
		push: creation.push,
	}),
	useRoute: () => reactive({}),
	RouterLink: {
		template: '<a><slot /></a>',
	},
}));

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({}),
}));

let settingsStore: MockedStore<typeof useSettingsStore>;
let sourceControlStore: MockedStore<typeof useSourceControlStore>;
let pinia: ReturnType<typeof createTestingPinia>;

describe('MainSidebarHeader', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		creation.items = [
			{ id: 'workflow', title: 'New workflow', route: { name: 'new-workflow' } },
			{ id: 'credential', title: 'New credential' },
			{ id: 'agent', title: 'New agent' },
			{ id: 'create-project', title: 'New project', disabled: true },
		];
		creation.hasPermissionToCreateProjects = true;
		creation.showClaude = false;
		pinia = createTestingPinia();
		settingsStore = mockedStore(useSettingsStore);
		sourceControlStore = mockedStore(useSourceControlStore);
		settingsStore.settings = defaultSettings;
	});

	it('renders header without error', () => {
		expect(() =>
			createComponentRenderer(MainSidebarHeader, {
				pinia,
				props: { isCollapsed: false },
			})(),
		).not.toThrow();
	});

	it('renders collapsed header without error', () => {
		expect(() =>
			createComponentRenderer(MainSidebarHeader, {
				pinia,
				props: { isCollapsed: true },
			})(),
		).not.toThrow();
	});

	test.each([
		[false, true, true],
		[true, false, false],
		[true, true, false],
		[false, false, false],
	])(
		'should render readonly tooltip when is collapsed %s and the environment is readonly %s',
		(isCollapsed, branchReadOnly, shouldRender) => {
			sourceControlStore.preferences.branchReadOnly = branchReadOnly;

			const { queryByTestId } = createComponentRenderer(MainSidebarHeader, {
				pinia,
				props: { isCollapsed },
			})();

			expect(queryByTestId('read-only-env-icon') !== null).toBe(shouldRender);
		},
	);

	it('renders the logo link only when not collapsed', async () => {
		const { container, rerender } = createComponentRenderer(MainSidebarHeader, {
			pinia,
			props: { isCollapsed: false, hideCreate: true },
		})();

		expect(container.querySelector('a')).toBeInTheDocument();

		await rerender({ isCollapsed: true, hideCreate: true });

		expect(container.querySelector('a')).not.toBeInTheDocument();
	});

	it('displays create button', () => {
		const { queryByTestId } = createComponentRenderer(MainSidebarHeader, {
			pinia,
			props: { isCollapsed: false },
		})();

		expect(queryByTestId('universal-add')).toBeInTheDocument();
	});

	it('hides create button when hideCreate is true', () => {
		const { queryByTestId } = createComponentRenderer(MainSidebarHeader, {
			pinia,
			props: { isCollapsed: false, hideCreate: true },
		})();

		expect(queryByTestId('universal-add')).not.toBeInTheDocument();
	});

	it('emits "collapse" when toggle sidebar is clicked', async () => {
		const { getByRole, emitted } = createComponentRenderer(MainSidebarHeader, {
			pinia,
			props: { isCollapsed: false, hideCreate: true },
		})();

		await fireEvent.click(getByRole('button', { name: 'Toggle sidebar' }));

		expect(emitted('collapse')).toHaveLength(1);
	});

	it('renders the command bar button by default', () => {
		const { queryByRole } = createComponentRenderer(MainSidebarHeader, {
			pinia,
			props: { isCollapsed: false, hideCreate: true },
		})();

		expect(queryByRole('button', { name: 'Open command palette' })).toBeInTheDocument();
	});

	it('hides the command bar button in canvas-only mode', () => {
		settingsStore.settings = { ...defaultSettings, canvasOnly: true };

		const { queryByRole } = createComponentRenderer(MainSidebarHeader, {
			pinia,
			props: { isCollapsed: false, hideCreate: true },
		})();

		expect(queryByRole('button', { name: 'Open command palette' })).not.toBeInTheDocument();
	});

	it('emits "openCommandBar" with the click event when command bar button is clicked', async () => {
		const { getByRole, emitted } = createComponentRenderer(MainSidebarHeader, {
			pinia,
			props: { isCollapsed: false, hideCreate: true },
		})();

		await fireEvent.click(getByRole('button', { name: 'Open command palette' }));

		const emits = emitted('openCommandBar');
		expect(emits).toHaveLength(1);

		const [[event]] = emits as Array<[Event]>;
		expect(event).toBeInstanceOf(MouseEvent);
		expect((event as MouseEvent).type).toBe('click');
	});
	describe('creation menu', () => {
		const renderHeader = () =>
			createComponentRenderer(MainSidebarHeader, {
				pinia,
				props: { isCollapsed: false },
			})();

		async function openMenu() {
			await userEvent.click(screen.getByTestId('universal-add'));
			return await screen.findByRole('menu');
		}

		it('portals the menu outside the header and keeps Agent below Workflow', async () => {
			const { container } = renderHeader();
			const menu = await openMenu();
			expect(document.body).toContainElement(menu);
			expect(container).not.toContainElement(menu);
			expect(
				within(menu)
					.getAllByRole('menuitem')
					.map((item) => item.textContent),
			).toEqual(['New workflow', 'New agent', 'New credential', 'New projectUpgrade']);
		});

		it('navigates and selects a route item once when its link is clicked', async () => {
			renderHeader();
			const menu = await openMenu();
			const link = within(menu).getByRole('link', { name: 'New workflow' });
			expect(link).toHaveAttribute('href', '/workflow/new');
			await userEvent.click(link);
			expect(creation.push).toHaveBeenCalledExactlyOnceWith({ name: 'new-workflow' });
			expect(creation.handleSelect).toHaveBeenCalledExactlyOnceWith('workflow');
			await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
		});

		it('keeps modified link clicks available for browser navigation', async () => {
			renderHeader();
			const menu = await openMenu();
			const link = within(menu).getByRole('link', { name: 'New workflow' });
			link.setAttribute('href', '#workflow');
			const click = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
			await fireEvent(link, click);
			expect(click.defaultPrevented).toBe(false);
			expect(creation.push).not.toHaveBeenCalled();
			expect(creation.handleSelect).not.toHaveBeenCalled();
		});

		it('supports keyboard selection of route items', async () => {
			renderHeader();
			const menu = await openMenu();
			within(menu).getByRole('menuitem', { name: 'New workflow' }).focus();
			await userEvent.keyboard('{Enter}');
			expect(creation.push).toHaveBeenCalledExactlyOnceWith({ name: 'new-workflow' });
			expect(creation.handleSelect).toHaveBeenCalledExactlyOnceWith('workflow');
		});

		it('opens project submenus and selects their route items', async () => {
			creation.items[0] = {
				id: 'workflow',
				title: 'New workflow',
				submenu: [
					{ id: 'workflow-title', title: 'Create in', disabled: true },
					{
						id: 'workflow-personal',
						title: 'Personal',
						icon: 'user',
						route: { name: 'new-workflow' },
					},
					{
						id: 'workflow-team',
						title: 'Team',
						icon: { type: 'emoji', value: '🎉' },
						disabled: true,
					},
				],
			};
			renderHeader();
			const menu = await openMenu();
			await userEvent.hover(within(menu).getByRole('menuitem', { name: 'New workflow' }));
			const personal = await screen.findByRole('menuitem', { name: 'Personal' });
			expect(screen.getByRole('menuitem', { name: 'Create in' })).toHaveAttribute('data-disabled');
			expect(screen.getByRole('menuitem', { name: /Team/ })).toHaveAttribute('data-disabled');
			await userEvent.click(within(personal).getByRole('link'));
			expect(creation.handleSelect).toHaveBeenCalledExactlyOnceWith('workflow-personal');
			expect(creation.push).toHaveBeenCalledExactlyOnceWith({ name: 'new-workflow' });
		});

		it('keeps the upgrade action usable on a disabled project item', async () => {
			renderHeader();
			const menu = await openMenu();
			expect(within(menu).getByRole('menuitem', { name: /New project/ })).toHaveAttribute(
				'data-disabled',
			);
			await userEvent.click(within(menu).getByRole('button', { name: 'Upgrade' }));
			expect(creation.handleSelect).toHaveBeenCalledExactlyOnceWith('create-project');
		});

		it('shows locked items without route links or an upgrade action in a read-only environment', async () => {
			creation.items[0].disabled = true;
			sourceControlStore.preferences.branchReadOnly = true;
			renderHeader();
			const menu = await openMenu();
			const workflow = within(menu).getByRole('menuitem', { name: 'New workflow' });
			expect(within(workflow).queryByRole('link')).not.toBeInTheDocument();
			expect(within(menu).queryByRole('button', { name: 'Upgrade' })).not.toBeInTheDocument();
			await userEvent.click(workflow);
			expect(creation.handleSelect).not.toHaveBeenCalled();
		});

		it('preserves the experiment entry after a separator and tracks opening', async () => {
			creation.showClaude = true;
			renderHeader();
			const menu = await openMenu();
			expect(within(menu).getByRole('separator')).toBeInTheDocument();
			expect(within(menu).getAllByRole('menuitem').at(-1)).toHaveTextContent('Build with Claude');
			expect(creation.trackOpen).toHaveBeenCalledOnce();
			await userEvent.click(within(menu).getByRole('menuitem', { name: 'Build with Claude' }));
			expect(creation.handleSelect).toHaveBeenCalledExactlyOnceWith('claude-mcp');
		});

		it('dismisses with Escape and returns focus to the trigger', async () => {
			renderHeader();
			await openMenu();
			await userEvent.keyboard('{Escape}');
			await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
			expect(screen.getByTestId('universal-add')).toHaveFocus();
		});

		it('dismisses when the user clicks outside', async () => {
			renderHeader();
			await openMenu();
			await userEvent.click(document.body);
			await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
		});
	});
});
