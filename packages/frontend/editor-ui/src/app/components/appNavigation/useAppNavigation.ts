import { computed } from 'vue';
import { useRoute, type RouteLocationRaw } from 'vue-router';
import type { IconName, IconOrEmoji, TabOptions } from '@n8n/design-system';
import { isIconOrEmoji } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { INBOX_VIEW, isInboxRoute } from '@n8n/frontend-module-inbox';
import { VIEWS } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useSettingsItems } from '@/app/composables/useSettingsItems';
import { processDynamicTabs } from '@/app/utils/modules/tabUtils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useFavoritesStore } from '@/app/stores/favorites.store';
import type { FavoriteResourceType } from '@/app/api/favorites';
import {
	useFavoriteNavItems,
	type FavoriteGroupItem,
} from '@/features/collaboration/projects/composables/useFavoriteNavItems';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import {
	canConfigureSelfHealing,
	selfHealingLocation,
} from '@/features/collaboration/projects/projects.utils';
import { PERSONAL_SELF_HEALING_VIEW } from '@n8n/frontend-constants/self-healing';
import type { Scope } from '@n8n/permissions';
import { DEFAULT_PROJECT_ICON } from '@/features/collaboration/projects/projects.constants';
import {
	INSTANCE_AI_THREADS_VIEW,
	INSTANCE_AI_THREAD_VIEW,
	INSTANCE_AI_VIEW,
} from '@/features/ai/instanceAi/constants';
import { useInstanceAiAvailable } from '@/features/ai/instanceAi/composables/useInstanceAiAvailability';
import { AGENT_N8N_CHAT_VIEW, AGENTS_LIST_VIEW, PROJECT_AGENTS } from '@/features/agents/constants';
import { DATA_TABLE_VIEW, PROJECT_DATA_TABLES } from '@/features/core/dataTable/constants';
import { useRecentChats } from '@/features/agents/n8nChatPage/useRecentChats';
import {
	chatItemRoute,
	chatItemTitle,
	type RecentChatItem,
} from '@/features/agents/n8nChatPage/mergeRecentChats';
// Prototype: project settings navigation.
import { protoParams } from '@/features/projectSettingsPrototype/params';
import {
	PROTO_INSTANCE_PROJECTS_VIEW,
	useProtoChrome,
} from '@/features/projectSettingsPrototype/nav/useProtoChrome';
import {
	projectSections,
	settingsSections as projectSettingsSections,
} from '@/features/projectSettingsPrototype/nav/sections';

export type AppNavRailItem = {
	id: string;
	label: string;
	icon: IconOrEmoji;
	to: RouteLocationRaw;
	/**
	 * `main` items sit above the divider, `project` items below it, and `footer` items at the
	 * bottom of the rail, above the account menu.
	 */
	group: 'main' | 'project' | 'footer';
	testId: string;
};

export type AppNavLink = {
	id: string;
	label: string;
	icon: IconName | (string & {});
	to: RouteLocationRaw;
	active: boolean;
	preview?: boolean;
	/** Set on recent chats, so the panel can show the chat's own icon. */
	chat?: RecentChatItem;
	/** Set on favorites, so the panel can offer to unstar them. */
	favorite?: { resourceId: string; resourceType: FavoriteResourceType };
};

export type AppNavSection = {
	id: string;
	title?: string;
	viewAll?: { label: string; to: RouteLocationRaw };
	links: AppNavLink[];
	/** Shown in place of the links when the section has none */
	emptyText?: string;
	/** Prototype: a row that opens in place to list more sections. It has no links of its own. */
	disclosure?: { label: string; icon: IconName; open: boolean; sections: AppNavSection[] };
};

/** Prototype: a project's settings pages take over the panel, behind a back row. */
export type AppNavPanelOverride = {
	back: { label: string; to: RouteLocationRaw };
	/** Replaces the panel's title. */
	title?: string;
	/** Names the first section, which has no heading of its own. */
	heading?: string;
};

type NavProject = { id: string; type?: string; scopes?: Scope[] };

