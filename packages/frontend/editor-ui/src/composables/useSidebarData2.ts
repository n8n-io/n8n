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
		console.log(workflow.name, workflow);
		return {
			id: workflow.id,
			label: workflow.name,
			route: { to: `/workflow/${workflow.id}` },
			type: 'workflow',
		};
	}

	async function openProject(id: string) {
		await folderStore.fetchProjectFolders(id);
		await workflowsStore.fetchAllWorkflows(id, true);
	}

	const convertToTreeStructure = computed(() => (projectId: string): IMenuElement[] => {
		const projectFolders = Object.values(folderStore.breadcrumbsCache).filter(
			(f) => f.projectId === projectId,
		);
		const projectWorkflows = workflowsStore.allWorkflows.filter(
			(w) => w.homeProject?.id === projectId,
		);

		function buildTree(
			folders: typeof projectFolders,
			workflows: typeof projectWorkflows,
			parentFolderId: string | null = null,
		): IMenuElement[] {
			const tree: IMenuElement[] = [];

			// Add folders
			const topLevelFolders = folders.filter((folder) =>
				folder.parentFolder ? folder.parentFolder === parentFolderId : parentFolderId === null,
			);

			topLevelFolders.forEach((folder) => {
				const children = buildTree(folders, workflows, folder.id);
				tree.push({
					id: folder.id,
					label: folder.name,
					icon: 'folder' as IconName,
					children,
					route: { to: `/projects/${projectId}/folders/${folder.id}/workflows` },
					type: 'folder',
				});
			});

			// Add workflows that belong to the current parent folder
			workflows
				.filter((workflow) =>
					parentFolderId ? workflow.parentFolder?.id === parentFolderId : !workflow.parentFolder,
				)
				.forEach((workflow) => {
					tree.push(workflowToMenuItem(workflow));
				});

			return tree;
		}

		return buildTree(projectFolders, projectWorkflows);
	});

	const sharedWorkflows = computed(() =>
		workflowsStore.allWorkflows
			.filter((workflow) => {
				return workflow.sharedWithProjects?.find((p) => p.id === projectsStore.personalProject?.id);
			})
			.map((w) => {
				return workflowToMenuItem(w);
			}),
	);

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
			children: convertToTreeStructure.value(projectsStore.personalProject?.id as string),
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
			children:
				sharedWorkflows.value.length > 0
					? sharedWorkflows.value
					: [{ id: 'empty', label: 'No shared workflows', type: 'empty', available: false }],
		},
	]);

	const topItemsFiltered = computed(() => topItems.value.filter((item) => item.available));

	const projectItems = computed<IMenuElement[]>(() =>
		projectsStore.myProjects
			.filter((p) => p.type === 'team')
			.map((project) => {
				const children = convertToTreeStructure.value(project.id);
				return {
					id: project.id,
					label: project.name as string,
					icon: (project.icon?.value || 'layers') as IconName,
					route: { to: `/projects/${project.id}/workflows` },
					children:
						children.length > 0
							? convertToTreeStructure.value(project.id)
							: [
									{
										id: 'empty',
										label: 'No workflows or folders',
										type: 'empty',
										available: false,
									},
								],
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
		convertToTreeStructure,
	};
}
