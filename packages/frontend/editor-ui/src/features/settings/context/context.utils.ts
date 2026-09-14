import type { AiPreferenceScope, AiPreferenceUserDto } from '@n8n/api-types';
import {
	aiPreferenceScopeOf,
	CONTEXT_PREFERENCES_ENABLED_VARIANT,
	CONTEXT_PREFERENCES_FLAG,
} from '@n8n/api-types';
import { getResourcePermissions } from '@n8n/permissions';

import { usePostHog } from '@/app/stores/posthog.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { splitName } from '@/features/collaboration/projects/projects.utils';
import { useUsersStore } from '@n8n/stores/users.store';

import type { Preference, PreferencePermissions } from './context.types';

/**
 * Gate for the Context settings surface.
 *
 * The flag is the only signal, because there is no backend module to deliver an
 * operator override in the settings payload yet. Add that second signal alongside the
 * real endpoints, so instances with telemetry switched off can still opt in.
 *
 * The flag is multivariate, so only the `variant` arm enables the surface.
 *
 * Override locally with:
 *   window.featureFlags.override('111_context_preferences', 'variant')
 */
export function isContextPreferencesEnabled(): boolean {
	return usePostHog().isVariantEnabled(
		CONTEXT_PREFERENCES_FLAG,
		CONTEXT_PREFERENCES_ENABLED_VARIANT,
	);
}

/** How long a deep link waits for client-side flag evaluation before it fails closed. */
const FLAG_WAIT_TIMEOUT_MS = 3000;

/**
 * The flag gate for a route. When the server delivered no flags and the client is
 * still evaluating them, a deep link waits for that first evaluation, so an
 * enrolled user is not bounced to the homepage by an unset value.
 */
export async function isContextPreferencesEnabledOnceEvaluated(): Promise<boolean> {
	const posthog = usePostHog();
	if (posthog.hasPendingFeatureFlags()) {
		let timeoutId: number | undefined;
		await Promise.race([
			posthog.waitForFeatureFlags(),
			new Promise<void>((resolve) => {
				timeoutId = window.setTimeout(resolve, FLAG_WAIT_TIMEOUT_MS);
			}),
		]);
		if (timeoutId !== undefined) window.clearTimeout(timeoutId);
	}
	return isContextPreferencesEnabled();
}

/** The same decode the backend runs when it groups rows for a prompt. */
export function preferenceScope(row: Pick<Preference, 'userId' | 'projectId'>): AiPreferenceScope {
	return aiPreferenceScopeOf(row);
}

/**
 * How the badge and the scope picker name a row. A user row follows its user into
 * every project; a personal project row applies only there. Both belong to one
 * user, so the label says whose they are when that user is not the viewer.
 */
export type PreferenceAudience =
	| { kind: 'instance' }
	| { kind: 'user'; own: boolean; user: AiPreferenceUserDto | null }
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

/** The display name of a user row's owner: the full name, else the email, else nothing. */
export function preferenceUserName(user: AiPreferenceUserDto | null): string {
	if (!user) return '';
	const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
	return fullName || user.email || '';
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
