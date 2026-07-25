/**
 * Google Sheets Match Column Validator
 *
 * For update / appendOrUpdate, the match column must appear in
 * `columns.schema` (v4+) or be set via `columnToMatchOn` (v3).
 *
 * Also checks the resource mapper itself: n8n emits `id === displayName === the
 * sheet's header cell`, and the node matches `schema[].id` against the live
 * header row, so an invented id namespace fails every row at runtime with
 * "Column names were updated after the node's setup".
 */

import { isRecord } from '@n8n/utils/is-record';

import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

const SHEETS_TYPES = new Set(['n8n-nodes-base.googleSheets', 'n8n-nodes-base.googleSheetsTool']);

const MATCH_OPERATIONS = new Set(['update', 'appendOrUpdate']);

/** Operations that carry a `columns` resource mapper. */
const COLUMN_OPERATIONS = new Set(['append', 'appendOrUpdate', 'update']);

/** Cap examples in aggregated messages so a 20-column sheet stays readable. */
const MAX_EXAMPLES = 3;

function parseVersion(version: string | number | undefined): number {
	if (typeof version === 'number') return version;
	if (typeof version === 'string') {
		const parsed = Number.parseFloat(version);
		return Number.isFinite(parsed) ? parsed : 0;
	}
	return 0;
}

/** Column ids from `columns.schema` — the strings the node matches against the
 *  sheet's header row. `displayName` is deliberately not accepted as an alias,
 *  since the runtime only ever looks at `id`. */
function schemaIds(schema: unknown): Set<string> {
	const ids = new Set<string>();
	if (!Array.isArray(schema)) return ids;
	for (const entry of schema) {
		if (!isRecord(entry)) continue;
		if (typeof entry.id === 'string' && entry.id.length > 0) ids.add(entry.id);
	}
	return ids;
}

function formatExamples(items: string[]): string {
	const shown = items.slice(0, MAX_EXAMPLES).join(', ');
	return items.length > MAX_EXAMPLES ? `${shown}, +${items.length - MAX_EXAMPLES} more` : shown;
}

/** Check the schema / value pair against the "id is the header cell" contract. */
function validateColumnSchema(
	node: NodeInstance<string, string, unknown>,
	columns: Record<string, unknown>,
): ValidationIssue[] {
	const schema = columns.schema;
	if (!Array.isArray(schema) || schema.length === 0) return [];

	const issues: ValidationIssue[] = [];
	const diverged: string[] = [];

	for (const entry of schema) {
		if (!isRecord(entry)) continue;
		const { id, displayName } = entry;
		if (
			typeof id === 'string' &&
			typeof displayName === 'string' &&
			id.length > 0 &&
			displayName.length > 0 &&
			id !== displayName
		) {
			diverged.push(`${id} != ${displayName}`);
		}
	}

	if (diverged.length > 0) {
		issues.push({
			code: 'SHEETS_SCHEMA_ID_NOT_HEADER',
			message:
				`'${node.name}' columns.schema has ids that differ from their displayName ` +
				`(${formatExamples(diverged)}). For Sheets the id IS the header cell — it is matched ` +
				'against the live header row, so invented ids fail at runtime with "Column names were ' +
				'updated after the node\'s setup". Set id to the exact header text (id === displayName), ' +
				"or use mappingMode: 'autoMapInputData' when the real headers are unknown.",
			severity: 'warning',
			violationLevel: 'major',
			nodeName: node.name,
			parameterPath: 'columns.schema',
		});
	}

	const ids = schemaIds(schema);
	const value = columns.value;
	if (ids.size > 0 && isRecord(value)) {
		const unknown = Object.keys(value).filter((key) => !ids.has(key));
		if (unknown.length > 0) {
			issues.push({
				code: 'SHEETS_VALUE_KEY_NOT_IN_SCHEMA',
				message:
					`'${node.name}' columns.value has key(s) absent from columns.schema ` +
					`(${formatExamples(unknown)}). The node writes only the columns it finds in the ` +
					'header row, so a key that is not a schema column id is silently dropped and never ' +
					'reaches the sheet.',
				severity: 'warning',
				violationLevel: 'major',
				nodeName: node.name,
				parameterPath: 'columns.value',
			});
		}
	}

	return issues;
}

