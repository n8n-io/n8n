import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useProjectsStore } from '@/stores/projects.store';
import { mockedStore } from '@/__tests__/utils';
import type router from 'vue-router';
import { flushPromises } from '@vue/test-utils';
import { useToast } from '@/composables/useToast';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';
import { useSettingsStore } from '@/stores/settings.store';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import type { CloudPlanState } from '@/Interface';

import { VIEWS } from '@/constants';
import type { Project, ProjectListItem } from '@/types/projects.types';

import { useGlobalEntityCreation } from './useGlobalEntityCreation';

vi.mock('@/composables/usePageRedirectionHelper', () => {
	const goToUpgrade = vi.fn();
	return {
		usePageRedirectionHelper: () => ({
			goToUpgrade,
		}),
	};
});

vi.mock('@/composables/useToast', () => {
	const showMessage = vi.fn();
	const showError = vi.fn();
	return {
		useToast: () => {
			return {
				showMessage,
				showError,
			};
		},
	};
});

const routerPushMock = vi.fn();
vi.mock('vue-router', async (importOriginal) => {
	const { RouterLink, useRoute } = await importOriginal<typeof router>();
	return {
		RouterLink,
		useRoute,
		useRouter: () => ({
			push: routerPushMock,
		}),
	};
});

beforeEach(() => {
	setActivePinia(createTestingPinia());
	routerPushMock.mockReset();
});

describe('useGlobalEntityCreation', () => {
	it('should not contain projects for community', () => {
		const projectsStore = mockedStore(useProjectsStore);

		const personalProjectId = 'personal-project';
		projectsStore.isTeamProjectFeatureEnabled = false;
		projectsStore.personalProject = { id: personalProjectId } as Project;
		const { menu } = useGlobalEntityCreation();

		expect(menu.value[0]).toStrictEqual(
			expect.objectContaining({
				route: { name: VIEWS.NEW_WORKFLOW, query: { projectId: personalProjectId } },
			}),
		);

		expect(menu.value[1]).toStrictEqual(
			expect.objectContaining({
				route: {
					name: VIEWS.CREDENTIALS,
					params: { projectId: personalProjectId, credentialId: 'create' },
				},
			}),
		);
	});

	describe('global', () => {
		it('should show personal + all team projects', () => {
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.teamProjectsLimit = -1;

			const personalProjectId = 'personal-project';
			projectsStore.isTeamProjectFeatureEnabled = true;
			projectsStore.personalProject = { id: personalProjectId } as Project;
			projectsStore.myProjects = [
				{ id: '1', name: '1', type: 'team' },
				{ id: '2', name: '2', type: 'public' },
				{ id: '3', name: '3', type: 'team' },
			] as ProjectListItem[];

			const { menu } = useGlobalEntityCreation();

			expect(menu.value[0].submenu?.length).toBe(4);
			expect(menu.value[1].submenu?.length).toBe(4);
		});

		it('disables project creation item if user has no rbac permission', () => {
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.canCreateProjects = true;
			projectsStore.isTeamProjectFeatureEnabled = true;
			projectsStore.hasPermissionToCreateProjects = false;

			const { menu, projectsLimitReachedMessage } = useGlobalEntityCreation();
			expect(menu.value[2].disabled).toBeTruthy();
			expect(projectsLimitReachedMessage.value).toContain('Your current role does not allow you');
		});
	});

	describe('handleSelect()', () => {
		it('should only handle create-project', () => {
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.isTeamProjectFeatureEnabled = true;
			const { handleSelect } = useGlobalEntityCreation();
			handleSelect('dummy');
			expect(projectsStore.createProject).not.toHaveBeenCalled();
		});

		it('creates a new project', async () => {
			const toast = useToast();
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.isTeamProjectFeatureEnabled = true;
			projectsStore.canCreateProjects = true;
			projectsStore.hasPermissionToCreateProjects = true;
			projectsStore.createProject.mockResolvedValueOnce({ name: 'test', id: '1' } as Project);

			const { handleSelect } = useGlobalEntityCreation();

			handleSelect('create-project');
			await flushPromises();

			expect(projectsStore.createProject).toHaveBeenCalled();
			expect(routerPushMock).toHaveBeenCalled();
			expect(toast.showMessage).toHaveBeenCalled();
		});

		it('handles create project error', async () => {
			const toast = useToast();
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.isTeamProjectFeatureEnabled = true;
			projectsStore.canCreateProjects = true;
			projectsStore.hasPermissionToCreateProjects = true;
			projectsStore.createProject.mockRejectedValueOnce(new Error('error'));

			const { handleSelect } = useGlobalEntityCreation();

			handleSelect('create-project');
			await flushPromises();
			expect(toast.showError).toHaveBeenCalled();
		});

		it('redirects when project limit has been reached', () => {
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.canCreateProjects = false;
			projectsStore.isTeamProjectFeatureEnabled = true;
			const redirect = usePageRedirectionHelper();

			const { handleSelect } = useGlobalEntityCreation();

			handleSelect('create-project');
			expect(redirect.goToUpgrade).toHaveBeenCalled();
		});
	});

	it('should show plan and limit according to deployment type', () => {
		const settingsStore = mockedStore(useSettingsStore);

		const cloudPlanStore = mockedStore(useCloudPlanStore);
		cloudPlanStore.currentPlanData = { displayName: 'Pro' } as CloudPlanState['data'];
		const projectsStore = mockedStore(useProjectsStore);
		projectsStore.isTeamProjectFeatureEnabled = true;
		projectsStore.teamProjectsLimit = 10;
		projectsStore.hasPermissionToCreateProjects = true;

		settingsStore.isCloudDeployment = true;
		const { projectsLimitReachedMessage, upgradeLabel } = useGlobalEntityCreation();
		expect(projectsLimitReachedMessage.value).toContain(
			'You have reached the Pro plan limit of 10.',
		);
		expect(upgradeLabel.value).toBe('Upgrade');

		settingsStore.isCloudDeployment = false;
		expect(projectsLimitReachedMessage.value).toContain('You have reached the  plan limit of');
		expect(upgradeLabel.value).toBe('Upgrade');

		projectsStore.isTeamProjectFeatureEnabled = false;
		expect(projectsLimitReachedMessage.value).toContain(
			'Upgrade to unlock projects for more granular control over sharing, access and organisation of workflows',
		);
		expect(upgradeLabel.value).toBe('Enterprise');
	});

	it('should display properly for readOnlyEnvironment', () => {
		const sourceControlStore = mockedStore(useSourceControlStore);
		sourceControlStore.preferences.branchReadOnly = true;
		const projectsStore = mockedStore(useProjectsStore);
		projectsStore.teamProjectsLimit = -1;

		const personalProjectId = 'personal-project';
		projectsStore.isTeamProjectFeatureEnabled = true;
		projectsStore.personalProject = { id: personalProjectId } as Project;
		projectsStore.myProjects = [
			{ id: '1', name: '1', type: 'team' },
			{ id: '2', name: '2', type: 'public' },
			{ id: '3', name: '3', type: 'team' },
		] as ProjectListItem[];

		const { menu } = useGlobalEntityCreation();

		expect(menu.value[0].disabled).toBe(true);
		expect(menu.value[1].disabled).toBe(true);

		expect(menu.value[0].submenu).toBe(undefined);
		expect(menu.value[1].submenu).toBe(undefined);
	});
});
