import type { BinaryCheck } from '../types';
import { SET_NODE_TYPE } from '../utils';

const CREDENTIAL_FIELD_PATTERNS = [
	/api[_-]?key/i,
	/access[_-]?token/i,
	/auth[_-]?token/i,
	/bearer[_-]?token/i,
	/secret[_-]?key/i,
	/private[_-]?key/i,
	/client[_-]?secret/i,
	/password/i,
	/credentials?/i,
	/^token$/i,
	/^secret$/i,
	/^auth$/i,
];

function isCredentialLikeName(name: string): boolean {
	return CREDENTIAL_FIELD_PATTERNS.some((p) => p.test(name));
}

function isHardcodedValue(value: unknown): boolean {
	return typeof value === 'string' && value.length > 0 && !value.startsWith('=');
}

function checkSetNode(nodeName: string, params: Record<string, unknown>, issues: string[]): void {
	const assignments = params.assignments as
		| { assignments?: Array<{ name?: string; value?: unknown }> }
		| undefined;
	if (!Array.isArray(assignments?.assignments)) return;

	for (const assignment of assignments.assignments) {
		if (
			typeof assignment.name === 'string' &&
			isCredentialLikeName(assignment.name) &&
			isHardcodedValue(assignment.value)
		) {
			issues.push(`"${nodeName}" has hardcoded credential in field "${assignment.name}"`);
		}
	}
}

/**
 * Set-node scope only. HTTP nodes are covered by
 * `secrets_use_credentials_not_parameters`, which handles every HTTP variant and
 * both the keypair and raw-JSON parameter forms. Splitting them means one
 * mistake costs one check rather than two, and keeps this metric's history
 * comparable.
 */
export const noHardcodedCredentials: BinaryCheck = {
	name: 'no_hardcoded_credentials',
	description: 'No hardcoded credentials in Set node fields',
	kind: 'deterministic',
	dimension: 'security',
	run(workflow) {
		const candidates = (workflow.nodes ?? []).filter((n) => n.type === SET_NODE_TYPE);
		if (candidates.length === 0) return { pass: true, applicable: false };

		const issues: string[] = [];
		for (const node of candidates) {
			if (!node.parameters) continue;
			checkSetNode(node.name, node.parameters, issues);
		}

		return {
			pass: issues.length === 0,
			...(issues.length > 0 ? { comment: issues.join('; ') } : {}),
		};
	},
};
