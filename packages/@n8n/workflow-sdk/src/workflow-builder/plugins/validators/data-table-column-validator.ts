/**
 * Data Table Column Validator
 *
 * n8n normalizes Data Table column names to snake_case. Flag camelCase keys
 * in columns.value / matchingColumns so agents call data-tables schema first.
 */

import { isRecord } from '@n8n/utils/is-record';

import { NODE_TYPES } from '../../../constants/node-types';
import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

const CAMEL_CASE = /^[a-z]+[A-Z][A-Za-z0-9]*$/;

function collectCamelCaseKeys(value: unknown, path: string, found: string[]): void {
	if (Array.isArray(value)) {
		value.forEach((entry, index) => {
			if (typeof entry === 'string' && CAMEL_CASE.test(entry)) {
				found.push(`${path}[${index}]=${entry}`);
			} else {
				collectCamelCaseKeys(entry, `${path}[${index}]`, found);
			}
		});
		return;
	}
	if (!isRecord(value)) return;
	for (const [key, nested] of Object.entries(value)) {
		if (CAMEL_CASE.test(key)) {
			found.push(path ? `${path}.${key}` : key);
		}
		collectCamelCaseKeys(nested, path ? `${path}.${key}` : key, found);
	}
}

/**
 * Validator for Data Table camelCase column names.
 */
export const dataTableColumnValidator: ValidatorPlugin = {
	id: 'core:data-table-column',
	name: 'Data Table Column Validator',
	nodeTypes: [NODE_TYPES.DATA_TABLE],
	priority: 44,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		_ctx: PluginContext,
	): ValidationIssue[] {
		const parameters = node.config?.parameters;
		if (!isRecord(parameters)) return [];

		const found: string[] = [];
		if (parameters.columns !== undefined) {
			collectCamelCaseKeys(parameters.columns, 'columns', found);
		}
		if (Array.isArray(parameters.matchingColumns)) {
			parameters.matchingColumns.forEach((col, index) => {
				if (typeof col === 'string' && CAMEL_CASE.test(col)) {
					found.push(`matchingColumns[${index}]=${col}`);
				}
			});
		}

		if (found.length === 0) return [];

		return [
			{
				code: 'DATA_TABLE_CAMELCASE_COLUMN',
				message:
					`'${node.name}' uses camelCase Data Table column name(s): ${found.slice(0, 5).join(', ')}` +
					`${found.length > 5 ? ', …' : ''}. n8n normalizes columns to snake_case ` +
					'(e.g. dayName → day_name). Call data-tables(action="schema") and use the real names.',
				severity: 'warning',
				violationLevel: 'major',
				nodeName: node.name,
				parameterPath: 'columns',
			},
		];
	},
};
