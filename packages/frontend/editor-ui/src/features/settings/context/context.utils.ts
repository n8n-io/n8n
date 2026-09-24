import type { AiPreferenceScope, AiPreferenceSource, AiPreferenceUserDto } from '@n8n/api-types';
import {
	aiPreferenceScopeOf,
	CONTEXT_PREFERENCES_ENABLED_VARIANT,
	CONTEXT_PREFERENCES_FLAG,
} from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';

import { usePostHog } from '@/app/stores/posthog.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { splitName } from '@/features/collaboration/projects/projects.utils';
import { useUsersStore } from '@n8n/stores/users.store';

import type { Preference, PreferencePermissions } from './context.types';

/**
 * Multivariate flag: only `variant` enables the surface.
 * Local override: `window.featureFlags.override('111_context_preferences', 'variant')`
 */
export function isContextPreferencesEnabled(): boolean {
	return usePostHog().isVariantEnabled(
		CONTEXT_PREFERENCES_FLAG,
		CONTEXT_PREFERENCES_ENABLED_VARIANT,
	);
}

const FLAG_WAIT_TIMEOUT_MS = 3000;

/** Waits for a pending client-side flag evaluation before a deep link fails closed. */
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

export function preferenceScope(row: Pick<Preference, 'userId' | 'projectId'>): AiPreferenceScope {
	return aiPreferenceScopeOf(row);
}

/** How the badge and the picker name a row. */
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

/** The surface that wrote the row, as the settings list names it. */
export function preferenceSourceLabel(
	i18n: { baseText: (key: BaseTextKey) => string },
	source: AiPreferenceSource,
): string {
	return i18n.baseText(`settings.context.preferences.source.${source}`);
}

export function preferenceUserName(user: AiPreferenceUserDto | null): string {
	if (!user) return '';
	const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
	return fullName || user.email || '';
}

/** The API reports row scopes in the `aiPreference` namespace whatever granted them. */
export function toPreferencePermissions(row: Preference): PreferencePermissions {
	const permissions = getResourcePermissions(row.scopes).aiPreference;
	return {
		update: permissions?.update === true,
		delete: permissions?.delete === true,
	};
}

/* Write checks for the scope picker, before a row exists. */

export function canWriteProjectScope(projectId: string | null | undefined): boolean {
	if (!projectId) return false;
	const project = useProjectsStore().myProjects.find((candidate) => candidate.id === projectId);
	return getResourcePermissions(project?.scopes).projectAiPreference?.create === true;
}

export function canWriteInstanceScope(): boolean {
	const { currentUser } = useUsersStore();
	return getResourcePermissions(currentUser?.globalScopes).aiPreference?.create === true;
}
