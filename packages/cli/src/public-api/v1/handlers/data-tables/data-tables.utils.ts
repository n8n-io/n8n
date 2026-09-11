/**
 * Convert all query parameter values to strings for DTO validation.
 * Express/Supertest may parse some values as numbers/booleans.
 */
export const stringifyQuery = (
	query: Record<string, unknown>,
): Record<string, string | undefined> => {
	const result: Record<string, string | undefined> = {};
	for (const [key, value] of Object.entries(query)) {
		if (value !== undefined && value !== null) {
			result[key] = String(value);
		}
	}
	return result;
};
