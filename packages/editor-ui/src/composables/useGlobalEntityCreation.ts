import { computed, ref } from 'vue';
import { VIEWS } from '@/constants';
import { useRouter } from 'vue-router';
import { useI18n } from '@/composables/useI18n';
import { sortByProperty } from '@/utils/sortUtils';
import { useToast } from '@/composables/useToast';
import { useProjectsStore } from '@/stores/projects.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { getResourcePermissions } from '@/permissions';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';
import type { Scope } from '@n8n/permissions';
import type { RouteLocationRaw } from 'vue-router';

type BaseItem = {
	id: string;
	title: string;
	disabled?: boolean;
	icon?: string;
	route?: RouteLocationRaw;
};

type Item = BaseItem & {
	submenu?: BaseItem[];
};

export const useGlobalEntityCreation = () => {
	const CREATE_PROJECT_ID = 'create-project';
	const WORKFLOWS_MENU_ID = 'workflow';
	const CREDENTIALS_MENU_ID = 'credential';

	const settingsStore = useSettingsStore();
	const cloudPlanStore = useCloudPlanStore();
	const projectsStore = useProjectsStore();
	const sourceControlStore = useSourceControlStore();
	const router = useRouter();
	const i18n = useI18n();
	const toast = useToast();

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

	const menu = computed<Item[]>(() => {
		// Community
		if (!projectsStore.isTeamProjectFeatureEnabled) {
			return [
				{
					id: 'workflow',
					title: 'Workflow',
					route: {
						name: VIEWS.NEW_WORKFLOW,
						query: {
							projectId: projectsStore.personalProject?.id,
						},
					},
				},
				{
					id: 'credential',
					title: 'Credential',
					route: {
						name: VIEWS.CREDENTIALS,
						params: {
							projectId: projectsStore.personalProject?.id,
							credentialId: 'create',
						},
					},
				},
				{
					id: CREATE_PROJECT_ID,
					title: 'Project',
					disabled: true,
				},
			];
		}

		// global
		return [
			{
				id: WORKFLOWS_MENU_ID,
				title: 'Workflow',
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
							icon: 'layer-group',
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
				title: 'Credential',
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
							icon: 'layer-group',
							disabled: disabledCredential(project.scopes),
							route: {
								name: VIEWS.PROJECTS_CREDENTIALS,
								params: { projectId: project.id, credentialId: 'create' },
							},
						})),
					],
				}),
			},
			{
				id: CREATE_PROJECT_ID,
				title: 'Project',
				disabled: !projectsStore.canCreateProjects,
			},
		];
	});

	const createProject = async () => {
		isCreatingProject.value = true;

		try {
			const newProject = await projectsStore.createProject({
				name: i18n.baseText('projects.settings.newProjectName'),
				icon: { type: 'icon', value: 'layer-group' },
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
		if (id !== CREATE_PROJECT_ID) return;

		if (projectsStore.canCreateProjects) {
			void createProject();
			return;
		}

		void usePageRedirectionHelper().goToUpgrade('rbac', 'upgrade-rbac');
	};

	const projectsLimitReachedMessage = computed(() => {
		if (settingsStore.isCloudDeployment) {
			return i18n.baseText('projects.create.limitReached.cloud', {
				adjustToNumber: projectsStore.teamProjectsLimit,
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
			adjustToNumber: projectsStore.teamProjectsLimit,
			interpolate: {
				limit: projectsStore.teamProjectsLimit,
			},
		});
	});

	const createProjectAppendSlotName = computed(() => `item.append.${CREATE_PROJECT_ID}`);
	const createWorkflowsAppendSlotName = computed(() => `item.append.${WORKFLOWS_MENU_ID}`);
	const createCredentialsAppendSlotName = computed(() => `item.append.${CREDENTIALS_MENU_ID}`);

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
		upgradeLabel,
		createProject,
		isCreatingProject,
		displayProjects,
	};
};
