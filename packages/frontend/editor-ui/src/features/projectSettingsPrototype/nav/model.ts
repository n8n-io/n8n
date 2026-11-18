import type { ProtoParams } from '@/features/projectSettingsPrototype/params';
import { can, membersPlacementFor } from '@/features/projectSettingsPrototype/state/session';
import {
	NESTED_SETTINGS_PAGE_IDS,
	RESOURCE_PAGES,
	SETTINGS_GROUPS,
	SETTINGS_PAGES,
	projectPage,
	type ProjectPageDef,
	type ProjectPageId,
} from './pages';

export interface NavItem {
	id: ProjectPageId;
	label: string;
	icon: string;
	to: string;
}

export interface NavSection {
	id: string;
	title?: string;
	items: NavItem[];
}

export interface ProjectNav {
	/** The project's resources, plus Members when it's placed with them. */
	resources: NavItem[];
	/** The settings pages the role can open, grouped for the current parameters. */
	settings: NavSection[];
	/** The same pages as one list. */
	settingsFlat: NavItem[];
}

/** One canonical path per page, whatever the variant. */
export function projectPagePath(projectId: string, page: ProjectPageId): string {
	return NESTED_SETTINGS_PAGE_IDS.includes(page)
		? `/projects/${projectId}/settings/${page}`
		: `/projects/${projectId}/${page}`;
}

const RESOURCE_IDS = new Set<ProjectPageId>(RESOURCE_PAGES.map((page) => page.id));

/** Whether the page belongs to the project's settings under the current parameters. */
export function isSettingsPage(
	page: ProjectPageId,
	params: Pick<ProtoParams, 'membersPlacement' | 'variant'>,
): boolean {
	if (RESOURCE_IDS.has(page)) return false;
	if (page === 'members') return membersPlacementFor(params) === 'settings';
	return true;
}

/**
 * Master's form: project info, self-healing, vaults, members, span attributes,
 * worker pool. The sections it doesn't have yet are appended, the way sections
 * have been added so far.
 */
const BASELINE_ORDER: ProjectPageId[] = [
	'general',
	'self-healing',
	'external-secrets',
	'members',
	'opentelemetry',
	'workers',
	'node-and-credential-access',
	'execution-limits',
	'audit-log',
];

function toItem(projectId: string, page: ProjectPageDef): NavItem {
	return {
		id: page.id,
		label: page.label,
		icon: page.icon,
		to: projectPagePath(projectId, page.id),
	};
}

export function buildProjectNav(projectId: string, params: ProtoParams): ProjectNav {
	const membersWithResources = membersPlacementFor(params) === 'resources';

	const resources = RESOURCE_PAGES.map((page) => toItem(projectId, page));
	if (membersWithResources && can('project:members:view', params)) {
		resources.push(toItem(projectId, projectPage('members')));
	}

	if (!can('project:settings:view', params)) {
		return { resources, settings: [], settingsFlat: [] };
	}

	const pages = SETTINGS_PAGES.filter((page) => !(membersWithResources && page.id === 'members'));

	if (params.variant === 'baseline') {
		const settingsFlat = BASELINE_ORDER.map((id) => toItem(projectId, projectPage(id)));
		return { resources, settings: [{ id: 'all', items: settingsFlat }], settingsFlat };
	}

	const settingsFlat = pages.map((page) => toItem(projectId, page));

	if (params.settingsGrouping === 'flat') {
		return { resources, settings: [{ id: 'all', items: settingsFlat }], settingsFlat };
	}

	const settings: NavSection[] = [
		{
			id: 'general',
			items: pages.filter((page) => !page.group).map((page) => toItem(projectId, page)),
		},
		...SETTINGS_GROUPS.map((group) => ({
			id: group.id,
			title: group.title,
			items: pages.filter((page) => page.group === group.id).map((page) => toItem(projectId, page)),
		})),
	].filter((section) => section.items.length > 0);

	return { resources, settings, settingsFlat };
}

/** Where "Project settings" leads: the first settings page the role can open. */
export function settingsEntry(projectId: string, params: ProtoParams): string | undefined {
	return buildProjectNav(projectId, params).settingsFlat[0]?.to;
}

export type RouteArea = 'home' | 'project' | 'instance';

export interface Chrome {
	sidebar: 'main' | 'instance-settings' | 'project-settings';
	frame: 'home' | 'tabs' | 'side-nav' | 'plain' | 'settings';
	/** The settings navigation as a column beside the main sidebar. */
	innerNav: boolean;
	/** Where the back row leads: this project, or the projects list in instance settings. */
	back?: { label: 'project' | 'projects' };
}

const RESOURCE_FRAMES: Record<ProtoParams['variant'], Chrome['frame']> = {
	baseline: 'tabs',
	'side-nav': 'side-nav',
	menu: 'tabs',
	'separate-area': 'tabs',
	'in-settings': 'tabs',
	'sidebar-expand': 'plain',
};

/** The chrome around a page. Pages never know which variant they're in. */
export function resolveChrome(
	area: RouteArea,
	page: ProjectPageId | undefined,
	params: ProtoParams,
): Chrome {
	if (area === 'home') return { sidebar: 'main', frame: 'home', innerNav: false };
	if (area === 'instance') {
		return { sidebar: 'instance-settings', frame: 'settings', innerNav: false };
	}

	const resourceChrome: Chrome = {
		sidebar: 'main',
		frame: RESOURCE_FRAMES[params.variant],
		innerNav: false,
	};

	// A role that can't open settings gets the "no access" page inside the chrome it knows.
	const inSettingsArea =
		page !== undefined && isSettingsPage(page, params) && can('project:settings:view', params);
	if (!inSettingsArea) return resourceChrome;

	if (params.variant === 'separate-area') {
		return params.sidebarTreatment === 'beside'
			? { sidebar: 'main', frame: 'settings', innerNav: true, back: { label: 'project' } }
			: {
					sidebar: 'project-settings',
					frame: 'settings',
					innerNav: false,
					back: { label: 'project' },
				};
	}

	if (params.variant === 'in-settings') {
		return {
			sidebar: 'project-settings',
			frame: 'settings',
			innerNav: false,
			back: { label: 'projects' },
		};
	}

	return resourceChrome;
}