/**
 * Validator for Sheets match-column / schema consistency.
 */
export const sheetsMatchColumnValidator: ValidatorPlugin = {
	id: 'core:sheets-match-column',
	name: 'Sheets Match Column Validator',
	nodeTypes: [...SHEETS_TYPES],
	priority: 44,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		_ctx: PluginContext,
	): ValidationIssue[] {
		if (!SHEETS_TYPES.has(node.type)) return [];

		const parameters = node.config?.parameters;
		if (!isRecord(parameters)) return [];

		const operation = parameters.operation;
		if (typeof operation !== 'string' || !COLUMN_OPERATIONS.has(operation)) {
			return [];
		}

		const version = parseVersion(node.version);
		const issues: ValidationIssue[] = [];

		if (version >= 4 && isRecord(parameters.columns)) {
			issues.push(...validateColumnSchema(node, parameters.columns));
		}

		// The remaining rules are about the row to match on — append has none.
		if (!MATCH_OPERATIONS.has(operation)) return issues;

		if (version >= 4) {
			const columns = parameters.columns;
			if (!isRecord(columns)) {
				issues.push({
					code: 'SHEETS_MATCH_COLUMN_NOT_IN_SCHEMA',
					message:
						`'${node.name}' ${operation} requires a \`columns\` resource-mapper object with ` +
						"`matchingColumns` and `schema`. Bare strings like columns: 'autoMapInputData' are invalid.",
					severity: 'warning',
					violationLevel: 'major',
					nodeName: node.name,
					parameterPath: 'columns',
				});
				return issues;
			}

			const matchingColumns = columns.matchingColumns;
			if (!Array.isArray(matchingColumns) || matchingColumns.length === 0) {
				issues.push({
					code: 'SHEETS_MATCH_COLUMN_NOT_IN_SCHEMA',
					message:
						`'${node.name}' ${operation} is missing columns.matchingColumns. ` +
						'Set the column(s) to match on and include them in columns.schema.',
					severity: 'warning',
					violationLevel: 'major',
					nodeName: node.name,
					parameterPath: 'columns.matchingColumns',
				});
				return issues;
			}

			const ids = schemaIds(columns.schema);
			if (ids.size === 0) {
				issues.push({
					code: 'SHEETS_MATCH_COLUMN_NOT_IN_SCHEMA',
					message:
						`'${node.name}' ${operation} has matchingColumns but empty/missing columns.schema. ` +
						'Include every match column in columns.schema as an `id`.',
					severity: 'warning',
					violationLevel: 'major',
					nodeName: node.name,
					parameterPath: 'columns.schema',
				});
				return issues;
			}

			const missing = matchingColumns.filter(
				(col): col is string => typeof col === 'string' && col.length > 0 && !ids.has(col),
			);
			if (missing.length > 0) {
				issues.push({
					code: 'SHEETS_MATCH_COLUMN_NOT_IN_SCHEMA',
					message:
						`'${node.name}' matchingColumns [${missing.join(', ')}] are not present in columns.schema. ` +
						'Include the match column(s) in columns.schema when setting Column to Match On.',
					severity: 'warning',
					violationLevel: 'major',
					nodeName: node.name,
					parameterPath: 'columns.matchingColumns',
				});
			}
			return issues;
		}

		// v3: top-level columnToMatchOn
		const columnToMatchOn = parameters.columnToMatchOn;
		if (typeof columnToMatchOn !== 'string' || columnToMatchOn.trim() === '') {
			issues.push({
				code: 'SHEETS_MATCH_COLUMN_NOT_IN_SCHEMA',
				message:
					`'${node.name}' ${operation} (typeVersion < 4) requires columnToMatchOn. ` +
					'Set the column used to match rows before updating.',
				severity: 'warning',
				violationLevel: 'major',
				nodeName: node.name,
				parameterPath: 'columnToMatchOn',
			});
		}

		return issues;
	},
};
