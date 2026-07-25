/**
 * AI Gateway (n8n credits) Validator
 *
 * Runs only when ValidationOptions.aiGatewayByNodeType supplies metadata for
 * the node type AND the node uses a managed / unresolved credits-style
 * credential. Mirrors instance-ai computeAiGatewayIssues for the graph path.
 */

import { isRecord } from '@n8n/utils/is-record';

import type { GraphNode, NodeInstance } from '../../../types/base';
import type { AiGatewayNodeMeta, PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

const OPERATION_ONLY = '__operation_only__';

function parseVersion(version: unknown): number {
	if (typeof version === 'number') return version;
	if (typeof version === 'string') {
		const parsed = Number.parseFloat(version);
		return Number.isFinite(parsed) ? parsed : 1;
	}
	return 1;
}

function usesManagedOrUnresolvedCredential(node: NodeInstance<string, string, unknown>): boolean {
	const creds = node.config?.credentials;
	if (!creds || !isRecord(creds)) return false;
	return Object.values(creds).some((entry) => {
		if (!isRecord(entry)) return false;
		if ('__aiGatewayManaged' in entry && entry.__aiGatewayManaged === true) return true;
		if ('id' in entry && entry.id === null) return true;
		if ('__newCredential' in entry && entry.__newCredential === true) {
			const id = 'id' in entry ? entry.id : undefined;
			return typeof id !== 'string' || id.length === 0;
		}
		return false;
	});
}

function checkAgainstMeta(
	node: NodeInstance<string, string, unknown>,
	meta: AiGatewayNodeMeta,
): ValidationIssue[] {
	const issues: ValidationIssue[] = [];
	const parameters = isRecord(node.config?.parameters) ? node.config.parameters : {};

	if (meta.minVersion !== undefined) {
		const typeVersion = parseVersion(node.version);
		if (typeVersion < meta.minVersion) {
			issues.push({
				code: 'AI_GATEWAY_CONSTRAINT',
				message:
					`'${node.name}' uses n8n credits but typeVersion ${typeVersion} is below the required ` +
					`minimum ${meta.minVersion}. Bump typeVersion or use a stored credential.`,
				severity: 'warning',
				violationLevel: 'major',
				nodeName: node.name,
			});
		}
	}

	if (meta.operations) {
		const operation = typeof parameters.operation === 'string' ? parameters.operation : undefined;
		if (operation !== undefined) {
			const resource =
				typeof parameters.resource === 'string' ? parameters.resource : OPERATION_ONLY;
			const allowed = meta.operations[resource];
			if (!allowed?.includes(operation)) {
				const scope = resource === OPERATION_ONLY ? '' : ` on resource "${resource}"`;
				issues.push({
					code: 'AI_GATEWAY_CONSTRAINT',
					message:
						`'${node.name}' operation "${operation}"${scope} is not supported via n8n credits. ` +
						'Switch to a supported operation or use a stored credential.',
					severity: 'warning',
					violationLevel: 'major',
					nodeName: node.name,
					parameterPath: 'operation',
				});
			}
		}
	}

	if (meta.hiddenProperties) {
		for (const propName of meta.hiddenProperties) {
			const value = parameters[propName];
			if (value === undefined || value === null || value === '') continue;
			issues.push({
				code: 'AI_GATEWAY_CONSTRAINT',
				message:
					`'${node.name}' sets "${propName}", which is not supported via n8n credits for this node. ` +
					'Remove it or use a stored credential.',
				severity: 'warning',
				violationLevel: 'major',
				nodeName: node.name,
				parameterPath: propName,
			});
		}
	}

	return issues;
}

/**
 * Validator for n8n credits / AI Gateway constraints when metadata is provided.
 */
export const aiGatewayValidator: ValidatorPlugin = {
	id: 'core:ai-gateway',
	name: 'AI Gateway Validator',
	priority: 47,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		ctx: PluginContext,
	): ValidationIssue[] {
		const byType = ctx.validationOptions?.aiGatewayByNodeType;
		if (!byType) return [];

		const meta = byType[node.type];
		if (!meta?.supported) return [];
		if (!usesManagedOrUnresolvedCredential(node)) return [];

		return checkAgainstMeta(node, meta);
	},
};
