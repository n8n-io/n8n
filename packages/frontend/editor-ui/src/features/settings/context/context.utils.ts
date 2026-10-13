import type {
	AiPreferenceScope,
	AiPreferenceSortOption,
	AiPreferenceUserDto,
} from '@n8n/api-types';
import {
	AI_PREFERENCES_SORT_OPTIONS,
	aiPreferenceScopeOf,
	CONTEXT_PREFERENCES_ENABLED_VARIANT,
	CONTEXT_PREFERENCES_FLAG,
} from '@n8n/api-types';
import type { TableOptions } from '@n8n/design-system';
import type { BaseTextKey } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import { ResponseError } from '@n8n/rest-api-client';

import { usePostHog, waitForFeatureFlagsWithTimeout } from '@/app/stores/posthog.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { splitName } from '@/features/collaboration/projects/projects.utils';
import { useUsersStore } from '@n8n/stores/users.store';

import { PREFERENCES_DEFAULT_SORT_BY } from './context.constants';
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

/**
 * Waits for a pending client-side flag evaluation before a deep link fails closed.
 * `waitForFeatureFlagsWithTimeout` resolves immediately when nothing is pending, so
 * this doesn't need its own `hasPendingFeatureFlags()` guard.
 */
export async function isContextPreferencesEnabledOnceEvaluated(): Promise<boolean> {
	await waitForFeatureFlagsWithTimeout(usePostHog(), FLAG_WAIT_TIMEOUT_MS);
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

export function preferenceCreatorLabel(
	i18n: {
		baseText: (key: BaseTextKey, options?: { interpolate: Record<string, string> }) => string;
	},
	row: Pick<Preference, 'createdBy' | 'source'>,
): string {
	const source = i18n.baseText(`settings.context.preferences.source.${row.source}`);
	const name = preferenceUserName(row.createdBy);
	if (!name) return source;
	if (row.source === 'ui') return name;
	return i18n.baseText('settings.context.preferences.createdBy.withSource', {
		interpolate: { name, source },
	});
}

export function preferenceUserName(user: AiPreferenceUserDto | null): string {
	if (!user) return '';
	const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
	return fullName || user.email || '';
}

export function toPreferenceSortOption(
	sortBy: TableOptions['sortBy'],
): AiPreferenceSortOption | undefined {
	const [sort] = sortBy.length > 0 ? sortBy : PREFERENCES_DEFAULT_SORT_BY;
	const option = `${sort.id}:${sort.desc ? 'desc' : 'asc'}`;
	return AI_PREFERENCES_SORT_OPTIONS.find((candidate) => candidate === option);
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

/** The service builds the cap message from the scope and the number, so match the fixed part. */
const SCOPE_FULL_MESSAGE = 'cannot hold more than';

/**
 * Why a save from the settings page did not land, in the same words the assistant surfaces use.
 * The status is what the service throws: 409 for the duplicate check, 403 for a scope the user
 * may not write. A 400 covers the per-scope cap and several malformed requests alike, so only
 * the cap message counts as `scope_full`. Anything else is `failed`, which keeps a form bug out
 * of the number that reviews the cap.
 */
export function preferenceWriteRejectionReason(
	error: unknown,
): 'duplicate' | 'scope_full' | 'not_permitted' | 'failed' {
	if (!(error instanceof ResponseError)) return 'failed';
	if (error.httpStatusCode === 409) return 'duplicate';
	if (error.httpStatusCode === 403) return 'not_permitted';
	if (error.httpStatusCode === 400 && error.message.includes(SCOPE_FULL_MESSAGE)) {
		return 'scope_full';
	}
	return 'failed';
}
