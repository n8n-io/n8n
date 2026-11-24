/**
 * Date Method Validator Plugin
 *
 * Validates that Luxon DateTime methods are used correctly.
 */

import type { GraphNode, NodeInstance } from '../../../types/base';
import { findInvalidDateMethods } from '../../validation-helpers';
import type { ValidatorPlugin, ValidationIssue, PluginContext } from '../types';

/**
 * Validator for date methods.
 *
 * Checks for:
 * - .toISOString() usage which should be .toISO() for Luxon DateTime ($now, $today)
 */
export const dateMethodValidator: ValidatorPlugin = {
	id: 'core:date-method',
	name: 'Date Method Validator',
	priority: 30,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		_ctx: PluginContext,
	): ValidationIssue[] {
		const issues: ValidationIssue[] = [];

		const params = node.config?.parameters;
		if (!params) {
			return issues;
		}

		const dateIssues = findInvalidDateMethods(params);

		for (const { path } of dateIssues) {
			issues.push({
				code: 'INVALID_DATE_METHOD',
				message: `'${node.name}' parameter "${path}" uses .toISOString() which is a JS Date method. Use .toISO() for Luxon DateTime ($now, $today).`,
				severity: 'warning',
				nodeName: node.name,
				parameterPath: path,
			});
		}

		return issues;
	},
};
