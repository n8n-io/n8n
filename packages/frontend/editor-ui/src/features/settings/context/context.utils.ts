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
 *
 * Replace this with `getResourcePermissions(row.scopes).preference` once `preference:*`
 * is a registered resource in `@n8n/permissions`.
 */
export function toPreferencePermissions(row: Preference): PreferencePermissions {
	return {
		update: row.scopes.includes('preference:update'),
		delete: row.scopes.includes('preference:delete'),
	};
}

/*
 * Write checks for the scope picker.
 *
 * Both stand in for permissions that do not exist yet, and both are shared with the
 * in-memory server so the picker and the rows it produces cannot disagree:
 *
 *  - `projectVariable:create` resolves to project admins and editors, which is the set
 *    that may write project preferences.
 *  - instance preferences reuse the instance owner/admin check.
 *
 * Swap both for the real `projectPreference:create` and `preference:manageInstance`
 * scopes when the backend registers them.
 */

export function canWriteProjectScope(projectId: string | null | undefined): boolean {
	if (!projectId) return false;
	const project = useProjectsStore().myProjects.find((candidate) => candidate.id === projectId);
	return getResourcePermissions(project?.scopes).projectVariable?.create === true;
}

export function canWriteInstanceScope(): boolean {
	return useUsersStore().isAdminOrOwner;
}
