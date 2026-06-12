import { computed, ref } from 'vue';
import { EnterpriseEditionFeature, VIEWS } from '@/app/constants';
import { AGENTS_MODULE_NAME, NEW_AGENT_VIEW } from '@/features/agents/constants';
import { INSTANCE_AI_VIEW } from '@/features/ai/instanceAi/constants';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { sortByProperty } from '@n8n/utils/sort/sortByProperty';
import { useToast } from '@/app/composables/useToast';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { VARIABLE_MODAL_KEY } from '@/features/settings/environments.ee/environments.constants';
import { PROJECT_DATA_TABLES } from '@/features/core/dataTable/constants';
import { getResourcePermissions } from '@n8n/permissions';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { hasPermission } from '@/app/utils/rbac/permissions';
import type { Scope } from '@n8n/permissions';
import type { RouteLocationRaw } from 'vue-router';
import { updatedIconSet, type IconName } from '@n8n/design-system/components/N8nIcon/icons';

type ProjectIcon = IconName | { type: 'icon'; value: IconName } | { type: 'emoji'; value: string };

const isIconName = (icon: unknown): icon is IconName =>
	typeof icon === 'string' && Object.keys(updatedIconSet).includes(icon);

const isProjectIcon = (icon: unknown): icon is ProjectIcon =>
	isIconName(icon) ||
	(typeof icon === 'object' &&
		icon !== null &&
		'value' in icon &&
		typeof icon.value === 'string' &&
		'type' in icon &&
		(icon.type === 'emoji' || (icon.type === 'icon' && isIconName(icon.value))));

type BaseItem = {
	id: string;
	title: string;
	disabled?: boolean;
	icon?: ProjectIcon;
	route?: RouteLocationRaw;
};

type Item = BaseItem & {
	submenu?: BaseItem[];
};

