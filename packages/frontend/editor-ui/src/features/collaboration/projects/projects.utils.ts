import { truncate } from '@n8n/utils/string/truncate';
import type { ProjectListItem } from './projects.types';
import { useProjectsStore } from './projects.store';

export const DEFAULT_PROJECT_SEARCH_PAGE_SIZE = 50;

export type ProjectSearchResult = { count: number; data: ProjectListItem[] };
export type ProjectSearchFn = (query: string) => Promise<ProjectSearchResult>;

/**
 * Remote search for Group 1 consumers (sharing/transfer modals).
 * Always searches via GET /projects?search=&take= for ALL roles.
 */
export function useRemoteProjectSearch(): ProjectSearchFn {
	const store = useProjectsStore();
	return async (query: string) => {
		return await store.searchProjects({
			search: query,
			take: DEFAULT_PROJECT_SEARCH_PAGE_SIZE,
		});
	};
}

/**
 * Mirrors getAvailableProjects() behavior:
 * - Admin (has project:list): remote search via GET /projects
 * - Member (no project:list): local filter over myProjects (bounded set)
 */
export function useAvailableProjectSearch(): ProjectSearchFn {
	const store = useProjectsStore();
	return async (query: string) => {
		if (store.globalProjectPermissions.list) {
			return await store.searchProjects({
				search: query,
				take: DEFAULT_PROJECT_SEARCH_PAGE_SIZE,
			});
		}
		// Member: filter locally over myProjects (already fetched, bounded)
		const lowerQuery = query.toLowerCase();
		const filtered = store.myProjects.filter(
			(p) => !query || (p.name?.toLowerCase().includes(lowerQuery) ?? false),
		);
		return { count: filtered.length, data: filtered };
	};
}

// Splits a project name into first name, last name, and email when it is in the format "First Last <email@domain.com>"
export const splitName = (
	projectName = '',
): {
	name?: string;
	email?: string;
} => {
	const regex = /^(.*?)(?:\s*<([^>]+)>)?$/;
	const match = projectName.match(regex);
	const [, name, email] = match ?? [];
	return { name: name.trim() || undefined, email };
};

export const MAX_NAME_LENGTH = 25;

export const getTruncatedProjectName = (projectName: string | null | undefined): string => {
	const { name, email } = splitName(projectName ?? '');
	return truncate(name ?? email ?? '', MAX_NAME_LENGTH);
};

export const enum ResourceType {
	Credential = 'credential',
	Workflow = 'workflow',
	DataTable = 'dataTable',
}
