import { getResourcePermissions } from '@n8n/permissions';

import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useUsersStore } from '@n8n/stores/users.store';

import type { Preference, PreferencePermissions, PreferenceScopeType } from './context.types';

/**
 * Reads the scope out of the entity's tri-state, the same way the backend does when
 * it groups rows for a prompt: a project id wins, then a user id, and a row with
 * neither applies to the whole instance.
 */
export function preferenceScope(
	row: Pick<Preference, 'userId' | 'projectId'>,
): PreferenceScopeType {
	if (row.projectId) return 'project';
	if (row.userId) return 'user';
	return 'instance';
}

/**
 * Maps the row-level scopes the API sends onto the two actions the table offers.
 * The API reports them in the `aiPreference` namespace whatever granted them, so
 * one check covers a personal, a project and an instance row alike.
 */
export function toPreferencePermissions(row: Preference): PreferencePermissions {
	const permissions = getResourcePermissions(row.scopes).aiPreference;
	return {
		update: permissions?.update === true,
		delete: permissions?.delete === true,
	};
}

/*
 * Write checks for the scope picker. The rows the list shows carry their own
 * permissions; these answer the question the picker asks before a row exists.
 */

export function canWriteProjectScope(projectId: string | null | undefined): boolean {
	if (!projectId) return false;
	const project = useProjectsStore().myProjects.find((candidate) => candidate.id === projectId);
	return getResourcePermissions(project?.scopes).projectAiPreference?.create === true;
}

export function canWriteInstanceScope(): boolean {
	const { currentUser } = useUsersStore();
	return getResourcePermissions(currentUser?.globalScopes).aiPreference?.create === true;
}
