import type { INodeUi } from '@/Interface';
import type { SecurityFinding } from '../types';
import { walkParameters } from '../utils/parameterWalker';
import { redactValue } from '../utils/redact';
import { getAssignmentFields } from '../utils/nodeClassification';

// PII value patterns
const PII_VALUE_PATTERNS: Array<{ pattern: RegExp; type: string }> = [
	{
		pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
		type: 'Email address',
	},
	{
		pattern: /\b\d{3}-\d{2}-\d{4}\b/,
		type: 'SSN (Social Security Number)',
	},
	{
		pattern:
			/\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/,
		type: 'Credit card number',
	},
	{
		pattern: /\b\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
		type: 'Phone number',
	},
];

// Field names that typically hold PII data (checked in Set node assignments)
const PII_FIELD_PATTERNS = [
	/^first[_-]?name$/i,
	/^last[_-]?name$/i,
	/^full[_-]?name$/i,
	/^ssn$/i,
	/^social[_-]?security/i,
	/^date[_-]?of[_-]?birth$/i,
	/^dob$/i,
	/^passport/i,
	/^driver[_-]?license/i,
	/^national[_-]?id/i,
	/^tax[_-]?id/i,
	/^credit[_-]?card/i,
];

function isPiiFieldName(name: string): boolean {
	return PII_FIELD_PATTERNS.some((pattern) => pattern.test(name));
}

/**
 * Detects PII patterns (emails, SSNs, credit cards, phone numbers) in node parameters
 * and flags Set node fields that use PII-related field names.
 */
export function checkPiiPatterns(nodes: INodeUi[]): SecurityFinding[] {
	const findings: SecurityFinding[] = [];
	let counter = 0;

	for (const node of nodes) {
		if (!node.parameters) continue;

		// Check for PII values in all string parameters
		walkParameters(node.parameters, (value, path, isExpr) => {
			if (isExpr) return;

			for (const { pattern, type } of PII_VALUE_PATTERNS) {
				if (pattern.test(value)) {
					findings.push({
						id: `pii-${++counter}`,
						category: 'pii-data-flow',
						severity: 'warning',
						title: `${type} detected in parameter`,
						description:
							'Hardcoded PII found. Consider using expressions or credentials instead of embedding personal data directly.',
						remediation:
							'1. Remove the hardcoded personal data from the parameter.\n2. If this is test data, use placeholder values instead (e.g., "test@example.com").\n3. For production data, use expressions to reference input data dynamically rather than hardcoding PII.\n4. Consider adding a Set node to redact or mask PII before passing it downstream.',
						nodeName: node.name,
						nodeId: node.id,
						nodeType: node.type,
						parameterPath: path,
						matchedValue: redactValue(value),
					});
					return; // one finding per value
				}
			}
		});

		// Check assignment collection parameters for PII field names
		const assignmentFieldNames = getAssignmentFields(node);
		for (const fieldName of assignmentFieldNames) {
			const assignmentParam = (node.parameters as Record<string, unknown>)[fieldName] as
				| { assignments?: Array<{ name?: string }> }
				| undefined;
			const assignments = assignmentParam?.assignments;
			if (Array.isArray(assignments)) {
				for (const assignment of assignments) {
					if (assignment.name && isPiiFieldName(assignment.name)) {
						findings.push({
							id: `pii-${++counter}`,
							category: 'pii-data-flow',
							severity: 'warning',
							title: `PII field "${assignment.name}" in "${node.name}"`,
							description:
								'This field name suggests personal data is being processed. Ensure proper handling per your data privacy policy.',
							remediation:
								'1. Review whether this field truly needs to contain personal data.\n2. If the data is passed to external services, add a filtering step to redact or mask the PII.\n3. Consider renaming the field to a less identifiable name if the downstream consumer allows it.\n4. Document your data handling in accordance with your privacy policy.',
							nodeName: node.name,
							nodeId: node.id,
							nodeType: node.type,
							parameterPath: `${fieldName}.${assignment.name}`,
						});
					}
				}
			}
		}
	}

	return findings;
}
