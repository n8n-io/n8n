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
	const informationalCodes = new Set(['MISSING_TRIGGER', 'DISCONNECTED_NODE']);

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
