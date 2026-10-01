import type { AiPreferenceDto } from '@n8n/api-types';

/** One `ai_preference` row, as `GET /rest/ai-preferences` returns it. */
export type Preference = AiPreferenceDto;

export interface PreferenceListQuery {
	skip?: number;
	take?: number;
	/** Only these rows. The API reads them as one comma-separated parameter. */
	ids?: string[];
}

/** What the current user may do to one row. */
export interface PreferencePermissions {
	update: boolean;
	delete: boolean;
}
