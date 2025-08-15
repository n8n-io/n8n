import { computed, onMounted, ref } from 'vue';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useProjectsStore } from '@/stores/projects.store';
import { IMenuElement, isCustomMenuItem, N8nText } from '@n8n/design-system';
import { WorkflowListResource } from '@/Interface';
import { useUsersStore } from '@/stores/users.store';
import { useSettingsStore } from '@/stores/settings.store';

export const useSidebarData = () => {
	const workflowsStore = useWorkflowsStore();
	const projectsStore = useProjectsStore();
	const usersStore = useUsersStore();
	const settingsStore = useSettingsStore();

	const hasMultipleVerifiedUsers = computed(
		() => usersStore.allUsers.filter((user) => user.isPendingUser === false).length > 1,
	);

	const isFoldersFeatureEnabled = computed(() => settingsStore.isFoldersFeatureEnabled);

	const items = ref<IMenuElement[]>([
		{
			id: 'overview',
			label: 'Overview',
			icon: 'house',
			route: { to: '/home/workflows' },
			type: 'other',
		},
		{
			id: projectsStore.personalProject?.id || 'personal-project',
			label: 'Personal',
			icon: 'user',
			route: { to: `/projects/${projectsStore.personalProject?.id}/workflows` },
			children: [],
			type: 'project',
		},
	]);

	onMounted(async () => {
		await initialLoad();
	});

	function buildNestedHierarchy(flatList: WorkflowListResource[]): IMenuElement[] {
		const itemMap = new Map<string, IMenuElement>();
		const rootItems: IMenuElement[] = [];

		// First pass: create all items
		for (const item of flatList) {
			const menuElement: IMenuElement = {
				id: item.id,
				label: item.name,
				icon: item.resource === 'folder' ? 'folder' : undefined,
				route: item.resource === 'workflow' ? { to: `/workflows/${item.id}` } : undefined,
				children: item.resource === 'folder' ? [] : undefined,
				type: item.resource,
			};
			itemMap.set(item.id, menuElement);
		}

		for (const item of flatList) {
			const menuElement = itemMap.get(item.id);
			if (!menuElement) continue;

			if (item.parentFolder) {
				const parentElement = itemMap.get(item.parentFolder.id);
				if (parentElement && !isCustomMenuItem(parentElement) && parentElement.children) {
					parentElement.children.push(menuElement);
				} else {
					rootItems.push(menuElement);
				}
			} else {
				rootItems.push(menuElement);
			}
		}

		return rootItems;
	}

	async function initialLoad() {
		if (projectsStore.personalProject) {
			const workflows = await workflowsStore.fetchWorkflowsPage(
				projectsStore.personalProject.id,
				undefined,
				undefined,
				undefined,
				{},
				true,
			);

			items.value[1].children = buildNestedHierarchy(workflows);
		}

		// check if user has shared access, push to it
		if (hasMultipleVerifiedUsers.value) {
			const workflows = await workflowsStore.fetchWorkflowsPage(
				undefined,
				undefined,
				undefined,
				undefined,
				{},
				undefined,
				true,
			);

			const sharedItem: IMenuElement = {
				id: 'shared',
				label: 'Shared with me',
				icon: 'share',
				route: { to: '/shared/workflows' },
				children: buildNestedHierarchy(workflows),
				type: 'project',
			};

			items.value.push(sharedItem);
		}

		// check if user has access to projects, push workflows
		// push seperator first
		if (isFoldersFeatureEnabled.value) {
			items.value.push({
				id: 'projects-separator',
				label: 'Projects',
				type: 'subtitle',
			});

			await projectsStore.getMyProjects();

			for (const project of projectsStore.teamProjects) {
				const workflows = await workflowsStore.fetchWorkflowsPage(
					project.id,
					undefined,
					undefined,
					undefined,
					{},
					true,
				);

				const projectItem: IMenuElement = {
					id: project.id,
					label: project.name,
					icon: project.icon?.value || 'layers',
					route: { to: `/projects/${project.id}/workflows` },
					children: buildNestedHierarchy(workflows),
					type: 'project',
				};

				items.value.push(projectItem);
			}
		}

		// push menu items
	}

	return {
		items,
	};
};
