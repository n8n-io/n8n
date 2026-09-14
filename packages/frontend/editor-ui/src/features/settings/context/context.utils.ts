import { getResourcePermissions } from '@n8n/permissions';

import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { splitName } from '@/features/collaboration/projects/projects.utils';
import { useUsersStore } from '@n8n/stores/users.store';

import type {
	Preference,
	PreferencePermissions,
	PreferenceScopeType,
	PreferenceUserRef,
} from './context.types';

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
 * How the badge and the scope picker name a row. A user row follows its user into
 * every project; a personal project row applies only there. Both belong to one
 * user, so the label says whose they are when that user is not the viewer.
 */
export type PreferenceAudience =
	| { kind: 'instance' }
	| { kind: 'user'; own: boolean; user: PreferenceUserRef | null }
	| { kind: 'personalProject'; own: boolean; ownerName: string }
	| { kind: 'project'; name: string | null };

export function preferenceAudience(
	row: Preference,
	currentUserId: string | undefined,
): PreferenceAudience {
	switch (preferenceScope(row)) {
		case 'instance':
			return { kind: 'instance' };
		case 'user':
			return { kind: 'user', own: row.userId === currentUserId, user: row.user };
		case 'project':
			if (row.project?.type === 'personal') {
				// A personal project is named `First Last <email>`; the owner is the name part.
				const { name, email } = splitName(row.project.name);
				return {
					kind: 'personalProject',
					own: row.projectId === useProjectsStore().personalProject?.id,
					ownerName: name ?? email ?? row.project.name,
				};
			}
			return { kind: 'project', name: row.project?.name ?? null };
	}
}

/** The display name of a user row's owner: the full name when set, else the email. */
export function preferenceUserName(user: PreferenceUserRef | null): string {
	if (!user) return '';
	const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
	return fullName || user.email;
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
