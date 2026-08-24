import { partitionValidationIssues, type IssueSeverity } from '@n8n/workflow-sdk';
import type { WorkflowGroupViolation } from 'n8n-workflow';

export const NODE_GROUP_DROPPED_CODE = 'NODE_GROUP_DROPPED';

export interface ValidationWarning {
	code: string;
	message: string;
	nodeName?: string;
	/** Set at the creation site; `informational` never blocks save. */
	severity?: IssueSeverity;
}

export function collectValidationIssues(
	issues: Array<{
		code: string;
		message: string;
		nodeName?: string;
		severity?: IssueSeverity;
	}>,
	allWarnings: ValidationWarning[],
): void {
	for (const issue of issues) {
		allWarnings.push({
			code: issue.code,
			message: issue.message,
			nodeName: issue.nodeName,
			severity: issue.severity,
		});
	}
}

export function partitionWarnings(warnings: ValidationWarning[]): {
	blocking: ValidationWarning[];
	informational: ValidationWarning[];
} {
	// Severity is set where each issue is created (SDK validators / lint /
	// Instance AI host detectors). CLI validate and this save gate share
	// {@link partitionValidationIssues}.
	return partitionValidationIssues(warnings);
}

export function nodeGroupDroppedWarnings(
	violations: WorkflowGroupViolation[],
): ValidationWarning[] {
	const violationsByGroup = new Map<string, WorkflowGroupViolation[]>();
	for (const violation of violations) {
		const key = JSON.stringify([violation.groupId, violation.groupName]);
		const groupViolations = violationsByGroup.get(key);
		if (groupViolations) {
			groupViolations.push(violation);
		} else {
			violationsByGroup.set(key, [violation]);
		}
	}

	const warnings: ValidationWarning[] = [];
	for (const groupViolations of violationsByGroup.values()) {
		const firstViolation = groupViolations[0];
		if (!firstViolation) continue;
		const messages = groupViolations.map(({ message }) => message);
		warnings.push(formatNodeGroupDroppedWarning(firstViolation.groupName, messages));
	}
	return warnings;
}

function formatNodeGroupDroppedWarning(groupName: string, messages: string[]): ValidationWarning {
	return {
		code: NODE_GROUP_DROPPED_CODE,
		severity: 'informational',
		message: `Node group "${groupName}" was removed from the saved workflow: ${messages.join(' ')}`,
	};
}
