/**
 * Validation codes that must not block a save / CLI exit.
 *
 * Single source of truth for severity: CLI `validate` and Instance AI's
 * `partitionWarnings` both use this set. Source-lint findings carry no
 * separate severity field — membership here is what makes them warnings.
 */
export const INFORMATIONAL_VALIDATION_CODES: ReadonlySet<string> = new Set([
	'MISSING_TRIGGER',
	'DISCONNECTED_NODE',
	'auto_imported_sdk_symbols',
	// Source lint (workflow-sdk validate CLI)
	'CODE_NODE_NETWORK_CALL',
	'CODE_MODE_API_MISUSE',
	'CODE_NODE_FORBIDDEN_IMPORT',
	'CODE_NESTED_TEMPLATE_LITERAL',
	'SDK_CODE_AFTER_EXPORT_DEFAULT',
	'SDK_REPEATED_BRANCH_WIRING',
	'SDK_FORBIDDEN_CONSTRUCT',
	'SDK_AS_CONST',
	'SDK_PLACEHOLDER_WRAPPED',
	'SDK_UNSOLICITED_STICKY',
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
