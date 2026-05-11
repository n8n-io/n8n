import { isExpression } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';

import type { ProgrammaticViolation } from '../types';

// Patterns for credential-like field names in Set nodes
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

// Header names that typically contain credentials (lowercase for comparison)
const SENSITIVE_HEADERS = new Set([
	'authorization',
	'x-api-key',
	'x-auth-token',
	'x-access-token',
	'api-key',
	'apikey',
]);

/**
 * Checks if a field name looks like it's meant to store credentials
 */
function isCredentialFieldName(name: string): boolean {
	return CREDENTIAL_FIELD_PATTERNS.some((pattern) => pattern.test(name));
}

/**
 * Checks if a header name is one that typically contains credentials
 */
function isSensitiveHeader(headerName: string): boolean {
	return SENSITIVE_HEADERS.has(headerName.toLowerCase());
}

interface HeaderParameter {
	name?: string;
	value?: unknown;
}

interface QueryParameter {
	name?: string;
	value?: unknown;
}

interface SetNodeAssignment {
	name?: string;
	value?: unknown;
	type?: string;
}

/**
 * Type guard for checking if an array contains valid parameter objects
 */
function isParameterArray(arr: unknown): arr is Array<{ name?: string; value?: unknown }> {
	return (
		Array.isArray(arr) &&
		arr.every((item) => typeof item === 'object' && item !== null && !Array.isArray(item))
	);
}

/**
 * Type guard for checking if a value is a parameters container (headerParameters or queryParameters)
 */
function isParametersContainer(
	value: unknown,
): value is { parameters?: Array<{ name?: string; value?: unknown }> } {
	if (typeof value !== 'object' || value === null) return false;
	const obj = value as Record<string, unknown>;
	return !('parameters' in obj) || isParameterArray(obj.parameters);
}

/**
 * Type guard for checking if a value is an assignments container (Set node)
 */
function isAssignmentsContainer(value: unknown): value is { assignments?: SetNodeAssignment[] } {
	if (typeof value !== 'object' || value === null) return false;
	const obj = value as Record<string, unknown>;
	return !('assignments' in obj) || isParameterArray(obj.assignments);
}

/**
 * Extracts header parameters from HTTP Request node parameters
 */
function getHeaderParameters(parameters: Record<string, unknown>): HeaderParameter[] {
	const headerParams = parameters.headerParameters;
	if (!isParametersContainer(headerParams)) return [];
	return headerParams.parameters ?? [];
}

/**
 * Extracts query parameters from HTTP Request node parameters
 */
function getQueryParameters(parameters: Record<string, unknown>): QueryParameter[] {
	const queryParams = parameters.queryParameters;
	if (!isParametersContainer(queryParams)) return [];
	return queryParams.parameters ?? [];
}

/**
 * Extracts assignments from Set node parameters
 */
function getSetNodeAssignments(parameters: Record<string, unknown>): SetNodeAssignment[] {
	const assignments = parameters.assignments;
	if (!isAssignmentsContainer(assignments)) return [];
	return assignments.assignments ?? [];
}

/**
 * Checks if a parameter has a hardcoded credential value
 */
function hasHardcodedCredentialValue(param: { value?: unknown }): boolean {
	return Boolean(param.value) && !isExpression(param.value);
}

/**
 * Validates HTTP Request node for hardcoded credentials
 */
function validateHttpRequestNode(
	node: SimpleWorkflow['nodes'][0],
	violations: ProgrammaticViolation[],
): void {
	const params = node.parameters ?? {};

	// Check header parameters for sensitive headers with hardcoded values
	for (const header of getHeaderParameters(params)) {
		if (header.name && isSensitiveHeader(header.name) && hasHardcodedCredentialValue(header)) {
			violations.push({
				name: 'http-request-hardcoded-credentials',
				type: 'minor',
				description: `HTTP Request node "${node.name}" has a hardcoded value for sensitive header "${header.name}". Use n8n credentials instead (e.g., httpHeaderAuth, httpBearerAuth).`,
				pointsDeducted: 5,
			});
		}
	}

	// Check query parameters for credential-like names with hardcoded values
	for (const param of getQueryParameters(params)) {
		if (param.name && isCredentialFieldName(param.name) && hasHardcodedCredentialValue(param)) {
			violations.push({
				name: 'http-request-hardcoded-credentials',
				type: 'minor',
				description: `HTTP Request node "${node.name}" has a hardcoded value for credential-like query parameter "${param.name}". Use n8n credentials instead (e.g., httpQueryAuth).`,
				pointsDeducted: 5,
			});
		}
	}
}

/**
 * Validates Set node for credential-like field names
 */
function validateSetNode(
	node: SimpleWorkflow['nodes'][0],
	violations: ProgrammaticViolation[],
): void {
	const params = node.parameters ?? {};

	for (const assignment of getSetNodeAssignments(params)) {
		if (assignment.name && isCredentialFieldName(assignment.name)) {
			violations.push({
				name: 'set-node-credential-field',
				type: 'minor',
				description: `Set node "${node.name}" has a field named "${assignment.name}" which appears to be storing credentials. Credentials should be stored securely using n8n's credential system, not in workflow data.`,
				pointsDeducted: 5,
			});
		}
	}
}

/**
 * Validates that HTTP Request nodes don't have hardcoded credentials
 * and Set nodes don't have fields that look like they're storing credentials
 */
export function validateCredentials(workflow: SimpleWorkflow): ProgrammaticViolation[] {
	const violations: ProgrammaticViolation[] = [];

	if (!workflow.nodes || workflow.nodes.length === 0) {
		return violations;
	}

	for (const node of workflow.nodes) {
		if (node.type === 'n8n-nodes-base.httpRequest') {
			validateHttpRequestNode(node, violations);
		} else if (node.type === 'n8n-nodes-base.set') {
			validateSetNode(node, violations);
		}
	}

	return violations;
}
