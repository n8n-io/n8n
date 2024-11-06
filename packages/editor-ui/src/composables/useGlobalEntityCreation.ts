import { computed, toValue, type ComputedRef, type Ref } from 'vue';
import { VIEWS } from '@/constants';
import { useRouter } from 'vue-router';
import { useI18n } from '@/composables/useI18n';
import { sortByProperty } from '@/utils/sortUtils';
import { useToast } from '@/composables/useToast';
import { useProjectsStore } from '@/stores/projects.store';
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

export const useGlobalEntityCreation = (
	multipleProjects: Ref<boolean> | ComputedRef<boolean> | boolean = true,
) => {
	const CREATE_PROJECT_ID = 'create-project';

	const projectsStore = useProjectsStore();
	const sourceControlStore = useSourceControlStore();
	const router = useRouter();
	const i18n = useI18n();
	const toast = useToast();
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
		if (!projectsStore.canCreateProjects) {
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
			];
		}

		// single project
		if (!toValue(multipleProjects)) {
			return [
				{
					id: 'workflow',
					title: 'Workflow',
					disabled: disabledWorkflow(projectsStore.currentProject?.scopes),
					route: {
						name: VIEWS.NEW_WORKFLOW,
						query: {
							projectId: projectsStore.currentProject?.id,
						},
					},
				},
				{
					id: 'credential',
					title: 'Credential',
					disabled: disabledCredential(projectsStore.currentProject?.scopes),
					route: {
						name: VIEWS.PROJECTS_CREDENTIALS,
						params: {
							projectId: projectsStore.currentProject?.id,
							credentialId: 'create',
						},
					},
				},
			];
		}

		// global
		return [
			{
				id: 'workflow',
				title: 'Workflow',
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
			},
			{
				id: 'credential',
				title: 'Credential',
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
			},
			{
				id: CREATE_PROJECT_ID,
				title: 'Project',
			},
		];
	});

	const createProject = async () => {
		try {
			const newProject = await projectsStore.createProject({
				name: i18n.baseText('projects.settings.newProjectName'),
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

	return { menu, handleSelect };
};
