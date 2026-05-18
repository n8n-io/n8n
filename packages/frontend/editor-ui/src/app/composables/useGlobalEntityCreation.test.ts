import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { mockedStore } from '@/__tests__/utils';
import type router from 'vue-router';
import { flushPromises } from '@vue/test-utils';
import { useToast } from '@/app/composables/useToast';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import type { CloudPlanState } from '@/Interface';

import { VIEWS } from '@/app/constants';
import { NEW_AGENT_VIEW, AGENTS_MODULE_NAME } from '@/features/agents/constants';
import type { Project, ProjectListItem } from '@/features/collaboration/projects/projects.types';

import { useGlobalEntityCreation } from './useGlobalEntityCreation';

vi.mock('@/app/composables/usePageRedirectionHelper', () => {
	const goToUpgrade = vi.fn();
	return {
		usePageRedirectionHelper: () => ({
			goToUpgrade,
		}),
	};
});

vi.mock('@/app/composables/useToast', () => {
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

		it('should not show submenus when team feature is enabled but no team projects exist', () => {
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.teamProjectsLimit = -1;

			const personalProjectId = 'personal-project';
			projectsStore.isTeamProjectFeatureEnabled = true;
			projectsStore.personalProject = { id: personalProjectId } as Project;
			projectsStore.myProjects = [];

			const { menu } = useGlobalEntityCreation();

			expect(menu.value).toHaveLength(3);
			expect(menu.value[0].submenu).toBeUndefined();
			expect(menu.value[0].route).toEqual({
				name: VIEWS.NEW_WORKFLOW,
				query: { projectId: personalProjectId },
			});
			expect(menu.value[1].submenu).toBeUndefined();
			expect(menu.value[1].route).toEqual({
				name: VIEWS.PROJECTS_CREDENTIALS,
				params: { projectId: personalProjectId, credentialId: 'create' },
			});
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

	describe('agents module', () => {
		const enableAgentsModule = () => {
			const settingsStore = mockedStore(useSettingsStore);
			settingsStore.isModuleActive.mockImplementation(
				(name: string) => name === AGENTS_MODULE_NAME,
			);
			return settingsStore;
		};

		it('omits the agent entry from the community shape when the module is inactive', () => {
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.isTeamProjectFeatureEnabled = false;
			projectsStore.personalProject = { id: 'personal-project' } as Project;

			const { menu } = useGlobalEntityCreation();

			expect(menu.value.find((item) => item.id === 'agent')).toBeUndefined();
		});

		it('inserts a flat agent entry between credential and create-project in community shape', () => {
			enableAgentsModule();

			const projectsStore = mockedStore(useProjectsStore);
			const personalProjectId = 'personal-project';
			projectsStore.isTeamProjectFeatureEnabled = false;
			projectsStore.personalProject = { id: personalProjectId } as Project;

			const { menu } = useGlobalEntityCreation();

			const ids = menu.value.map((item) => item.id);
			expect(ids).toEqual(['workflow', 'credential', 'agent', 'create-project']);
			expect(menu.value.find((item) => item.id === 'agent')).toStrictEqual(
				expect.objectContaining({
					route: { name: NEW_AGENT_VIEW, query: { projectId: personalProjectId } },
				}),
			);
		});

		it('inserts a flat agent entry when team feature is enabled but no team projects exist', () => {
			enableAgentsModule();

			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.teamProjectsLimit = -1;
			const personalProjectId = 'personal-project';
			projectsStore.isTeamProjectFeatureEnabled = true;
			projectsStore.personalProject = {
				id: personalProjectId,
				scopes: ['agent:create'],
			} as Project;
			projectsStore.myProjects = [];

			const { menu } = useGlobalEntityCreation();

			expect(menu.value.find((item) => item.id === 'agent')).toStrictEqual(
				expect.objectContaining({
					disabled: false,
					route: { name: NEW_AGENT_VIEW, query: { projectId: personalProjectId } },
				}),
			);
		});

		it('disables the flat agent entry when the user lacks the agent:create scope', () => {
			enableAgentsModule();

			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.teamProjectsLimit = -1;
			projectsStore.isTeamProjectFeatureEnabled = true;
			projectsStore.personalProject = {
				id: 'personal-project',
				scopes: [],
			} as unknown as Project;
			projectsStore.myProjects = [];

			const { menu } = useGlobalEntityCreation();

			expect(menu.value.find((item) => item.id === 'agent')).toStrictEqual(
				expect.objectContaining({ disabled: true }),
			);
		});

		it('shows agent submenu with personal + team projects in the global shape', () => {
			enableAgentsModule();

			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.teamProjectsLimit = -1;
			const personalProjectId = 'personal-project';
			projectsStore.isTeamProjectFeatureEnabled = true;
			projectsStore.personalProject = {
				id: personalProjectId,
				scopes: ['agent:create'],
			} as Project;
			projectsStore.myProjects = [
				{ id: '1', name: '1', type: 'team', scopes: ['agent:create'] },
				{ id: '2', name: '2', type: 'public' },
				{ id: '3', name: '3', type: 'team', scopes: [] },
			] as ProjectListItem[];

			const { menu } = useGlobalEntityCreation();

			const agentEntry = menu.value.find((item) => item.id === 'agent');
			expect(agentEntry).toBeDefined();
			expect(agentEntry?.submenu).toHaveLength(4);

			const personal = agentEntry?.submenu?.find((s) => s.id === 'agent-personal');
			expect(personal).toStrictEqual(
				expect.objectContaining({
					disabled: false,
					route: { name: NEW_AGENT_VIEW, query: { projectId: personalProjectId } },
				}),
			);

			const teamWithScope = agentEntry?.submenu?.find((s) => s.id === 'agent-1');
			expect(teamWithScope?.disabled).toBe(false);
			expect(teamWithScope?.route).toEqual({
				name: NEW_AGENT_VIEW,
				query: { projectId: '1' },
			});

			const teamWithoutScope = agentEntry?.submenu?.find((s) => s.id === 'agent-3');
			expect(teamWithoutScope?.disabled).toBe(true);
		});

		it('omits the agent entry from the global shape when the module is inactive', () => {
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.teamProjectsLimit = -1;
			projectsStore.isTeamProjectFeatureEnabled = true;
			projectsStore.personalProject = { id: 'personal-project' } as Project;
			projectsStore.myProjects = [{ id: '1', name: '1', type: 'team' }] as ProjectListItem[];

			const { menu } = useGlobalEntityCreation();

			expect(menu.value.find((item) => item.id === 'agent')).toBeUndefined();
		});

		it('disables the agent submenu in the global shape when branch is read-only', () => {
			enableAgentsModule();

			const sourceControlStore = mockedStore(useSourceControlStore);
			sourceControlStore.preferences.branchReadOnly = true;

			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.teamProjectsLimit = -1;
			projectsStore.isTeamProjectFeatureEnabled = true;
			projectsStore.personalProject = {
				id: 'personal-project',
				scopes: ['agent:create'],
			} as Project;
			projectsStore.myProjects = [
				{ id: '1', name: '1', type: 'team', scopes: ['agent:create'] },
			] as ProjectListItem[];

			const { menu } = useGlobalEntityCreation();

			const agentEntry = menu.value.find((item) => item.id === 'agent');
			expect(agentEntry?.disabled).toBe(true);
			expect(agentEntry?.submenu).toBeUndefined();
		});
	});
});
