import { computed, onMounted, ref } from 'vue';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useProjectsStore } from '@/stores/projects.store';
import { IMenuElement, IMenuItem, isCustomMenuItem } from '@n8n/design-system';
import { WorkflowListResource } from '@/Interface';
import { useUsersStore } from '@/stores/users.store';
import { useSettingsStore } from '@/stores/settings.store';
import { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import { hasPermission } from '@/utils/rbac/permissions';
import { VIEWS } from '@/constants';
import { useTemplatesStore } from '@/stores/templates.store';
import { useI18n } from '@n8n/i18n';

export const useSidebarData = () => {
	const workflowsStore = useWorkflowsStore();
	const projectsStore = useProjectsStore();
	const usersStore = useUsersStore();
	const settingsStore = useSettingsStore();
	const templatesStore = useTemplatesStore();
	const i18n = useI18n();

	const hasMultipleVerifiedUsers = computed(
		() => usersStore.allUsers.filter((user) => user.isPendingUser === false).length > 1,
	);

	const isFoldersFeatureEnabled = computed(() => settingsStore.isFoldersFeatureEnabled);

	const bottomMenuItems = computed<IMenuItem[]>(() => [
		{
			id: 'cloud-admin',
			position: 'bottom',
			label: 'Admin Panel',
			icon: 'cloud',
			available: settingsStore.isCloudDeployment && hasPermission(['instanceOwner']),
			type: 'other',
		},
		{
			// Link to in-app templates, available if custom templates are enabled
			id: 'templates',
			icon: 'package-open',
			label: i18n.baseText('mainSidebar.templates'),
			position: 'bottom',
			available: settingsStore.isTemplatesEnabled && templatesStore.hasCustomTemplatesHost,
			route: { to: { name: VIEWS.TEMPLATES } },
			type: 'other',
		},
		{
			// Link to website templates, available if custom templates are not enabled
			id: 'templates',
			icon: 'package-open',
			label: i18n.baseText('mainSidebar.templates'),
			position: 'bottom',
			available: settingsStore.isTemplatesEnabled && !templatesStore.hasCustomTemplatesHost,
			type: 'other',
			link: {
				href: templatesStore.websiteTemplateRepositoryURL,
				target: '_blank',
			},
		},
		{
			id: 'variables',
			icon: 'variable',
			label: i18n.baseText('mainSidebar.variables'),
			position: 'bottom',
			type: 'other',
			route: { to: { name: VIEWS.VARIABLES } },
		},
		{
			id: 'insights',
			icon: 'chart-column-decreasing',
			label: 'Insights',
			position: 'bottom',
			route: { to: { name: VIEWS.INSIGHTS } },
			type: 'other',
			available:
				settingsStore.isModuleActive('insights') &&
				hasPermission(['rbac'], { rbac: { scope: 'insights:list' } }),
		},
	]);

	const visibleBottomMenuItems = computed(() => {
		return bottomMenuItems.value.filter((item) => item.available !== false);
	});

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
		await workflowsStore.fetchAllWorkflows();
		await projectsStore.getAllProjects();
		await initialLoad();
	});

	function buildNestedHierarchy(
		flatList: WorkflowListResource[],
		projectId?: string,
	): IMenuElement[] {
		const itemMap = new Map<string, IMenuElement>();
		const rootItems: IMenuElement[] = [];

		// First pass: create all items
		for (const item of flatList) {
			const menuElement: IMenuElement = {
				id: item.id,
				label: item.name,
				icon: item.resource === 'folder' ? 'folder' : undefined,
				route:
					item.resource === 'workflow'
						? { to: `/workflow/${item.id}` }
						: { to: `/projects/${projectId}/folders/${item.id}/workflows` },
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

		// Add empty state for folders with no children
		for (const [, menuElement] of itemMap) {
			if (
				!isCustomMenuItem(menuElement) &&
				menuElement.type === 'folder' &&
				menuElement.children &&
				menuElement.children.length === 0
			) {
				menuElement.children.push({
					id: `${menuElement.id}-empty`,
					label: 'No items in this folder',
					type: 'empty',
				});
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

			if (!isCustomMenuItem(items.value[1])) {
				items.value[1].children = buildNestedHierarchy(workflows, projectsStore.personalProject.id);

				// Add empty state for project with no children
				if (items.value[1].children && items.value[1].children.length === 0) {
					items.value[1].children.push({
						id: `${items.value[1].id}-empty`,
						label: 'No items in this project',
						type: 'empty',
					});
				}
			}
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

			// Add empty state for shared project with no children
			if (sharedItem.children && sharedItem.children.length === 0) {
				sharedItem.children.push({
					id: `${sharedItem.id}-empty`,
					label: 'No items shared with you',
					type: 'empty',
				});
			}

			items.value.push(sharedItem);
		}

		if (projectsStore.isTeamProjectFeatureEnabled || isFoldersFeatureEnabled.value) {
			items.value.push({
				id: 'projects-separator',
				label: 'Projects',
				type: 'subtitle',
			});

			if (projectsStore.teamProjects.length === 0 && projectsStore.hasPermissionToCreateProjects) {
				items.value.push({
					id: 'no-team-projects',
					label: 'No projects',
					type: 'empty',
				});
			} else if (projectsStore.teamProjects.length === 0) {
				items.value.push({
					id: 'no-team-projects-cant-create',
					label: 'No projects',
					type: 'empty',
				});
			} else {
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
						label: project.name as string,
						icon: (project.icon?.value || 'layers') as IconName,
						route: { to: `/projects/${project.id}/workflows` },
						children: buildNestedHierarchy(workflows, project.id),
						type: 'project',
					};

					if (projectItem.children && projectItem.children.length === 0) {
						projectItem.children.push({
							id: `${projectItem.id}-empty`,
							label: 'No items in this project',
							type: 'empty',
						});
					}

					items.value.push(projectItem);
				}
			}
		}
	}

	return {
		items,
		bottomItems: visibleBottomMenuItems,
	};
};
