import { partitionValidationIssues } from '@n8n/workflow-sdk';

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
	// Codes come from @n8n/workflow-sdk INFORMATIONAL_VALIDATION_CODES so the
	// CLI `validate` exit code and the build-workflow save gate stay aligned.
	return partitionValidationIssues(warnings);
}
