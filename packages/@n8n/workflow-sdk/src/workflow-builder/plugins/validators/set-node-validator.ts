/**
 * Set Node Validator Plugin
 *
 * Validates Set nodes for security issues like credential-like field names.
 */

import type { GraphNode, NodeInstance } from '../../../types/base';
import { isCredentialFieldName } from '../../validation-helpers';
import {
	type ValidatorPlugin,
	type ValidationIssue,
	type PluginContext,
	findMapKey,
	isAutoRenamed,
	formatNodeRef,
} from '../types';

/**
 * Validator for Set nodes.
 *
 * Checks for:
 * - Credential-like field names in assignments (password, api_key, secret, token, etc.)
 */
export const setNodeValidator: ValidatorPlugin = {
	id: 'core:set-node',
	name: 'Set Node Validator',
	nodeTypes: ['n8n-nodes-base.set'],
	priority: 40,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		graphNode: GraphNode,
		ctx: PluginContext,
	): ValidationIssue[] {
		const issues: ValidationIssue[] = [];
		const params = node.config?.parameters as Record<string, unknown> | undefined;

		if (!params) {
			return issues;
		}

		// Find the map key for this node (may be renamed from node.name)
		const mapKey = findMapKey(graphNode, ctx);
		const originalName = node.name;
		const renamed = isAutoRenamed(mapKey, originalName);
		const displayName = renamed ? mapKey : originalName;
		const origForWarning = renamed ? originalName : undefined;
		const nodeRef = formatNodeRef(displayName, origForWarning, node.type);

		const assignments = params.assignments as
			| { assignments?: Array<{ name?: string; value?: unknown; type?: string }> }
			| undefined;

		if (!assignments?.assignments) {
			return issues;
		}

		for (const assignment of assignments.assignments) {
			if (assignment.name && isCredentialFieldName(assignment.name)) {
				issues.push({
					code: 'SET_CREDENTIAL_FIELD',
					message: `${nodeRef} has a field named "${assignment.name}" which appears to be storing credentials. Use n8n's credential system instead.`,
					severity: 'warning',
					nodeName: displayName,
					originalName: origForWarning,
				});
			}
		}

		return issues;
	},
};
