import { onMounted, ref } from 'vue';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useProjectsStore } from '@/stores/projects.store';

import type { TreeItemType } from '@n8n/design-system/components/N8nSidebar';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import type { ProjectListItem } from '@/types/projects.types';

export const useSidebarData = () => {
	const workflowsStore = useWorkflowsStore();
	const projectsStore = useProjectsStore();

	const personalItems = ref<TreeItemType[]>([]);
	const personalProjectId = ref<string | undefined>();

	const sharedItems = ref<TreeItemType[]>([]);
	const projects = ref<{ title: string; id: string; icon: IconName; items: TreeItemType[] }[]>([]);

	// Ensure data is loaded
	onMounted(async () => {
		await initialLoad();
	});

	async function initialLoad() {
		personalProjectId.value = projectsStore.personalProject?.id;

		await projectsStore.getMyProjects();
		console.log(projectsStore.teamProjects);

		projects.value = projectsStore.teamProjects.map((project: ProjectListItem) => ({
			id: project.id,
			title: project.name || 'Untitled Project',
			icon: (project.icon?.value || 'layers') as IconName,
			type: 'project',
			items: [],
		}));
	}

	async function openProject(projectId: string) {
		const items = await workflowsStore.fetchWorkflowsPage(
			projectId,
			undefined,
			undefined,
			undefined,
			{
				parentFolderId: '0',
			},
			true,
		);

		const itemsToAdd: TreeItemType[] = items.map((item) => ({
			id: item.id,
			label: item.name,
			type: item.resource,
			icon: item.resource === 'workflow' ? undefined : 'folder',
		}));

		if (projectId === projectsStore.personalProject?.id) {
			personalItems.value = itemsToAdd;
		} else {
			projects.value = projects.value.map((project) => {
				if (project.id === projectId) {
					return {
						...project,
						items: itemsToAdd,
					};
				}
				return project;
			});
		}
	}

	async function openFolder(folderId: string, projectId: string) {
		const items = await workflowsStore.fetchWorkflowsPage(
			projectId,
			undefined,
			undefined,
			undefined,
			{
				parentFolderId: folderId,
			},
			true,
		);
		const itemsToAdd: TreeItemType[] = items.map((item) => ({
			id: item.id,
			label: item.name,
			type: item.resource,
			icon: item.resource === 'workflow' ? undefined : 'folder',
		}));

		console.log('openFolder', folderId, projectId, itemsToAdd);

		if (projectId === projectsStore.personalProject?.id) {
			personalItems.value = personalItems.value.map((item) => {
				if (item.id === folderId) {
					return {
						...item,
						items: itemsToAdd,
					};
				}
				return item;
			});
		} else {
			projects.value = projects.value.map((project) => {
				if (project.id === projectId) {
					return {
						...project,
						items: project.items.map((item) => {
							if (item.id === folderId) {
								return {
									...item,
									items: itemsToAdd,
								};
							}
							return item;
						}),
					};
				}
				return project;
			});
		}
	}

	return {
		personalItems,
		personalProjectId,
		sharedItems,
		openProject,
		openFolder,
		projects,
	};
};