export const ASSISTANT_ITEM_ID = 'assistant';
export const OVERVIEW_ITEM_ID = 'overview';
export const INBOX_ITEM_ID = 'inbox';
export const SETTINGS_ITEM_ID = 'settings';
export const PROJECT_ITEM_PREFIX = 'project:';

type SettingsItemIcon = ReturnType<
	typeof useSettingsItems
>['settingsItems']['value'][number]['icon'];

/** The panel shows icons only, so an emoji or a missing icon falls back to the settings icon. */
function settingsIcon(icon: SettingsItemIcon): string {
	if (typeof icon === 'string') return icon;
	return icon?.type === 'icon' ? icon.value : 'settings';
}

const ASSISTANT_ROUTES = new Set<string>([
	INSTANCE_AI_VIEW,
	INSTANCE_AI_THREAD_VIEW,
	INSTANCE_AI_THREADS_VIEW,
	AGENT_N8N_CHAT_VIEW,
]);

/**
 * Pages that stand on their own, such as Insights. They have no pages to list, so no rail item
 * is active and no panel shows on them.
 */
const STANDALONE_ROUTES = new Set<string>([VIEWS.INSIGHTS]);

/** List pages without a project id belong to Overview, even if a project is still loaded. */
const OVERVIEW_ROUTES = new Set<string>([
	VIEWS.HOMEPAGE,
	VIEWS.WORKFLOWS,
	VIEWS.FOLDERS,
	VIEWS.CREDENTIALS,
	VIEWS.EXECUTIONS,
	VIEWS.HOME_VARIABLES,
	AGENTS_LIST_VIEW,
	DATA_TABLE_VIEW,
]);

/** Routes that show the same page as a tab, so the tab's link stays active on them. */
const ROUTE_ALIASES: Record<string, string> = {
	[VIEWS.HOMEPAGE]: VIEWS.WORKFLOWS,
	[VIEWS.FOLDERS]: VIEWS.WORKFLOWS,
	[VIEWS.PROJECTS_FOLDERS]: VIEWS.PROJECTS_WORKFLOWS,
	// Automations list workflows and agents together, so the agent lists count as Automations.
	[AGENTS_LIST_VIEW]: VIEWS.WORKFLOWS,
	[PROJECT_AGENTS]: VIEWS.PROJECTS_WORKFLOWS,
};

/** Agents show inside Automations, so their own list page has no link */
const AUTOMATION_PAGES = new Set<string>([AGENTS_LIST_VIEW, PROJECT_AGENTS]);

const PAGE_ICONS: Record<string, IconName> = {
	[VIEWS.WORKFLOWS]: 'workflow',
	[VIEWS.PROJECTS_WORKFLOWS]: 'workflow',
	[VIEWS.CREDENTIALS]: 'key-round',
	[VIEWS.PROJECTS_CREDENTIALS]: 'key-round',
	[VIEWS.EXECUTIONS]: 'history',
	[VIEWS.PROJECTS_EXECUTIONS]: 'history',
	[VIEWS.HOME_VARIABLES]: 'variable',
	[VIEWS.PROJECTS_VARIABLES]: 'variable',
	[VIEWS.PROJECT_SETTINGS]: 'settings',
	[AGENTS_LIST_VIEW]: 'bot',
	[PROJECT_AGENTS]: 'bot',
	[DATA_TABLE_VIEW]: 'table',
	[PROJECT_DATA_TABLES]: 'table',
	[PERSONAL_SELF_HEALING_VIEW]: 'wrench',
};
const DEFAULT_PAGE_ICON: IconName = 'layers';

const FAVORITE_ICONS: Partial<Record<FavoriteResourceType, IconName>> = {
	workflow: 'workflow',
	agent: 'bot',
	dataTable: 'table',
	folder: 'folder',
};

export const projectItemId = (projectId: string) => `${PROJECT_ITEM_PREFIX}${projectId}`;

/**
 * The two-level navigation: the rail items, the rail item that owns the current route,
 * and the sections of the panel for any rail item.
 */
