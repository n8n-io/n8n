import type { ListAppsQueryDto } from '@n8n/api-types';

export const APPS_LIST_VIEW = 'AppsListView';
export const PROJECT_APPS = 'ProjectApps';

export const APPS_PAGE_SIZE = 50;

export type AppsSortBy = ListAppsQueryDto['sortBy'];

export const APPS_SORT_MAP = {
	lastUpdated: 'updatedAt:desc',
	lastCreated: 'createdAt:desc',
	nameAsc: 'name:asc',
	nameDesc: 'name:desc',
} as const satisfies Record<string, AppsSortBy>;
