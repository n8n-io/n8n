import { IWorkflowDb } from '@/Interface';
import { useFoldersStore } from '@/stores/folders.store';
import { useProjectsStore } from '@/stores/projects.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { IMenuElement } from '@n8n/design-system';
import { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import { computed, onBeforeMount } from 'vue';

export function useSidebarData2() {
	const projectsStore = useProjectsStore();
	const folderStore = useFoldersStore();
	const workflowsStore = useWorkflowsStore();
	const settingsStore = useSettingsStore();
	const usersStore = useUsersStore();

	const showShared = computed(
		() => usersStore.allUsers.filter((user) => user.isPendingUser === false).length > 1,
	);

	const showProjects = computed(
		() => settingsStore.isFoldersFeatureEnabled || projectsStore.isTeamProjectFeatureEnabled,
	);

	const canCreateProject = computed(() => projectsStore.hasPermissionToCreateProjects);

	onBeforeMount(async () => {
		await projectsStore.getAllProjects();
	});

	function workflowToMenuItem(workflow: IWorkflowDb): IMenuElement {
		return {
			id: workflow.id,
			label: workflow.name,
			route: { to: `/workflow/${workflow.id}` },
			type: 'workflow',
		};
	}

	async function openProject(id: string) {
		console.log(id);
		const workflowsAndFolders = await workflowsStore.fetchWorkflowsPage(
			id,
			undefined,
			undefined,
			undefined,
			undefined,
			true,
		);

		console.log(workflowsAndFolders);
	}

	const topItems = computed<IMenuElement[]>(() => [
		{
			id: 'overview',
			label: 'Overview',
			icon: 'house',
			route: { to: '/home/workflows' },
			type: 'other',
			available: true,
		},
		{
			id: projectsStore.personalProject?.id as string,
			label: 'Personal',
			icon: 'user',
			route: { to: `/projects/${projectsStore.personalProject?.id}/workflows` },
			children: workflowsStore.allWorkflows
				.filter((workflow) => workflow.homeProject?.id === projectsStore.personalProject?.id)
				.map(workflowToMenuItem),
			type: 'project',
			available: true,
		},
		{
			id: 'shared',
			label: 'Shared',
			icon: 'users',
			route: { to: '/shared/workflows' },
			available: showShared.value,
			type: 'project',
			children: workflowsStore.allWorkflows
				.filter((workflow) => {
					return (
						workflow.homeProject?.id !== projectsStore.personalProject?.id &&
						workflow.homeProject?.type !== 'team'
					);
				})
				.map((w) => {
					return workflowToMenuItem(w);
				}),
		},
	]);

	const topItemsFiltered = computed(() => topItems.value.filter((item) => item.available));

	const projectItems = computed<IMenuElement[]>(() =>
		projectsStore.teamProjects.map((project) => {
			const workflows = workflowsStore.allWorkflows
				.filter((workflow) => workflow.homeProject?.id === project.id)
				.map(workflowToMenuItem);

			return {
				id: project.id,
				label: project.name as string,
				icon: (project.icon?.value || 'layers') as IconName,
				route: { to: `/projects/${project.id}/workflows` },
				children:
					workflows.length > 0
						? workflows
						: [{ id: `${project.id}-empty`, label: 'No workflows', type: 'empty' }],
				type: 'project',
			};
		}),
	);

	return {
		topItems: topItemsFiltered,
		openProject,
		projectItems,
		showProjects,
		canCreateProject,
		showShared,
	};
}