export function useAppNavigation() {
	const i18n = useI18n();
	const route = useRoute();
	const uiStore = useUIStore();
	const settingsStore = useSettingsStore();
	const { settingsSections } = useSettingsItems();
	const projectsStore = useProjectsStore();
	const isAssistantAvailable = useInstanceAiAvailable();
	const { recentChats } = useRecentChats();

	const isInboxVisible = computed(() => settingsStore.settings.inbox?.enabled === true);

	const favoritesStore = useFavoritesStore();
	const favoriteNavItems = useFavoriteNavItems();

	// Starred projects come first in the rail, then the rest, each by name.
	const teamProjects = computed(() => {
		if (!projectsStore.isTeamProjectFeatureEnabled) return [];
		const starred = new Set(favoritesStore.projectFavoriteIds);
		return (
			projectsStore.myProjects
				.filter((project) => project.type === ProjectTypes.Team)
				.sort(
					(a, b) =>
						Number(starred.has(b.id)) - Number(starred.has(a.id)) ||
						(a.name ?? '').localeCompare(b.name ?? ''),
				)
				// Prototype: the navigation shows as many projects as the parameter allows.
				.slice(0, Number(protoParams.projectCount))
		);
	});

	const projectRoute = (projectId: string): RouteLocationRaw => ({
		name: VIEWS.PROJECTS_WORKFLOWS,
		params: { projectId },
	});

	const railItems = computed<AppNavRailItem[]>(() => {
		const items: AppNavRailItem[] = [];
		if (isAssistantAvailable.value) {
			items.push({
				id: ASSISTANT_ITEM_ID,
				label: i18n.baseText('projects.menu.instanceAi'),
				icon: { type: 'icon', value: 'n8n-assistant' },
				to: { name: INSTANCE_AI_VIEW },
				group: 'main',
				testId: 'app-nav-assistant',
			});
		}
		items.push({
			id: OVERVIEW_ITEM_ID,
			label: i18n.baseText('projects.menu.overview'),
			icon: { type: 'icon', value: 'house' },
			to: { name: VIEWS.HOMEPAGE },
			group: 'main',
			testId: 'app-nav-overview',
		});
		if (isInboxVisible.value) {
			items.push({
				id: INBOX_ITEM_ID,
				label: i18n.baseText('inbox.title'),
				icon: { type: 'icon', value: 'inbox' },
				to: { name: INBOX_VIEW },
				group: 'main',
				testId: 'app-nav-inbox',
			});
		}

		const personalId = projectsStore.personalProject?.id;
		if (personalId) {
			items.push({
				id: projectItemId(personalId),
				label: i18n.baseText('projects.menu.personal'),
				icon: { type: 'icon', value: 'user' },
				to: projectRoute(personalId),
				group: 'project',
				testId: 'app-nav-personal',
			});
		}
		for (const project of teamProjects.value) {
			items.push({
				id: projectItemId(project.id),
				label: project.name ?? '',
				icon: isIconOrEmoji(project.icon) ? project.icon : DEFAULT_PROJECT_ICON,
				to: projectRoute(project.id),
				group: 'project',
				testId: 'app-nav-project',
			});
		}
		if (settingsSections.value.length > 0) {
			items.push({
				id: SETTINGS_ITEM_ID,
				label: i18n.baseText('mainSidebar.settings'),
				icon: { type: 'icon', value: 'settings' },
				// `/settings` itself opens the usage page when the user can see it.
				to: { name: VIEWS.PERSONAL_SETTINGS },
				group: 'footer',
				testId: 'app-nav-settings',
			});
		}
		return items;
	});

	const routeName = computed(() => (typeof route.name === 'string' ? route.name : ''));
	const routeProjectId = computed(() =>
		typeof route.params?.projectId === 'string' ? route.params.projectId : undefined,
	);

	// Prototype: the chrome the route asks for under the current parameters.
	const proto = useProtoChrome();
	const navContext = (projectId: string) => ({
		projectId,
		currentProjectId: routeProjectId.value,
		currentPage: proto.page.value,
	});
	const settingsAreaProjectId = computed(() =>
		proto.chrome.value.sidebar === 'project-settings' ? routeProjectId.value : undefined,
	);

	const panelOverride = computed<AppNavPanelOverride | null>(() => {
		const projectId = settingsAreaProjectId.value;
		if (!projectId) return null;
		const projectName =
			projectsStore.myProjects.find((project) => project.id === projectId)?.name ?? '';
		// Under instance settings the way back is the list of projects.
		if (proto.chrome.value.back?.label === 'projects') {
			return {
				back: { label: 'Projects', to: { name: PROTO_INSTANCE_PROJECTS_VIEW } },
				heading: projectName,
			};
		}
		return {
			back: { label: projectName, to: projectRoute(projectId) },
			title: 'Project settings',
			// The standard sidebar has no title, so the first section names the area.
			heading: protoParams.shell === 'standard' ? 'Project settings' : undefined,
		};
	});

	/** `null` on a standalone page, which no rail item owns */
	const activeItemId = computed<string | null>(() => {
		const name = routeName.value;
		if (STANDALONE_ROUTES.has(name)) return null;
		// Prototype: project settings under instance settings belong to the Settings item.
		if (
			settingsAreaProjectId.value &&
			proto.chrome.value.back?.label === 'projects' &&
			railItems.value.some((item) => item.id === SETTINGS_ITEM_ID)
		) {
			return SETTINGS_ITEM_ID;
		}
		if (route.meta?.layout === 'settings') return SETTINGS_ITEM_ID;
		if (ASSISTANT_ROUTES.has(name)) return ASSISTANT_ITEM_ID;
		if (isInboxRoute(route)) return INBOX_ITEM_ID;

		// A workflow or other page outside the lists belongs to the project it lives in.
		const projectId =
			routeProjectId.value ??
			(OVERVIEW_ROUTES.has(name) ? undefined : projectsStore.currentProject?.id);
		if (projectId) {
			const id = projectItemId(projectId);
			if (railItems.value.some((item) => item.id === id)) return id;
		}
		return OVERVIEW_ITEM_ID;
	});

	const isLinkActive = (value: string, projectId?: string) =>
		(ROUTE_ALIASES[routeName.value] ?? routeName.value) === value &&
		routeProjectId.value === projectId;

	/** The tabs of the project header, as panel links. */
	function pageLinks(pageType: 'overview' | 'project', project?: NavProject) {
		const projectId = project?.id;
		const pages: Array<TabOptions<string>> = projectId
			? [
					{
						value: VIEWS.PROJECTS_WORKFLOWS,
						label: i18n.baseText('projects.menu.automations'),
						to: { name: VIEWS.PROJECTS_WORKFLOWS, params: { projectId } },
					},
					{
						value: VIEWS.PROJECTS_CREDENTIALS,
						label: i18n.baseText('mainSidebar.credentials'),
						to: { name: VIEWS.PROJECTS_CREDENTIALS, params: { projectId } },
					},
					{
						value: VIEWS.PROJECTS_EXECUTIONS,
						label: i18n.baseText('mainSidebar.executions'),
						to: { name: VIEWS.PROJECTS_EXECUTIONS, params: { projectId } },
					},
					{
						value: VIEWS.PROJECTS_VARIABLES,
						label: i18n.baseText('mainSidebar.variables'),
						to: { name: VIEWS.PROJECTS_VARIABLES, params: { projectId } },
					},
				]
			: [
					{
						value: VIEWS.WORKFLOWS,
						label: i18n.baseText('projects.menu.automations'),
						to: { name: VIEWS.WORKFLOWS },
					},
					{
						value: VIEWS.CREDENTIALS,
						label: i18n.baseText('mainSidebar.credentials'),
						to: { name: VIEWS.CREDENTIALS },
					},
					{
						value: VIEWS.EXECUTIONS,
						label: i18n.baseText('mainSidebar.executions'),
						to: { name: VIEWS.EXECUTIONS },
					},
					{
						value: VIEWS.HOME_VARIABLES,
						label: i18n.baseText('mainSidebar.variables'),
						to: { name: VIEWS.HOME_VARIABLES },
					},
				];

		// Same rules as the module tabs in the project header.
		const moduleTabs = uiStore.moduleTabs[pageType];
		const activeModuleTabs = Object.keys(moduleTabs)
			.filter(
				(module) =>
					settingsStore.isModuleActive(module) &&
					(module !== 'agents' || settingsStore.isAgentsEnabled),
			)
			.flatMap((module) => moduleTabs[module]);
		for (const processed of processDynamicTabs(activeModuleTabs, projectId)) {
			const { insertAfter, ...tab } = processed;
			if (AUTOMATION_PAGES.has(tab.value)) continue;
			const anchorIndex = insertAfter ? pages.findIndex((page) => page.value === insertAfter) : -1;
			if (anchorIndex !== -1) pages.splice(anchorIndex + 1, 0, tab);
			else pages.push(tab);
		}

		if (project?.type === ProjectTypes.Team) {
			const permissions = getResourcePermissions(project.scopes);
			if (
				permissions.project.update ||
				permissions.project.manageMembers ||
				permissions.externalSecretsProvider.read
			) {
				pages.push({
					value: VIEWS.PROJECT_SETTINGS,
					label: i18n.baseText('projects.settings'),
					to: { name: VIEWS.PROJECT_SETTINGS, params: { projectId } },
				});
			}
		}

		// The header showed this page as a tab of the personal project only.
		const personalProject = projectsStore.personalProject;
		if (
			projectId &&
			projectId === personalProject?.id &&
			selfHealingLocation(personalProject) === 'personalTab' &&
			canConfigureSelfHealing(personalProject)
		) {
			pages.push({
				value: PERSONAL_SELF_HEALING_VIEW,
				label: i18n.baseText('selfHealing.config.heading'),
				preview: true,
				to: { name: PERSONAL_SELF_HEALING_VIEW, params: { projectId } },
			});
		}

		return pages.flatMap<AppNavLink>((page) =>
			page.to && page.label
				? [
						{
							id: page.value,
							label: page.label,
							icon: PAGE_ICONS[page.value] ?? DEFAULT_PAGE_ICON,
							to: page.to,
							active: isLinkActive(page.value, projectId),
							preview: page.preview,
						},
					]
				: [],
		);
	}

	const openThreadId = computed(() => {
		if (routeName.value === INSTANCE_AI_THREAD_VIEW) return route.params.threadId;
		if (routeName.value === AGENT_N8N_CHAT_VIEW) return route.params.agentThreadId;
		return undefined;
	});

	function assistantSections(): AppNavSection[] {
		const sections: AppNavSection[] = [
			{
				id: 'assistant-actions',
				links: [
					{
						id: 'new-chat',
						label: i18n.baseText('instanceAi.thread.new'),
						icon: 'message-circle-plus',
						to: { name: INSTANCE_AI_VIEW },
						active: routeName.value === INSTANCE_AI_VIEW,
					},
				],
			},
		];
		// The chats always have a section, so a new user sees where their chats will be.
		{
			const hasChats = recentChats.value.length > 0;
			sections.push({
				id: 'assistant-chats',
				title: i18n.baseText('instanceAi.threads.chats'),
				viewAll: hasChats
					? {
							label: i18n.baseText('instanceAi.threads.viewAll'),
							to: { name: INSTANCE_AI_THREADS_VIEW },
						}
					: undefined,
				emptyText: i18n.baseText('appNavigation.chats.empty'),
				links: recentChats.value.map((chat) => ({
					id: `chat-${chat.kind}-${chat.thread.id}`,
					label: chatItemTitle(chat, i18n),
					icon: 'message-circle',
					to: chatItemRoute(chat),
					active: openThreadId.value === chat.thread.id,
					chat,
				})),
			});
		}
		return sections;
	}

	function findProject(projectId: string): NavProject | undefined {
		if (projectsStore.personalProject?.id === projectId) return projectsStore.personalProject;
		return projectsStore.myProjects.find((project) => project.id === projectId);
	}

	/** The panel sections of one rail item. */
	/** The open page is the favorite: same route, and the same ids in its params and query */
	function isFavoriteActive(to: RouteLocationRaw) {
		if (typeof to === 'string' || !('name' in to) || to.name !== routeName.value) return false;
		const params = 'params' in to && to.params ? to.params : {};
		const query = 'query' in to && to.query ? to.query : {};
		return (
			Object.entries(params).every(([key, value]) => route.params[key] === value) &&
			Object.entries(query).every(([key, value]) => route.query[key] === value)
		);
	}

	/**
	 * The starred workflows, agents, data tables and folders, in the order the user starred
	 * them. Starred projects are not listed: they come first in the rail instead.
	 */
	function favoritesSection(): AppNavSection {
		const entries = new Map<string, FavoriteGroupItem>(
			[
				...favoriteNavItems.favoriteWorkflowItems.value,
				...favoriteNavItems.favoriteAgentItems.value,
				...favoriteNavItems.favoriteDataTableItems.value,
				...favoriteNavItems.favoriteFolderItems.value,
			].map((entry) => [`${entry.resourceType}:${entry.resourceId}`, entry]),
		);
		const links = favoritesStore.favorites.flatMap<AppNavLink>((favorite) => {
			const entry = entries.get(`${favorite.resourceType}:${favorite.resourceId}`);
			const to = entry?.menuItem.route?.to;
			if (!entry || !to) return [];
			return [
				{
					id: entry.menuItem.id,
					label: entry.menuItem.label,
					icon: FAVORITE_ICONS[entry.resourceType] ?? DEFAULT_PAGE_ICON,
					to,
					active: isFavoriteActive(to),
					favorite: { resourceId: entry.resourceId, resourceType: entry.resourceType },
				},
			];
		});
		return {
			id: 'overview-favorites',
			title: i18n.baseText('favorites.menu.title'),
			links,
			emptyText: i18n.baseText('appNavigation.favorites.empty'),
		};
	}

	function sectionsFor(itemId: string | null | undefined): AppNavSection[] {
		if (!itemId) return [];
		// Prototype: in a project's settings area, the active item lists the settings pages.
		if (settingsAreaProjectId.value && itemId === activeItemId.value) {
			return projectSettingsSections(
				navContext(settingsAreaProjectId.value),
				panelOverride.value?.heading,
			);
		}
		if (itemId === ASSISTANT_ITEM_ID) return assistantSections();
		if (itemId === SETTINGS_ITEM_ID) return settingsPanelSections();
		if (itemId === OVERVIEW_ITEM_ID) {
			return [{ id: 'overview-pages', links: pageLinks('overview') }, favoritesSection()];
		}
		// The Inbox panel shows the Inbox list instead of links.
		if (itemId === INBOX_ITEM_ID) return [];
		if (itemId.startsWith(PROJECT_ITEM_PREFIX)) {
			const project = findProject(itemId.slice(PROJECT_ITEM_PREFIX.length));
			if (!project) return [];
			const links = pageLinks('project', project);
			// Prototype: a team project's pages depend on the navigation variant.
			if (project.type === ProjectTypes.Team) {
				return projectSections(navContext(project.id), links);
			}
			return [{ id: `${itemId}-pages`, links }];
		}
		return [];
	}

	/** The settings pages, under the headings of the settings sidebar */
	function settingsPanelSections(): AppNavSection[] {
		const matchedNames = new Set(route.matched.map((match) => match.name));
		return settingsSections.value.map((section) => ({
			id: `settings-${section.id}`,
			title: section.title,
			// A row without a route, such as the cloud credits top-up, needs the settings page.
			links: section.items.flatMap((item) => {
				const to = item.route?.to;
				if (!to) return [];
				const name = typeof to === 'object' && 'name' in to ? to.name : undefined;
				return [
					{
						id: item.id,
						label: item.label,
						icon: settingsIcon(item.icon),
						to,
						active: name !== undefined && matchedNames.has(name),
						preview: item.preview,
					},
				];
			}),
		}));
	}

	const railItemById = (itemId: string | null | undefined) =>
		railItems.value.find((item) => item.id === itemId);

	return {
		railItems,
		activeItemId,
		sectionsFor,
		railItemById,
		panelOverride,
	};
}
