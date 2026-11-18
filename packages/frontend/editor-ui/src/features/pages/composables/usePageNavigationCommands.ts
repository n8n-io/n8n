import type { PageListItem } from '@n8n/api-types';
import { N8nIcon } from '@n8n/design-system';
import { getPagePermissions, usePageStore } from '@n8n/frontend-module-page';
import { useI18n } from '@n8n/i18n';
import { computed, type Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type {
	CommandBarItem,
	CommandBarSearchRequest,
	CommandBarSearchResult,
	CommandGroup,
} from '@/features/shared/commandBar/types';

import { toPageRoute } from '../pageRoute';
import { useIsPageModuleActive } from './useIsPageModuleActive';
import { useNewPageAction } from './useNewPageAction';

const CREATE_PAGE_ITEM_ID = 'create-page';

/**
 * Gives the pages group of the command bar.
 * Its source searches every page that the user can read by title.
 * Its command creates a page in the project of the current view, else in the personal project.
 * The group is empty and its source is unavailable when the page module is off.
 */
export function usePageNavigationCommands(options: {
	currentProjectName: Ref<string>;
}): CommandGroup {
	const i18n = useI18n();
	const router = useRouter();
	const route = useRoute();
	const pageStore = usePageStore();
	const projectsStore = useProjectsStore();
	const isPageModuleActive = useIsPageModuleActive();
	const { createUntitledPageAndOpenIt } = useNewPageAction();

	const newPageProjectId = computed(() =>
		typeof route.params.projectId === 'string'
			? route.params.projectId
			: (projectsStore.currentProjectId ?? projectsStore.personalProject?.id),
	);

	const canCreatePage = computed(
		() =>
			isPageModuleActive.value &&
			newPageProjectId.value !== undefined &&
			getPagePermissions(newPageProjectId.value).canCreate,
	);

	function toProjectLabel(page: PageListItem): string {
		return page.projectId === projectsStore.personalProject?.id
			? i18n.baseText('projects.menu.personal')
			: page.projectName;
	}

	function toCommandBarItem(page: PageListItem): CommandBarItem {
		const location = toPageRoute(page.id);
		return {
			id: page.id,
			title: page.title,
			description: toProjectLabel(page),
			icon: { type: 'icon', value: 'file-text' },
			timestamp: page.updatedAt,
			href: router.resolve(location).href,
			handler: () => {
				void router.push(location);
			},
		};
	}

	/** The server returns every match at once. This cuts the window that the command bar asks for. */
	async function search({
		query,
		offset,
		limit,
	}: CommandBarSearchRequest): Promise<CommandBarSearchResult> {
		const title = query.trim();
		const pages = await pageStore.listAll(title === '' ? undefined : title);
		return {
			items: pages.slice(offset, offset + limit).map(toCommandBarItem),
			hasMore: offset + limit < pages.length,
		};
	}

	function createPageInCurrentProject(): void {
		if (newPageProjectId.value !== undefined) {
			void createUntitledPageAndOpenIt(newPageProjectId.value);
		}
	}

	const commands = computed<CommandBarItem[]>(() =>
		canCreatePage.value
			? [
					{
						id: CREATE_PAGE_ITEM_ID,
						title: i18n.baseText('page.commandBar.create', {
							interpolate: { projectName: options.currentProjectName.value },
						}),
						section: i18n.baseText('page.pages'),
						icon: { component: N8nIcon, props: { icon: 'plus', color: 'text-light' } },
						handler: createPageInCurrentProject,
					},
				]
			: [],
	);

	return {
		commands,
		source: {
			id: 'pages',
			title: i18n.baseText('page.pages'),
			isRemote: true,
			isAvailable: () => isPageModuleActive.value,
			search,
		},
	};
}
