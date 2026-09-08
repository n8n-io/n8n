import type { IconOrEmoji } from '@n8n/design-system';

/** Who a preference applies to. */
export type PreferenceScopeType = 'user' | 'project' | 'instance';

export interface PreferenceProjectRef {
	id: string;
	name: string;
	icon?: IconOrEmoji | null;
}

export interface Preference {
	id: string;
	text: string;
	scopeType: PreferenceScopeType;
	/** Set only when `scopeType` is `project`. */
	projectId: string | null;
	project: PreferenceProjectRef | null;
	/**
	 * Row-level permissions, as workflows, credentials and projects already carry.
	 *
	 * Typed as `string[]` rather than `Scope[]` because `preference:*` is not a
	 * registered resource in `@n8n/permissions` yet. Once the backend registers it,
	 * replace `toPreferencePermissions` with `getResourcePermissions`.
	 */
	scopes: string[];
	createdAt: string;
	updatedAt: string;
}

export interface PreferenceListQuery {
	skip?: number;
	take?: number;
}

export interface PreferenceListResponse {
	count: number;
	data: Preference[];
}

export interface CreatePreferencePayload {
	text: string;
	scopeType: PreferenceScopeType;
	projectId?: string | null;
}

export interface UpdatePreferencePayload {
	text?: string;
	scopeType?: PreferenceScopeType;
	projectId?: string | null;
}

/** What the current user may do to one row. */
export interface PreferencePermissions {
	update: boolean;
	delete: boolean;
}
