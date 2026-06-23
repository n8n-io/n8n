export interface ValidationWarning {
	code: string;
	message: string;
	nodeName?: string;
}

export interface PartitionWarningsOptions {
	/** When true, incomplete router warnings are informational (legacy edits). */
	isWorkflowUpdate?: boolean;
}

/** Router topology warnings — blocking on new workflows, informational on updates. */
export const ROUTER_VALIDATION_WARNING_CODES = new Set([
	'IF_NO_OUTPUT_CONNECTIONS',
	'SWITCH_NO_OUTPUT_CONNECTIONS',
	'SWITCH_FALLBACK_OUTPUT_DISABLED',
]);

const ALWAYS_INFORMATIONAL_CODES = new Set(['MISSING_TRIGGER', 'DISCONNECTED_NODE']);

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

export function toValidationWarningRecords(
	warnings: ValidationWarning[],
): Array<{ code: string; message: string; nodeName?: string }> {
	return warnings.map(({ code, message, nodeName }) => ({
		code,
		message,
		...(nodeName ? { nodeName } : {}),
	}));
}

function isInformationalWarning(
	warning: ValidationWarning,
	options: PartitionWarningsOptions,
): boolean {
	if (ALWAYS_INFORMATIONAL_CODES.has(warning.code)) return true;

	if (ROUTER_VALIDATION_WARNING_CODES.has(warning.code)) {
		return options.isWorkflowUpdate === true;
	}

	return false;
}

export function partitionWarnings(
	warnings: ValidationWarning[],
	options: PartitionWarningsOptions = {},
): {
	errors: ValidationWarning[];
	informational: ValidationWarning[];
} {
	const errors: ValidationWarning[] = [];
	const informational: ValidationWarning[] = [];

	for (const warning of warnings) {
		if (isInformationalWarning(warning, options)) {
			informational.push(warning);
		} else {
			errors.push(warning);
		}
	}

	return { errors, informational };
}
