/**
 * Raw Credential Validator
 *
 * Flags credential values that must never appear in SDK output:
 * - `id: null` / `__aiGatewayManaged` (n8n credits synthetic entries)
 * - `mock-*` credential IDs
 */

import { isRecord } from '@n8n/utils/is-record';

import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

function collectCredentialIssues(
	credentials: Record<string, unknown>,
	nodeName: string,
	pathPrefix: string,
	issues: ValidationIssue[],
): void {
	for (const [credType, value] of Object.entries(credentials)) {
		if (!isRecord(value)) continue;

		const parameterPath = pathPrefix ? `${pathPrefix}.${credType}` : credType;

		if (value.__aiGatewayManaged === true || value.id === null) {
			issues.push({
				code: 'RAW_CREDENTIAL_OBJECT',
				message:
					`'${nodeName}' credentials.${parameterPath} carries id: null or __aiGatewayManaged. ` +
					'Those markers are synthetic list entries for n8n credits — never emit them in SDK code. ' +
					"Use newCredential('Suggested Name') and let setup attach n8n credits automatically.",
				severity: 'warning',
				violationLevel: 'major',
				nodeName,
				parameterPath: `credentials.${parameterPath}`,
			});
			continue;
		}

		if (typeof value.id === 'string' && value.id.startsWith('mock-')) {
			issues.push({
				code: 'RAW_CREDENTIAL_OBJECT',
				message:
					`'${nodeName}' credentials.${parameterPath} uses invented id "${value.id}". ` +
					"Never hardcode mock-* credential IDs — use newCredential('Name', 'real-id') only when " +
					'the user selected a specific credential, or newCredential("Name") for unresolved setup.',
				severity: 'warning',
				violationLevel: 'major',
				nodeName,
				parameterPath: `credentials.${parameterPath}`,
			});
		}
	}
}

function walkSubnodeCredentials(
	subnodes: unknown,
	nodeName: string,
	path: string,
	issues: ValidationIssue[],
): void {
	if (!isRecord(subnodes)) return;

	for (const [key, value] of Object.entries(subnodes)) {
		const entries = Array.isArray(value) ? value : [value];
		entries.forEach((entry, index) => {
			if (!isRecord(entry) || !isRecord(entry.config)) return;
			const entryPath = Array.isArray(value) ? `${path}.${key}[${index}]` : `${path}.${key}`;
			const creds = entry.config.credentials;
			if (isRecord(creds)) {
				collectCredentialIssues(creds, nodeName, entryPath, issues);
			}
			if (entry.config.subnodes !== undefined) {
				walkSubnodeCredentials(entry.config.subnodes, nodeName, `${entryPath}.subnodes`, issues);
			}
		});
	}
}

/**
 * Validator for forbidden credential shapes in SDK node configs.
 */
export const rawCredentialValidator: ValidatorPlugin = {
	id: 'core:raw-credential',
	name: 'Raw Credential Validator',
	priority: 46,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		_ctx: PluginContext,
	): ValidationIssue[] {
		const issues: ValidationIssue[] = [];
		const creds = node.config?.credentials;
		if (isRecord(creds)) {
			collectCredentialIssues(creds, node.name, '', issues);
		}
		if (node.config?.subnodes !== undefined) {
			walkSubnodeCredentials(node.config.subnodes, node.name, 'subnodes', issues);
		}
		return issues;
	},
};
