/**
 * Severity for validation / lint findings.
 *
 * - `error` — fatal for `ValidationResult.valid`
 * - `warning` — non-fatal for `valid`, but blocks CLI exit / build-workflow save
 * - `informational` — never blocks CLI exit / build-workflow save
 *
 * Set severity where the issue is created (validator plugin, ValidationWarning,
 * or source-lint rule). Do not maintain a parallel code allowlist.
 */
export type IssueSeverity = 'error' | 'warning' | 'informational';

export function isInformationalIssue(issue: unknown): boolean {
	if (typeof issue !== 'object' || issue === null || !('severity' in issue)) {
		return false;
	}
	return Reflect.get(issue, 'severity') === 'informational';
}

export function partitionValidationIssues<T>(issues: readonly T[]): {
	blocking: T[];
	informational: T[];
} {
	const blocking: T[] = [];
	const informational: T[] = [];

	for (const issue of issues) {
		if (isInformationalIssue(issue)) {
			informational.push(issue);
		} else {
			blocking.push(issue);
		}
	}

	return { blocking, informational };
}
