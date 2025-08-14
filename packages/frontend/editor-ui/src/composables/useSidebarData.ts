import { onMounted, ref } from 'vue';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useProjectsStore } from '@/stores/projects.store';

import type { TreeItemType } from '@n8n/design-system/components/N8nSidebar';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';

export const useSidebarData = () => {
	const workflowsStore = useWorkflowsStore();
	const projectsStore = useProjectsStore();

	const personalItems = ref<TreeItemType[]>([]);
	const personalProjectId = ref<string | undefined>();

	const sharedItems = ref<TreeItemType[]>([]);
	const projects = ref<{ title: string; id: string; icon: IconName; items: TreeItemType[] }[]>([]);

	onMounted(async () => {
		await initialLoad();
	});

	async function initialLoad() {
		personalProjectId.value = projectsStore.personalProject?.id;

		await projectsStore.getMyProjects();

		projects.value = projectsStore.teamProjects.map((project) => ({
			id: project.id,
			title: project.name || 'Untitled Project',
			icon: (project.icon?.value || 'layers') as IconName,
			type: 'project',
			items: [],
		}));
	}

	async function openShared() {
		const items = await workflowsStore.fetchWorkflowsPage(
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			false,
			undefined,
		);

		console.log('Shared items', items);
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
			children: item.resource === 'folder' ? [] : undefined,
		}));

		if (projectId === 'shared') {
			sharedItems.value = itemsToAdd;
			return;
		}
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

	function updateNestedFolder(
		items: TreeItemType[],
		folderId: string,
		newChildren: TreeItemType[],
	): TreeItemType[] {
		return items.map((item) => {
			if (item.id === folderId) {
				return {
					...item,
					children: newChildren,
				};
			}
			if (item.type === 'folder' && item.children) {
				return {
					...item,
					children: updateNestedFolder(item.children, folderId, newChildren),
				};
			}
			return item;
		});
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
			children: item.resource === 'folder' ? [] : undefined,
		}));

		if (projectId === projectsStore.personalProject?.id) {
			personalItems.value = updateNestedFolder(personalItems.value, folderId, itemsToAdd);
		} else {
			projects.value = projects.value.map((project) => {
				if (project.id === projectId) {
					return {
						...project,
						items: updateNestedFolder(project.items, folderId, itemsToAdd),
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
		openShared,
		projects,
	};
};