export const useGlobalEntityCreation = () => {
	const CREATE_PROJECT_ID = 'create-project';
	const WORKFLOWS_MENU_ID = 'workflow';
	const CREDENTIALS_MENU_ID = 'credential';
	const VARIABLE_MENU_ID = 'variable';
	const DATA_TABLE_MENU_ID = 'data-table';
	const AGENTS_MENU_ID = 'agent';
	const INSTANCE_AI_THREAD_MENU_ID = 'instance-ai-thread';
	const DEFAULT_ICON: IconName = 'layers';

	const settingsStore = useSettingsStore();
	const cloudPlanStore = useCloudPlanStore();
	const projectsStore = useProjectsStore();
	const sourceControlStore = useSourceControlStore();
	const usersStore = useUsersStore();
	const uiStore = useUIStore();

	const router = useRouter();
	const i18n = useI18n();
	const toast = useToast();
	const telemetry = useTelemetry();

	const isCreatingProject = ref(false);

	const displayProjects = computed(() =>
		sortByProperty(
			'name',
			projectsStore.myProjects.filter((p) => p.type === 'team'),
		),
	);

	const disabledWorkflow = (scopes: Scope[] = []): boolean =>
		sourceControlStore.preferences.branchReadOnly ||
		!getResourcePermissions(scopes).workflow.create;

	const disabledCredential = (scopes: Scope[] = []): boolean =>
		sourceControlStore.preferences.branchReadOnly ||
		!getResourcePermissions(scopes).credential.create;

	const disabledAgent = (scopes: Scope[] = []): boolean =>
		sourceControlStore.preferences.branchReadOnly || !getResourcePermissions(scopes).agent?.create;

	const isAgentsModuleActive = computed(() => settingsStore.isModuleActive(AGENTS_MODULE_NAME));

	const isInstanceAiAvailable = computed(
		() =>
			settingsStore.isModuleActive('instance-ai') &&
			settingsStore.moduleSettings['instance-ai']?.enabled !== false &&
			hasPermission(['rbac'], { rbac: { scope: 'instanceAi:message' } }),
	);

	const instanceAiThreadItem = computed<Item | null>(() =>
		isInstanceAiAvailable.value
			? {
					id: INSTANCE_AI_THREAD_MENU_ID,
					title: i18n.baseText('projects.menu.create.instanceAiThread'),
					route: { name: INSTANCE_AI_VIEW },
				}
			: null,
	);

	const disabledDataTable = (scopes: Scope[] = []): boolean =>
		sourceControlStore.preferences.branchReadOnly ||
		!getResourcePermissions(scopes).dataTable?.create;

	const variableScopeSubmenu = computed<BaseItem[]>(() => {
		const readOnly = sourceControlStore.preferences.branchReadOnly;
		return [
			{ id: 'variable-title', title: 'Create in', disabled: true },
			{
				id: 'variable-global',
				title: i18n.baseText('variables.modal.scope.global'),
				icon: 'database',
				disabled:
					readOnly ||
					!getResourcePermissions(usersStore.currentUser?.globalScopes).variable?.create,
			},
			{
				id: 'variable-personal',
				title: i18n.baseText('projects.menu.personal'),
				icon: 'user',
				disabled:
					readOnly ||
					!getResourcePermissions(projectsStore.personalProject?.scopes).projectVariable?.create,
			},
			...displayProjects.value.map((project) => ({
				id: `variable-${project.id}`,
				title: project.name as string,
				icon: isProjectIcon(project.icon) ? project.icon : DEFAULT_ICON,
				disabled: readOnly || !getResourcePermissions(project.scopes).projectVariable?.create,
			})),
		];
	});

	const variableItem = computed<Item | null>(() => {
		if (!settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Variables]) return null;
		const readOnly = sourceControlStore.preferences.branchReadOnly;
		return {
			id: VARIABLE_MENU_ID,
			title: i18n.baseText('projects.menu.create.variable'),
			disabled: readOnly,
			...(!readOnly && { submenu: variableScopeSubmenu.value }),
		};
	});

	const dataTableScopeSubmenu = computed<BaseItem[]>(() => [
		{ id: 'data-table-title', title: 'Create in', disabled: true },
		{
			id: 'data-table-personal',
			title: i18n.baseText('projects.menu.personal'),
			icon: 'user',
			disabled: disabledDataTable(projectsStore.personalProject?.scopes),
			route: {
				name: PROJECT_DATA_TABLES,
				params: { projectId: projectsStore.personalProject?.id, new: 'new' },
			},
		},
		...displayProjects.value.map((project) => ({
			id: `data-table-${project.id}`,
			title: project.name as string,
			icon: isProjectIcon(project.icon) ? project.icon : DEFAULT_ICON,
			disabled: disabledDataTable(project.scopes),
			route: {
				name: PROJECT_DATA_TABLES,
				params: { projectId: project.id, new: 'new' },
			},
		})),
	]);

	const dataTableItem = computed<Item | null>(() => {
		if (!settingsStore.isDataTableFeatureEnabled) return null;
		const readOnly = sourceControlStore.preferences.branchReadOnly;
		if (displayProjects.value.length === 0) {
			return {
				id: DATA_TABLE_MENU_ID,
				title: i18n.baseText('projects.menu.create.dataTable'),
				disabled: disabledDataTable(projectsStore.personalProject?.scopes),
				route: {
					name: PROJECT_DATA_TABLES,
					params: { projectId: projectsStore.personalProject?.id, new: 'new' },
				},
			};
		}
		return {
			id: DATA_TABLE_MENU_ID,
			title: i18n.baseText('projects.menu.create.dataTable'),
			disabled: readOnly,
			...(!readOnly && { submenu: dataTableScopeSubmenu.value }),
		};
	});

	const menu = computed<Item[]>(() => {
		const workflowTitle = i18n.baseText('projects.menu.create.workflow');
		const credentialTitle = i18n.baseText('projects.menu.create.credential');
		const agentTitle = i18n.baseText('projects.menu.create.agent');
		const projectTitle = i18n.baseText('projects.menu.create.project');
		const instanceAiTrailing = instanceAiThreadItem.value ? [instanceAiThreadItem.value] : [];
		const variableTrailing = variableItem.value ? [variableItem.value] : [];
		const dataTableTrailing = dataTableItem.value ? [dataTableItem.value] : [];

		// Community
		if (!projectsStore.isTeamProjectFeatureEnabled) {
			return [
				{
					id: 'workflow',
					title: workflowTitle,
					route: {
						name: VIEWS.NEW_WORKFLOW,
						query: {
							projectId: projectsStore.personalProject?.id,
						},
					},
				},
				{
					id: 'credential',
					title: credentialTitle,
					route: {
						name: VIEWS.CREDENTIALS,
						params: {
							projectId: projectsStore.personalProject?.id,
							credentialId: 'create',
						},
					},
				},
				...variableTrailing,
				...dataTableTrailing,
				...(isAgentsModuleActive.value
					? [
							{
								id: AGENTS_MENU_ID,
								title: agentTitle,
								route: {
									name: NEW_AGENT_VIEW,
									query: { projectId: projectsStore.personalProject?.id },
								},
							},
						]
					: []),
				{
					id: CREATE_PROJECT_ID,
					title: projectTitle,
					disabled: true,
				},
				...instanceAiTrailing,
			];
		}

		// Team feature enabled but no team projects: skip submenus
		if (displayProjects.value.length === 0) {
			return [
				{
					id: WORKFLOWS_MENU_ID,
					title: workflowTitle,
					disabled:
						sourceControlStore.preferences.branchReadOnly ||
						disabledWorkflow(projectsStore.personalProject?.scopes),
					route: {
						name: VIEWS.NEW_WORKFLOW,
						query: { projectId: projectsStore.personalProject?.id },
					},
				},
				{
					id: CREDENTIALS_MENU_ID,
					title: credentialTitle,
					disabled:
						sourceControlStore.preferences.branchReadOnly ||
						disabledCredential(projectsStore.personalProject?.scopes),
					route: {
						name: VIEWS.PROJECTS_CREDENTIALS,
						params: { projectId: projectsStore.personalProject?.id, credentialId: 'create' },
					},
				},
				...variableTrailing,
				...dataTableTrailing,
				...(isAgentsModuleActive.value
					? [
							{
								id: AGENTS_MENU_ID,
								title: agentTitle,
								disabled: disabledAgent(projectsStore.personalProject?.scopes),
								route: {
									name: NEW_AGENT_VIEW,
									query: { projectId: projectsStore.personalProject?.id },
								},
							},
						]
					: []),
				{
					id: CREATE_PROJECT_ID,
					title: projectTitle,
					disabled:
						!projectsStore.canCreateProjects || !projectsStore.hasPermissionToCreateProjects,
				},
				...instanceAiTrailing,
			] satisfies Item[];
		}

		// global
		return [
			{
				id: WORKFLOWS_MENU_ID,
				title: workflowTitle,
				disabled: sourceControlStore.preferences.branchReadOnly,

				...(!sourceControlStore.preferences.branchReadOnly && {
					submenu: [
						{
							id: 'workflow-title',
							title: 'Create in',
							disabled: true,
						},
						{
							id: 'workflow-personal',
							title: i18n.baseText('projects.menu.personal'),
							icon: 'user',
							disabled: disabledWorkflow(projectsStore.personalProject?.scopes),
							route: {
								name: VIEWS.NEW_WORKFLOW,
								query: { projectId: projectsStore.personalProject?.id },
							},
						},
						...displayProjects.value.map((project) => ({
							id: `workflow-${project.id}`,
							title: project.name as string,
							icon: isProjectIcon(project.icon) ? project.icon : DEFAULT_ICON,
							disabled: disabledWorkflow(project.scopes),
							route: {
								name: VIEWS.NEW_WORKFLOW,
								query: { projectId: project.id },
							},
						})),
					],
				}),
			},
			{
				id: CREDENTIALS_MENU_ID,
				title: credentialTitle,
				disabled: sourceControlStore.preferences.branchReadOnly,
				...(!sourceControlStore.preferences.branchReadOnly && {
					submenu: [
						{
							id: 'credential-title',
							title: 'Create in',
							disabled: true,
						},
						{
							id: 'credential-personal',
							title: i18n.baseText('projects.menu.personal'),
							icon: 'user',
							disabled: disabledCredential(projectsStore.personalProject?.scopes),
							route: {
								name: VIEWS.PROJECTS_CREDENTIALS,
								params: { projectId: projectsStore.personalProject?.id, credentialId: 'create' },
							},
						},
						...displayProjects.value.map((project) => ({
							id: `credential-${project.id}`,
							title: project.name as string,
							icon: isProjectIcon(project.icon) ? project.icon : DEFAULT_ICON,
							disabled: disabledCredential(project.scopes),
							route: {
								name: VIEWS.PROJECTS_CREDENTIALS,
								params: { projectId: project.id, credentialId: 'create' },
							},
						})),
					],
				}),
			},
			...variableTrailing,
			...dataTableTrailing,
			...(isAgentsModuleActive.value
				? [
						{
							id: AGENTS_MENU_ID,
							title: agentTitle,
							disabled: sourceControlStore.preferences.branchReadOnly,
							...(!sourceControlStore.preferences.branchReadOnly && {
								submenu: [
									{
										id: 'agent-title',
										title: 'Create in',
										disabled: true,
									},
									{
										id: 'agent-personal',
										title: i18n.baseText('projects.menu.personal'),
										icon: 'user' as const,
										disabled: disabledAgent(projectsStore.personalProject?.scopes),
										route: {
											name: NEW_AGENT_VIEW,
											query: { projectId: projectsStore.personalProject?.id },
										},
									},
									...displayProjects.value.map((project) => ({
										id: `agent-${project.id}`,
										title: project.name as string,
										icon: isProjectIcon(project.icon) ? project.icon : DEFAULT_ICON,
										disabled: disabledAgent(project.scopes),
										route: {
											name: NEW_AGENT_VIEW,
											query: { projectId: project.id },
										},
									})),
								],
							}),
						},
					]
				: []),
			{
				id: CREATE_PROJECT_ID,
				title: projectTitle,
				disabled: !projectsStore.canCreateProjects || !projectsStore.hasPermissionToCreateProjects,
			},
			...instanceAiTrailing,
		] satisfies Item[];
	});

	const createProject = async (uiContext?: string) => {
		isCreatingProject.value = true;

		try {
			const newProject = await projectsStore.createProject({
				name: i18n.baseText('projects.settings.newProjectName'),
				icon: { type: 'icon', value: DEFAULT_ICON },
				uiContext,
			});
			await router.push({ name: VIEWS.PROJECT_SETTINGS, params: { projectId: newProject.id } });
			toast.showMessage({
				title: i18n.baseText('projects.settings.save.successful.title', {
					interpolate: { projectName: newProject.name as string },
				}),
				type: 'success',
			});
		} catch (error) {
			toast.showError(error, i18n.baseText('projects.error.title'));
		} finally {
			isCreatingProject.value = false;
		}
	};

	const handleSelect = (id: string) => {
		if (id.startsWith('variable-') && id !== 'variable-title') {
			const projectId =
				id === 'variable-global'
					? ''
					: id === 'variable-personal'
						? (projectsStore.personalProject?.id ?? '')
						: id.slice('variable-'.length);
			uiStore.openModalWithData({ name: VARIABLE_MODAL_KEY, data: { mode: 'new', projectId } });
			telemetry.track('User clicked sidebar add variable button');
			return;
		}

		if (id.startsWith(DATA_TABLE_MENU_ID) && id !== 'data-table-title') {
			telemetry.track('User clicked sidebar add data table button');
			return;
		}

		if (id !== CREATE_PROJECT_ID) return;

		if (projectsStore.canCreateProjects && projectsStore.hasPermissionToCreateProjects) {
			void createProject('universal_button');
			return;
		}

		void usePageRedirectionHelper().goToUpgrade('rbac', 'upgrade-rbac');
	};

	const projectsLimitReachedMessage = computed(() => {
		if (!projectsStore.hasPermissionToCreateProjects) {
			return i18n.baseText('projects.create.permissionDenied');
		}

		if (settingsStore.isCloudDeployment) {
			return i18n.baseText('projects.create.limitReached.cloud', {
				interpolate: {
					planName: cloudPlanStore.currentPlanData?.displayName ?? '',
					limit: projectsStore.teamProjectsLimit,
				},
			});
		}

		if (!projectsStore.isTeamProjectFeatureEnabled) {
			return i18n.baseText('projects.create.limitReached.self');
		}

		return i18n.baseText('projects.create.limitReached', {
			interpolate: {
				limit: projectsStore.teamProjectsLimit,
			},
		});
	});

	const createProjectAppendSlotName = computed(() => `item.append.${CREATE_PROJECT_ID}`);
	const createWorkflowsAppendSlotName = computed(() => `item.append.${WORKFLOWS_MENU_ID}`);
	const createCredentialsAppendSlotName = computed(() => `item.append.${CREDENTIALS_MENU_ID}`);
	const hasPermissionToCreateProjects = projectsStore.hasPermissionToCreateProjects;

	const upgradeLabel = computed(() => {
		if (settingsStore.isCloudDeployment) {
			return i18n.baseText('generic.upgrade');
		}

		if (!projectsStore.isTeamProjectFeatureEnabled) {
			return i18n.baseText('generic.enterprise');
		}

		return i18n.baseText('generic.upgrade');
	});

	return {
		menu,
		handleSelect,
		createProjectAppendSlotName,
		createWorkflowsAppendSlotName,
		createCredentialsAppendSlotName,
		projectsLimitReachedMessage,
		hasPermissionToCreateProjects,
		upgradeLabel,
		createProject,
		isCreatingProject,
		displayProjects,
	};
};
