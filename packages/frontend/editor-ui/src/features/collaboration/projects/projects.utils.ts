import { SELF_HEALING_FLAG } from '@n8n/api-types';
import type { SelfHealingLocation } from '@n8n/frontend-constants/self-healing';
import { getResourcePermissions } from '@n8n/permissions';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { truncate } from '@n8n/utils/string/truncate';
import { usePostHog } from '@/app/stores/posthog.store';
import { ProjectTypes, type Project, type ProjectListItem } from './projects.types';
import { useProjectsStore } from './projects.store';

export const DEFAULT_PROJECT_SEARCH_PAGE_SIZE = 50;

export type ProjectSearchResult = { count: number; data: ProjectListItem[] };
export type ProjectSearchFn = (query: string) => Promise<ProjectSearchResult>;

/**
 * Remote search for Group 1 consumers (sharing / transfer / user-deletion modals).
 * Hits `GET /projects/sharing-candidates` so non-admin callers receive peer
 * personal projects in addition to projects they have a relation to — without
 * that, the share dropdown would be empty for `global:member` users.
 *
 * Pass `includeServiceAccounts` only where a share to a service account has an
 * effect, such as the knowledge collection picker. Other pickers get none.
 *
 * Pass `type` when the caller accepts only one kind of project. The endpoint
 * returns one page and sorts team projects first, so a caller that drops the
 * other kind on the client gets an empty dropdown once team projects fill that
 * page.
 */
export function useRemoteProjectSearch(
	options: { type?: 'personal' | 'team'; includeServiceAccounts?: boolean } = {},
): ProjectSearchFn {
	const store = useProjectsStore();
	return async (query: string) => {
		return await store.searchShareableProjects({
			search: query,
			take: DEFAULT_PROJECT_SEARCH_PAGE_SIZE,
			...(options.type ? { type: options.type } : {}),
			...(options.includeServiceAccounts ? { includeServiceAccounts: true } : {}),
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

/**
 * Order for a list of who something is shared with: people (their personal
 * projects) first, then team projects, each by name.
 */
export const compareSharingEntries = (
	entryA: { type?: string | null; name?: string | null },
	entryB: { type?: string | null; name?: string | null },
): number => {
	const isPerson = (entry: { type?: string | null }) => (entry.type === 'personal' ? 0 : 1);
	return (
		isPerson(entryA) - isPerson(entryB) || (entryA.name ?? '').localeCompare(entryB.name ?? '')
	);
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

/** Tells whether users can set up self-healing now. */
export function isSelfHealingEnabled(): boolean {
	const settingsStore = useSettingsStore();
	const settings = settingsStore.moduleSettings['instance-ai'];
	if (!settings?.workflowSuggestionsEnabled) return false;
	if (!settings.cloudManaged) {
		// Self-healing is not available on self-hosted Enterprise yet.
		// Other self-hosted instances have no PostHog flag.
		return !settingsStore.isEnterprisePlan;
	}
	// Every Cloud plan requires both the env setting and the PostHog instance flag.
	return usePostHog().isFeatureEnabled(SELF_HEALING_FLAG);
}

export function canConfigureSelfHealing(
	project:
		| (Pick<Project, 'type'> & Partial<Pick<Project, 'scopes' | 'relations'>>)
		| null
		| undefined,
): boolean {
	if (!project || !isSelfHealingEnabled()) return false;
	if (project.type !== ProjectTypes.Personal) {
		return !!getResourcePermissions(project.scopes).project.update;
	}

	const userId = useUsersStore().currentUserId;
	return (
		project.relations?.some(({ id, role }) => id === userId && role === 'project:personalOwner') ??
		false
	);
}

export function selfHealingLocation(project: Pick<Project, 'type'>): SelfHealingLocation {
	return project.type === ProjectTypes.Personal ? 'personalTab' : 'projectSettings';
}

export async function canOpenSelfHealingRoute(
	projectId: string | string[] | undefined,
	location: SelfHealingLocation,
): Promise<boolean> {
	if (typeof projectId !== 'string') return false;
	try {
		const projectsStore = useProjectsStore();
		// Project members can list their scopes without project:read.
		await projectsStore.getMyProjects();
		const project = projectsStore.myProjects.find(({ id }) => id === projectId);
		if (!project || selfHealingLocation(project) !== location) return false;

		return canConfigureSelfHealing(
			project.type === ProjectTypes.Personal
				? await projectsStore.fetchProject(projectId)
				: project,
		);
	} catch {
		return false;
	}
}
