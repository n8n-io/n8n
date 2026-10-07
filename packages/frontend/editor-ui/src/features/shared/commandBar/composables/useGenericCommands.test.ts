import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { createUser } from '@/__tests__/data/users';
import { VIEWS } from '@/app/constants';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import { useResourceCenterStore } from '@/experiments/resourceCenter/stores/resourceCenter.store';
import { useGenericCommands } from './useGenericCommands';

const routerPushMock = vi.fn();

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: routerPushMock }),
	useRoute: () => ({ params: {} }),
	RouterLink: vi.fn(),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

vi.mock('@/app/composables/useBugReporting', () => ({
	useBugReporting: () => ({ getReportingURL: () => 'https://example.com/report' }),
}));

vi.mock('@/app/utils/rbac/permissions', () => ({
	hasPermission: vi.fn(),
}));

describe('useGenericCommands', () => {
	let settingsStore: MockedStore<typeof useSettingsStore>;
	let projectsStore: MockedStore<typeof useProjectsStore>;
	let usersStore: MockedStore<typeof useUsersStore>;
	let templatesStore: MockedStore<typeof useTemplatesStore>;
	let resourceCenterStore: MockedStore<typeof useResourceCenterStore>;

	const findCommand = (id: string) =>
		useGenericCommands().commands.value.find((command) => command.id === id);

	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();

		settingsStore = mockedStore(useSettingsStore);
		settingsStore.isTemplatesEnabled = true;
		settingsStore.isFoldersFeatureEnabled = false;
		settingsStore.isModuleActive.mockImplementation((moduleName) => moduleName === 'insights');

		projectsStore = mockedStore(useProjectsStore);
		projectsStore.canViewProjects = true;
		projectsStore.isTeamProjectFeatureEnabled = true;

		usersStore = mockedStore(useUsersStore);
		usersStore.allUsers = [createUser(), createUser()];

		templatesStore = mockedStore(useTemplatesStore);
		templatesStore.hasCustomTemplatesHost = true;

		resourceCenterStore = mockedStore(useResourceCenterStore);
		resourceCenterStore.isFeatureEnabled.mockReturnValue(false);

		vi.mocked(hasPermission).mockReturnValue(true);
	});

	describe('overview command', () => {
		it('shows the overview command when the user can view projects', () => {
			expect(findCommand('overview')).toMatchObject({
				title: 'projects.menu.overview',
				section: 'commandBar.sections.general',
			});
		});

		it('hides the overview command when the user cannot view projects', () => {
			projectsStore.canViewProjects = false;

			expect(findCommand('overview')).toBeUndefined();
		});

		it('navigates to the homepage when the handler runs', async () => {
			await findCommand('overview')?.handler?.();

			expect(routerPushMock).toHaveBeenCalledWith({ name: VIEWS.HOMEPAGE });
		});
	});

	describe('shared with you command', () => {
		it('shows the shared with you command when team projects are enabled and several users are active', () => {
			expect(findCommand('shared-with-me')).toMatchObject({
				title: 'projects.menu.shared',
				section: 'commandBar.sections.general',
			});
		});

		it('shows the shared with you command when only the folders feature is enabled', () => {
			projectsStore.isTeamProjectFeatureEnabled = false;
			settingsStore.isFoldersFeatureEnabled = true;

			expect(findCommand('shared-with-me')).toBeDefined();
		});

		it('hides the shared with you command when team projects and folders are disabled', () => {
			projectsStore.isTeamProjectFeatureEnabled = false;

			expect(findCommand('shared-with-me')).toBeUndefined();
		});

		it('hides the shared with you command when only one user is not pending', () => {
			usersStore.allUsers = [createUser(), createUser({ isPendingUser: true })];

			expect(findCommand('shared-with-me')).toBeUndefined();
		});

		it('hides the shared with you command when the user cannot view projects', () => {
			projectsStore.canViewProjects = false;

			expect(findCommand('shared-with-me')).toBeUndefined();
		});

		it('navigates to the shared with you view when the handler runs', async () => {
			await findCommand('shared-with-me')?.handler?.();

			expect(routerPushMock).toHaveBeenCalledWith({ name: VIEWS.SHARED_WITH_ME });
		});
	});

	describe('templates command', () => {
		it('shows the templates command when templates are enabled and the resource center is off', () => {
			expect(findCommand('templates')).toBeDefined();
		});

		it('hides the templates command when templates are disabled', () => {
			settingsStore.isTemplatesEnabled = false;

			expect(findCommand('templates')).toBeUndefined();
		});

		it('hides the templates command when the resource center is enabled', () => {
			resourceCenterStore.isFeatureEnabled.mockReturnValue(true);

			expect(findCommand('templates')).toBeUndefined();
		});

		it('navigates to the templates view when a custom templates host is set', async () => {
			await findCommand('templates')?.handler?.();

			expect(routerPushMock).toHaveBeenCalledWith({ name: VIEWS.TEMPLATES });
		});

		it('opens the website templates repository when no custom templates host is set', async () => {
			templatesStore.hasCustomTemplatesHost = false;
			templatesStore.websiteTemplateRepositoryURL = 'https://n8n.io/workflows';
			const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

			await findCommand('templates')?.handler?.();

			expect(openSpy).toHaveBeenCalledWith('https://n8n.io/workflows', '_blank');
			expect(routerPushMock).not.toHaveBeenCalled();
			openSpy.mockRestore();
		});
	});

	describe('insights command', () => {
		it('shows the insights command when the insights module is active and the user can list insights', () => {
			expect(findCommand('insights')).toBeDefined();
			expect(settingsStore.isModuleActive).toHaveBeenCalledWith('insights');
			expect(hasPermission).toHaveBeenCalledWith(['rbac'], {
				rbac: { scope: 'insights:list' },
			});
		});

		it('hides the insights command when the insights module is not active', () => {
			settingsStore.isModuleActive.mockReturnValue(false);

			expect(findCommand('insights')).toBeUndefined();
		});

		it('hides the insights command when the user cannot list insights', () => {
			vi.mocked(hasPermission).mockReturnValue(false);

			expect(findCommand('insights')).toBeUndefined();
		});

		it('navigates to the insights view when the handler runs', async () => {
			await findCommand('insights')?.handler?.();

			expect(routerPushMock).toHaveBeenCalledWith({ name: VIEWS.INSIGHTS });
		});
	});
});
