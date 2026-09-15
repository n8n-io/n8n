import { CANVAS_ONLY_PERSONAL_SPACE_ROLE_SETTING } from '../constants.ee';

/**
 * Reads the stored value of `CANVAS_ONLY_PERSONAL_SPACE_ROLE_SETTING`. Returns
 * only scopes that may still be removed. A missing or malformed value means
 * nothing is removed, so a bad row can never lock the role down further.
 */
export function parseRemovedPersonalSpaceScopes(value: string | undefined | null): string[] {
	if (!value) return [];

	try {
		const stored: unknown = JSON.parse(value);
		if (!Array.isArray(stored)) return [];
		return CANVAS_ONLY_PERSONAL_SPACE_ROLE_SETTING.scopes.filter((slug) => stored.includes(slug));
	} catch {
		return [];
	}
}
