import { VIEWS } from '@/constants';
import { IWorkflowDb } from '@/Interface';
import { useFoldersStore } from '@/stores/folders.store';
import { useProjectsStore } from '@/stores/projects.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { hasPermission } from '@/utils/rbac/permissions';
import { IMenuElement, IMenuItem } from '@n8n/design-system';
import { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import { computed, onBeforeMount } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useTemplatesStore } from '@/stores/templates.store';

// TODO - need to refactor this to just get the next level of children, not the full tree
// and then have the sidebar item component fetch the next level when opened
// this will make it much more efficient for large numbers of folders/workflows

export function useSidebarItems() {
	const projectsStore = useProjectsStore();
	const folderStore = useFoldersStore();
	const workflowsStore = useWorkflowsStore();
	const settingsStore = useSettingsStore();
	const usersStore = useUsersStore();
	const templatesStore = useTemplatesStore();
	const i18n = useI18n();

	const showShared = computed(
		() => usersStore.allUsers.filter((user) => user.isPendingUser === false).length > 1,
	);

	const showProjects = computed(
		() => settingsStore.isFoldersFeatureEnabled || projectsStore.isTeamProjectFeatureEnabled,
	);

	const canCreateProject = computed(() => projectsStore.hasPermissionToCreateProjects);

	onBeforeMount(async () => {
		await usersStore.fetchUsers();
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
		if (id === 'shared') {
			await workflowsStore.fetchWorkflowsPage(
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				true,
			);
		} else {
			await workflowsStore.fetchWorkflowsPage(id, undefined, undefined, undefined, {
				parentFolderId: '',
				isArchived: false,
			});
		}
	}

	async function openFolder(folderId: string) {
		const folder = folderStore.getCachedFolder(folderId);
		await workflowsStore.fetchWorkflowsPage(
			folder.projectId,
			undefined,
			undefined,
			undefined,
			{
				parentFolderId: folderId,
				isArchived: false,
			},
			true,
		);
	}

	function convertToTreeStructure(projectId: string): IMenuElement[] {
		const projectFolders = Object.values(folderStore.breadcrumbsCache).filter(
			(f) => f.projectId === projectId,
		);
		const projectWorkflows = workflowsStore.allWorkflows.filter(
			(w) => w.homeProject?.id === projectId && !w.isArchived,
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
					children: children.length > 0 ? children : undefined,
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

		const builtTree = buildTree(projectFolders, projectWorkflows);

		return builtTree;
	}

	const sharedWorkflows = computed(() =>
		workflowsStore.allWorkflows
			.filter((workflow) => {
				return workflow.sharedWithProjects?.find((p) => p.id === projectsStore.personalProject?.id);
			})
			.map((w) => {
				return workflowToMenuItem(w);
			}),
	);

	const personalChildrenItems = computed(() => {
		if (!projectsStore.personalProject) return [];
		return convertToTreeStructure(projectsStore.personalProject.id);
	});

	const topItems = computed<IMenuElement[]>(() => {
		return [
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
				children: personalChildrenItems.value.length > 0 ? personalChildrenItems.value : undefined,
				type: 'project',
				available: true,
			},
			{
				id: 'shared',
				label: 'Shared with you',
				icon: 'share',
				route: { to: '/shared/workflows' },
				available: showShared.value,
				type: 'project',
				children: sharedWorkflows.value.length > 0 ? sharedWorkflows.value : undefined,
			},
		];
	});

	const topItemsFiltered = computed(() => topItems.value.filter((item) => item.available));

	const projectItems = computed<IMenuElement[]>(() =>
		projectsStore.myProjects
			.filter((p) => p.type === 'team')
			.map((project) => {
				const children = convertToTreeStructure(project.id);
				return {
					id: project.id,
					label: project.name as string,
					icon: (project.icon?.value || 'layers') as IconName,
					route: { to: `/projects/${project.id}/workflows` },
					children: children.length > 0 ? convertToTreeStructure(project.id) : undefined,
					type: 'project',
				};
			}),
	);

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

	return {
		topItems: topItemsFiltered,
		openProject,
		openFolder,
		projectItems,
		showProjects,
		canCreateProject,
		showShared,
		convertToTreeStructure,
		bottomItems: visibleBottomMenuItems,
	};
}
