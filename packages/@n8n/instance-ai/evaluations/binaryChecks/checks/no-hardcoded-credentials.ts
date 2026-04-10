import type { BinaryCheck } from '../types';
import { HTTP_REQUEST_TYPE, SET_NODE_TYPE } from '../utils';

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

const SENSITIVE_HEADERS = new Set([
	'authorization',
	'x-api-key',
	'x-auth-token',
	'x-access-token',
	'api-key',
	'apikey',
]);

function isCredentialLikeName(name: string): boolean {
	return CREDENTIAL_FIELD_PATTERNS.some((p) => p.test(name));
}

function isHardcodedValue(value: unknown): boolean {
	return typeof value === 'string' && value.length > 0 && !value.startsWith('=');
}

function checkHttpRequestNode(
	nodeName: string,
	params: Record<string, unknown>,
	issues: string[],
): void {
	// Check headers
	const sendHeaders = params.sendHeaders as boolean | undefined;
	if (sendHeaders) {
		const headerParams = params.headerParameters as
			| { parameters?: Array<{ name?: string; value?: unknown }> }
			| undefined;
		if (Array.isArray(headerParams?.parameters)) {
			for (const header of headerParams.parameters) {
				if (
					typeof header.name === 'string' &&
					SENSITIVE_HEADERS.has(header.name.toLowerCase()) &&
					isHardcodedValue(header.value)
				) {
					issues.push(`"${nodeName}" has hardcoded credential in header "${header.name}"`);
				}
			}
		}
	}

	// Check query parameters
	const sendQuery = params.sendQuery as boolean | undefined;
	if (sendQuery) {
		const queryParams = params.queryParameters as
			| { parameters?: Array<{ name?: string; value?: unknown }> }
			| undefined;
		if (Array.isArray(queryParams?.parameters)) {
			for (const qp of queryParams.parameters) {
				if (
					typeof qp.name === 'string' &&
					isCredentialLikeName(qp.name) &&
					isHardcodedValue(qp.value)
				) {
					issues.push(`"${nodeName}" has hardcoded credential in query param "${qp.name}"`);
				}
			}
		}
	}
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

export const noHardcodedCredentials: BinaryCheck = {
	name: 'no_hardcoded_credentials',
	description: 'No hardcoded credentials in HTTP Request headers or Set node fields',
	kind: 'deterministic',
	run(workflow) {
		const nodes = workflow.nodes ?? [];
		if (nodes.length === 0) return { pass: true };

		const issues: string[] = [];

		for (const node of nodes) {
			if (!node.parameters) continue;

			if (node.type === HTTP_REQUEST_TYPE) {
				checkHttpRequestNode(node.name, node.parameters, issues);
			} else if (node.type === SET_NODE_TYPE) {
				checkSetNode(node.name, node.parameters, issues);
			}
		}

		return {
			pass: issues.length === 0,
			...(issues.length > 0 ? { comment: issues.join('; ') } : {}),
		};
	},
};
