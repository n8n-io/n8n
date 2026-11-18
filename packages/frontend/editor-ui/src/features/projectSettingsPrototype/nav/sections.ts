import type { AppNavLink, AppNavSection } from '@/app/components/appNavigation/useAppNavigation';
import { VIEWS } from '@/app/constants';
import { protoParams } from '@/features/projectSettingsPrototype/params';
import { buildProjectNav, isSettingsPage, type NavItem } from './model';
import type { ProjectPageId } from './pages';

export interface NavContext {
	/** The project the links belong to. */
	projectId: string;
	/** The project and page on screen, which decide the active link. */
	currentProjectId?: string;
	currentPage?: ProjectPageId;
}

const toLink = (item: NavItem, context: NavContext): AppNavLink => ({
	id: `proto-${item.id}`,
	label: item.label,
	icon: item.icon,
	to: item.to,
	active: context.currentProjectId === context.projectId && context.currentPage === item.id,
});

/** The settings pages the role can open: one section per group, or one list. */
export function settingsSections(context: NavContext, firstTitle?: string): AppNavSection[] {
	return buildProjectNav(context.projectId, protoParams).settings.map((section, index) => ({
		id: `proto-settings-${section.id}`,
		title: section.title ?? (index === 0 ? firstTitle : undefined),
		links: section.items.map((item) => toLink(item, context)),
	}));
}

/**
 * The pages of a team project, for the panel of the visual refresh and for
 * the page lists of the standard shell. `pageLinks` are n8n's own links: the
 * project's resources, then "Project settings" when the user may open it.
 */
export function projectSections(context: NavContext, pageLinks: AppNavLink[]): AppNavSection[] {
	const settingsLink = pageLinks.find((link) => link.id === VIEWS.PROJECT_SETTINGS);
	const resources = pageLinks.filter((link) => link !== settingsLink);

	const nav = buildProjectNav(context.projectId, protoParams);
	const members = nav.resources.find((item) => item.id === 'members');
	if (members) resources.push(toLink(members, context));

	const pages: AppNavSection = { id: `project:${context.projectId}-pages`, links: resources };

	// n8n's permissions decide whether there are settings to open. The role parameter narrows them.
	if (!settingsLink || nav.settingsFlat.length === 0) return [pages];

	const inSettings =
		context.currentProjectId === context.projectId &&
		context.currentPage !== undefined &&
		isSettingsPage(context.currentPage, protoParams);

	switch (protoParams.variant) {
		case 'baseline':
			return [{ ...pages, links: [...resources, settingsLink] }];
		case 'side-nav':
			return [pages, ...settingsSections(context, 'Project settings')];
		case 'menu':
			return [pages];
		case 'sidebar-expand':
			return [
				pages,
				{
					id: 'proto-settings-disclosure',
					links: [],
					disclosure: {
						label: 'Settings',
						icon: 'settings',
						open: inSettings,
						sections: settingsSections(context),
					},
				},
			];
		default:
			// The separate area, and the pages under instance settings: one link leads in.
			return [
				{
					...pages,
					links: [
						...resources,
						{ ...settingsLink, to: nav.settingsFlat[0].to, active: inSettings },
					],
				},
			];
	}
}

/** Every link of the sections, with the ones a disclosure holds. */
export function allLinks(sections: AppNavSection[]): AppNavLink[] {
	return sections.flatMap((section) => [
		...section.links,
		...(section.disclosure ? allLinks(section.disclosure.sections) : []),
	]);
}
