export interface ValidationWarning {
	code: string;
	message: string;
	nodeName?: string;
}

export function collectValidationIssues(
	issues: Array<{ code: string; message: string; nodeName?: string }>,
	allWarnings: ValidationWarning[],
): void {
	for (const issue of issues) {
		allWarnings.push({
			code: issue.code,
			message: issue.message,
			nodeName: issue.nodeName,
		});
	}
}

export function partitionWarnings(warnings: ValidationWarning[]): {
	errors: ValidationWarning[];
	informational: ValidationWarning[];
} {
	const informationalCodes = new Set([
		'MISSING_TRIGGER',
		'DISCONNECTED_NODE',
		// Incomplete routers on legacy workflows should not block incidental edits.
		'IF_NO_OUTPUT_CONNECTIONS',
		'SWITCH_NO_OUTPUT_CONNECTIONS',
		'SWITCH_FALLBACK_OUTPUT_DISABLED',
	]);

	const errors: ValidationWarning[] = [];
	const informational: ValidationWarning[] = [];

	for (const warning of warnings) {
		if (informationalCodes.has(warning.code)) {
			informational.push(warning);
		} else {
			errors.push(warning);
		}
	}

	return { errors, informational };
}
