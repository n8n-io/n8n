import type { IconOrEmoji } from '@n8n/design-system';

/**
 * Who a preference applies to. Not a stored column: the `ai_preference` entity
 * encodes it as a tri-state over `userId` and `projectId`, and a CHECK constraint
 * forbids setting both. Derive it with `preferenceScope`.
 */
export type PreferenceScopeType = 'user' | 'project' | 'instance';

export interface PreferenceProjectRef {
	id: string;
	name: string;
	icon?: IconOrEmoji | null;
}

/** One `ai_preference` row, as the REST layer is expected to return it. */
export interface Preference {
	id: string;
	content: string;
	/** Set when the preference belongs to one user. */
	userId: string | null;
	/** Set when the preference belongs to one project. */
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

/**
 * The client states the scope it wants rather than the columns. It cannot set
 * `userId` itself: for a personal preference the server uses the acting user.
 */
export interface PreferencePayload {
	content: string;
	scope: PreferenceScopeType;
	/** Required when `scope` is `project`, ignored otherwise. */
	projectId?: string | null;
}

/** What the current user may do to one row. */
export interface PreferencePermissions {
	update: boolean;
	delete: boolean;
}
