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

import { EnterpriseEditionFeature, VIEWS } from '@/app/constants';
import { NEW_AGENT_VIEW, AGENTS_MODULE_NAME } from '@/features/agents/constants';
import { INSTANCE_AI_VIEW } from '@/features/ai/instanceAi/constants';
import { VARIABLE_MODAL_KEY } from '@/features/settings/environments.ee/environments.constants';
import { PROJECT_DATA_TABLES } from '@/features/core/dataTable/constants';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useUIStore } from '@/app/stores/ui.store';
import type { Project, ProjectListItem } from '@/features/collaboration/projects/projects.types';

import { useGlobalEntityCreation } from './useGlobalEntityCreation';

vi.mock('@/app/utils/rbac/permissions', () => ({
	hasPermission: vi.fn().mockReturnValue(false),
}));

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

const trackMock = vi.fn();
vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: trackMock }),
}));

beforeEach(() => {
	setActivePinia(createTestingPinia());
	routerPushMock.mockReset();
	trackMock.mockReset();
	vi.mocked(hasPermission).mockReturnValue(false);
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

	describe('variables', () => {
		const enableVariables = () => {
			const settingsStore = mockedStore(useSettingsStore);
			settingsStore.isEnterpriseFeatureEnabled = {
				[EnterpriseEditionFeature.Variables]: true,
			} as unknown as (typeof settingsStore)['isEnterpriseFeatureEnabled'];
			const usersStore = mockedStore(useUsersStore);
			usersStore.currentUser = {
				globalScopes: ['variable:create'],
			} as unknown as (typeof usersStore)['currentUser'];
			return settingsStore;
		};

		it('omits the variable entry when the enterprise feature is disabled', () => {
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.isTeamProjectFeatureEnabled = false;
			projectsStore.personalProject = { id: 'personal-project' } as Project;

			const { menu } = useGlobalEntityCreation();

			expect(menu.value.find((item) => item.id === 'variable')).toBeUndefined();
		});

		it('shows a Global + Personal submenu after credential in the community shape', () => {
			enableVariables();

			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.isTeamProjectFeatureEnabled = false;
			projectsStore.personalProject = { id: 'personal-project' } as Project;

			const { menu } = useGlobalEntityCreation();

			const ids = menu.value.map((item) => item.id);
			expect(ids).toEqual(['workflow', 'credential', 'variable', 'create-project']);

			const variableEntry = menu.value.find((item) => item.id === 'variable');
			expect(variableEntry?.submenu?.map((s) => s.id)).toEqual([
				'variable-title',
				'variable-global',
				'variable-personal',
			]);
		});

		it('appends team projects to the variable submenu in the global shape', () => {
			enableVariables();

			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.teamProjectsLimit = -1;
			projectsStore.isTeamProjectFeatureEnabled = true;
			projectsStore.personalProject = { id: 'personal-project' } as Project;
			projectsStore.myProjects = [{ id: '1', name: '1', type: 'team' }] as ProjectListItem[];

			const { menu } = useGlobalEntityCreation();

			const variableEntry = menu.value.find((item) => item.id === 'variable');
			expect(variableEntry?.submenu?.map((s) => s.id)).toEqual([
				'variable-title',
				'variable-global',
				'variable-personal',
				'variable-1',
			]);
		});

		it('disables the global scope when the user lacks the global variable:create scope', () => {
			const settingsStore = mockedStore(useSettingsStore);
			settingsStore.isEnterpriseFeatureEnabled = {
				[EnterpriseEditionFeature.Variables]: true,
			} as unknown as (typeof settingsStore)['isEnterpriseFeatureEnabled'];
			const usersStore = mockedStore(useUsersStore);
			usersStore.currentUser = {
				globalScopes: [],
			} as unknown as (typeof usersStore)['currentUser'];

			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.isTeamProjectFeatureEnabled = false;
			projectsStore.personalProject = {
				id: 'personal-project',
				scopes: ['projectVariable:create'],
			} as unknown as Project;

			const { menu } = useGlobalEntityCreation();

			const submenu = menu.value.find((item) => item.id === 'variable')?.submenu;
			expect(submenu?.find((s) => s.id === 'variable-global')?.disabled).toBe(true);
			expect(submenu?.find((s) => s.id === 'variable-personal')?.disabled).toBe(false);
		});

		it('opens the variable modal pre-scoped to global on select', () => {
			enableVariables();
			const uiStore = mockedStore(useUIStore);

			const { handleSelect } = useGlobalEntityCreation();
			handleSelect('variable-global');

			expect(uiStore.openModalWithData).toHaveBeenCalledWith({
				name: VARIABLE_MODAL_KEY,
				data: { mode: 'new', projectId: '' },
			});
			expect(trackMock).toHaveBeenCalledWith('User clicked sidebar add variable button');
		});

		it('opens the variable modal pre-scoped to the personal project on select', () => {
			enableVariables();
			const uiStore = mockedStore(useUIStore);
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.personalProject = { id: 'personal-project' } as Project;

			const { handleSelect } = useGlobalEntityCreation();
			handleSelect('variable-personal');

			expect(uiStore.openModalWithData).toHaveBeenCalledWith({
				name: VARIABLE_MODAL_KEY,
				data: { mode: 'new', projectId: 'personal-project' },
			});
		});

		it('opens the variable modal pre-scoped to a team project on select', () => {
			enableVariables();
			const uiStore = mockedStore(useUIStore);

			const { handleSelect } = useGlobalEntityCreation();
			handleSelect('variable-team-123');

			expect(uiStore.openModalWithData).toHaveBeenCalledWith({
				name: VARIABLE_MODAL_KEY,
				data: { mode: 'new', projectId: 'team-123' },
			});
		});
	});

	describe('data tables', () => {
		const enableDataTable = () => {
			const settingsStore = mockedStore(useSettingsStore);
			settingsStore.isDataTableFeatureEnabled = true;
			return settingsStore;
		};

		it('omits the data table entry when the feature is disabled', () => {
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.isTeamProjectFeatureEnabled = false;
			projectsStore.personalProject = { id: 'personal-project' } as Project;

			const { menu } = useGlobalEntityCreation();

			expect(menu.value.find((item) => item.id === 'data-table')).toBeUndefined();
		});

		it('renders a flat personal-scoped entry when there are no team projects', () => {
			enableDataTable();

			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.teamProjectsLimit = -1;
			projectsStore.isTeamProjectFeatureEnabled = true;
			projectsStore.personalProject = {
				id: 'personal-project',
				scopes: ['dataTable:create'],
			} as unknown as Project;
			projectsStore.myProjects = [];

			const { menu } = useGlobalEntityCreation();

			const entry = menu.value.find((item) => item.id === 'data-table');
			expect(entry?.submenu).toBeUndefined();
			expect(entry?.route).toEqual({
				name: PROJECT_DATA_TABLES,
				params: { projectId: 'personal-project', new: 'new' },
			});
		});

		it('renders a Personal + team projects submenu in the global shape', () => {
			enableDataTable();

			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.teamProjectsLimit = -1;
			projectsStore.isTeamProjectFeatureEnabled = true;
			projectsStore.personalProject = { id: 'personal-project' } as Project;
			projectsStore.myProjects = [{ id: '1', name: '1', type: 'team' }] as ProjectListItem[];

			const { menu } = useGlobalEntityCreation();

			const submenu = menu.value.find((item) => item.id === 'data-table')?.submenu;
			expect(submenu?.map((s) => s.id)).toEqual([
				'data-table-title',
				'data-table-personal',
				'data-table-1',
			]);
		});

		it('tracks a telemetry event on select', () => {
			enableDataTable();

			const { handleSelect } = useGlobalEntityCreation();
			handleSelect('data-table-personal');

			expect(trackMock).toHaveBeenCalledWith('User clicked sidebar add data table button');
		});
	});

	describe('instance-ai module', () => {
		const INSTANCE_AI_SETTINGS = {
			enabled: true,
			localGatewayDisabled: false,
			browserUseEnabled: true,
			proxyEnabled: false,
			cloudManaged: false,
			sandboxEnabled: true,
			workflowBuilderAvailable: true,
			sandboxUnavailableReason: null,
			runDebugEnabled: false,
		};

		const enableInstanceAi = () => {
			const settingsStore = mockedStore(useSettingsStore);
			settingsStore.isModuleActive.mockImplementation((name: string) => name === 'instance-ai');
			settingsStore.moduleSettings = { 'instance-ai': { ...INSTANCE_AI_SETTINGS } };
			vi.mocked(hasPermission).mockReturnValue(true);
			return settingsStore;
		};

		it('omits the instance-ai entry when the module is inactive', () => {
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.isTeamProjectFeatureEnabled = false;
			projectsStore.personalProject = { id: 'personal-project' } as Project;

			const { menu } = useGlobalEntityCreation();

			expect(menu.value.find((item) => item.id === 'instance-ai-thread')).toBeUndefined();
		});

		it('omits the instance-ai entry when the module is active but disabled in settings', () => {
			const settingsStore = mockedStore(useSettingsStore);
			settingsStore.isModuleActive.mockImplementation((name: string) => name === 'instance-ai');
			settingsStore.moduleSettings = {
				'instance-ai': { ...INSTANCE_AI_SETTINGS, enabled: false },
			};
			vi.mocked(hasPermission).mockReturnValue(true);

			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.isTeamProjectFeatureEnabled = false;
			projectsStore.personalProject = { id: 'personal-project' } as Project;

			const { menu } = useGlobalEntityCreation();

			expect(menu.value.find((item) => item.id === 'instance-ai-thread')).toBeUndefined();
		});

		it('omits the instance-ai entry when the user lacks the instanceAi:message scope', () => {
			const settingsStore = mockedStore(useSettingsStore);
			settingsStore.isModuleActive.mockImplementation((name: string) => name === 'instance-ai');
			settingsStore.moduleSettings = { 'instance-ai': { ...INSTANCE_AI_SETTINGS } };
			vi.mocked(hasPermission).mockReturnValue(false);

			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.isTeamProjectFeatureEnabled = false;
			projectsStore.personalProject = { id: 'personal-project' } as Project;

			const { menu } = useGlobalEntityCreation();

			expect(menu.value.find((item) => item.id === 'instance-ai-thread')).toBeUndefined();
		});

		it('appends the instance-ai entry as the last item in the community shape', () => {
			enableInstanceAi();

			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.isTeamProjectFeatureEnabled = false;
			projectsStore.personalProject = { id: 'personal-project' } as Project;

			const { menu } = useGlobalEntityCreation();

			expect(menu.value.at(-1)).toStrictEqual(
				expect.objectContaining({
					id: 'instance-ai-thread',
					route: { name: INSTANCE_AI_VIEW },
				}),
			);
		});

		it('appends the instance-ai entry as the last item when team feature is enabled but no team projects exist', () => {
			enableInstanceAi();

			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.teamProjectsLimit = -1;
			projectsStore.isTeamProjectFeatureEnabled = true;
			projectsStore.personalProject = { id: 'personal-project' } as Project;
			projectsStore.myProjects = [];

			const { menu } = useGlobalEntityCreation();

			expect(menu.value.at(-1)).toStrictEqual(
				expect.objectContaining({
					id: 'instance-ai-thread',
					route: { name: INSTANCE_AI_VIEW },
				}),
			);
		});

		it('appends the instance-ai entry as the last item in the global shape', () => {
			enableInstanceAi();

			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.teamProjectsLimit = -1;
			projectsStore.isTeamProjectFeatureEnabled = true;
			projectsStore.personalProject = { id: 'personal-project' } as Project;
			projectsStore.myProjects = [{ id: '1', name: '1', type: 'team' }] as ProjectListItem[];

			const { menu } = useGlobalEntityCreation();

			expect(menu.value.at(-1)).toStrictEqual(
				expect.objectContaining({
					id: 'instance-ai-thread',
					route: { name: INSTANCE_AI_VIEW },
				}),
			);
		});
	});
});
