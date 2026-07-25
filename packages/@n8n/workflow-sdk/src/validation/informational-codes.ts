/**
 * Validation codes that must not block a save / CLI exit.
 *
 * Shared by the workflow-sdk CLI `validate` command and Instance AI's
 * `partitionWarnings` so the local check predicts the build gate.
 *
 * New shape-aware rules land here first (informational), then promote to
 * blocking once eval corpus false-positive rates look clean.
 */
export const INFORMATIONAL_VALIDATION_CODES: ReadonlySet<string> = new Set([
	'MISSING_TRIGGER',
	'DISCONNECTED_NODE',
	'auto_imported_sdk_symbols',
	// Staged: envelope + responseIsEmpty pagination mismatch (promote after evals)
	'HTTP_PAGINATION_ENVELOPE_RESPONSE_IS_EMPTY',
]);

export function isInformationalValidationCode(code: string): boolean {
	return INFORMATIONAL_VALIDATION_CODES.has(code);
}

export function partitionValidationIssues<T extends { code: string }>(
	issues: readonly T[],
): { errors: T[]; informational: T[] } {
	const errors: T[] = [];
	const informational: T[] = [];

	for (const issue of issues) {
		if (isInformationalValidationCode(issue.code)) {
			informational.push(issue);
		} else {
			errors.push(issue);
		}
	}

	return { errors, informational };
}
