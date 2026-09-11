import type {
	AiPreferenceDto,
	AiPreferenceListDto,
	AiPreferenceProjectDto,
	AiPreferenceScope,
} from '@n8n/api-types';

/**
 * Who a preference applies to. Not a stored column: the `ai_preference` entity
 * encodes it as a tri-state over `userId` and `projectId`, and a CHECK constraint
 * forbids setting both. Derive it with `preferenceScope`.
 */
export type PreferenceScopeType = AiPreferenceScope;

export type PreferenceProjectRef = AiPreferenceProjectDto;

/** One `ai_preference` row, as `GET /rest/ai-preferences` returns it. */
export type Preference = AiPreferenceDto;

export interface PreferenceListQuery {
	skip?: number;
	take?: number;
}

export type PreferenceListResponse = AiPreferenceListDto;

/**
 * The client states the scope it wants rather than the columns. It cannot set
 * `userId` itself: for a personal preference the server uses the acting user.
 */
export interface PreferencePayload {
	content: string;
	scope: PreferenceScopeType;
	/** Required when `scope` is `project`, refused otherwise. */
	projectId?: string | null;
}

/** What the current user may do to one row. */
export interface PreferencePermissions {
	update: boolean;
	delete: boolean;
}
