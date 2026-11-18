import { computed } from 'vue';
import { useRoute, type RouteLocationNormalizedLoaded } from 'vue-router';
import { VIEWS } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { PROJECT_AGENTS } from '@/features/agents/constants';
import { PROJECT_DATA_TABLES } from '@/features/core/dataTable/constants';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import { protoParams } from '@/features/projectSettingsPrototype/params';
import { buildProjectNav, resolveChrome, type Chrome, type RouteArea } from './model';
import { isProjectPageId, type ProjectPageId } from './pages';

/** `/projects/:projectId/settings/:page` */
export const PROTO_SETTINGS_PAGE_VIEW = 'ProtoProjectSettingsPage';
/** `/projects/:projectId/members` */
export const PROTO_MEMBERS_VIEW = 'ProtoProjectMembers';
export const PROTO_INSTANCE_PROJECTS_VIEW = 'ProtoInstanceProjects';
export const PROTO_INSTANCE_AUDIT_LOG_VIEW = 'ProtoInstanceAuditLog';
export const PROTO_INSTANCE_POLICIES_VIEW = 'ProtoInstancePolicies';

const ROUTE_PAGES: Record<string, ProjectPageId> = {
	[VIEWS.PROJECTS_WORKFLOWS]: 'workflows',
	[VIEWS.PROJECTS_FOLDERS]: 'workflows',
	[PROJECT_AGENTS]: 'workflows',
	[VIEWS.PROJECTS_CREDENTIALS]: 'credentials',
	[VIEWS.PROJECTS_EXECUTIONS]: 'executions',
	[VIEWS.PROJECTS_VARIABLES]: 'variables',
	[PROJECT_DATA_TABLES]: 'data-tables',
	// Master's form, which the baseline keeps: it opens on the project's own details.
	[VIEWS.PROJECT_SETTINGS]: 'general',
	[PROTO_MEMBERS_VIEW]: 'members',
};

/** The project page a route shows, if it shows one. */
export function pageOfRoute(route: RouteLocationNormalizedLoaded): ProjectPageId | undefined {
	const name = typeof route.name === 'string' ? route.name : '';
	if (name === PROTO_SETTINGS_PAGE_VIEW) {
		const page = route.params.page;
		return typeof page === 'string' && isProjectPageId(page) ? page : undefined;
	}
	return ROUTE_PAGES[name];
}

/**
 * The chrome the current route asks for, under the current parameters. Both
 * shells read it, so a variant is described once and drawn twice.
 */
export function useProtoChrome() {
	const route = useRoute();
	const projectsStore = useProjectsStore();
	const uiStore = useUIStore();

	const projectId = computed(() =>
		typeof route.params?.projectId === 'string' ? route.params.projectId : undefined,
	);

	const project = computed(() => {
		const id = projectId.value;
		if (!id) return undefined;
		if (projectsStore.personalProject?.id === id) return projectsStore.personalProject;
		return projectsStore.myProjects.find((entry) => entry.id === id);
	});

	/** Only team projects have settings. */
	const isTeamProject = computed(() => project.value?.type === ProjectTypes.Team);

	const page = computed(() => pageOfRoute(route));

	const area = computed<RouteArea>(() => {
		if (route.meta?.layout === 'settings') return 'instance';
		return isTeamProject.value ? 'project' : 'home';
	});

	const chrome = computed<Chrome>(() => resolveChrome(area.value, page.value, protoParams));

	const nav = computed(() =>
		projectId.value && isTeamProject.value
			? buildProjectNav(projectId.value, protoParams)
			: undefined,
	);

	/**
	 * A column of pages between the navigation and the page: the settings pages
	 * beside the main navigation, or every page of the project on the standard
	 * shell, where there's no panel to list them.
	 */
	const showInnerNav = computed(
		() =>
			chrome.value.innerNav ||
			(protoParams.shell === 'standard' &&
				protoParams.variant === 'side-nav' &&
				isTeamProject.value),
	);

	/**
	 * The collapsed standard sidebar has no room to list a project's pages, so
	 * the expanding sidebar hands them to the header: tabs, and a Settings menu.
	 */
	const pagesInHeader = computed(
		() =>
			protoParams.shell === 'standard' &&
			protoParams.variant === 'sidebar-expand' &&
			isTeamProject.value &&
			(uiStore.sidebarMenuCollapsed ?? false),
	);

	/** Settings open from a menu in the project header, not from a tab or a link. */
	const settingsInMenu = computed(() => protoParams.variant === 'menu' || pagesInHeader.value);

	return {
		projectId,
		project,
		isTeamProject,
		page,
		area,
		chrome,
		nav,
		showInnerNav,
		pagesInHeader,
		settingsInMenu,
	};
}
