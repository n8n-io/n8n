/**
 * Tool Node Validator Plugin
 *
 * Validates Tool nodes for missing parameters.
 */

import type { GraphNode, NodeInstance } from '../../../types/base';
import { isToolNode, TOOLS_WITHOUT_PARAMETERS } from '../../validation-helpers';
import type { ValidatorPlugin, ValidationIssue, PluginContext } from '../types';

/**
 * Validator for Tool nodes.
 *
 * Checks for:
 * - Tool nodes with missing parameters (except tools that don't require them)
 */
export const toolNodeValidator: ValidatorPlugin = {
	id: 'core:tool-node',
	name: 'Tool Node Validator',
	// No nodeTypes - we check isToolNode internally
	priority: 50,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		ctx: PluginContext,
	): ValidationIssue[] {
		const issues: ValidationIssue[] = [];

		// Only validate tool nodes
		if (!isToolNode(node.type)) {
			return issues;
		}

		// Check via nodeTypesProvider first (dynamic detection)
		const provider = ctx.validationOptions?.nodeTypesProvider;
		if (provider) {
			const nodeType = provider.getByNameAndVersion(node.type, Number(node.version));
			const properties = nodeType?.description?.properties;
			// If provider returns info and properties is empty array, skip validation
			if (properties !== undefined && properties.length === 0) {
				return issues;
			}
		}

		// Fallback to static list when provider not available or doesn't have info
		if (TOOLS_WITHOUT_PARAMETERS.has(node.type)) {
			return issues;
		}

		const params = node.config?.parameters;
		if (!params || Object.keys(params).length === 0) {
			issues.push({
				code: 'TOOL_NO_PARAMETERS',
				message: `'${node.name}' has no parameters set.`,
				severity: 'warning',
				nodeName: node.name,
			});
		}

		return issues;
	},
};
