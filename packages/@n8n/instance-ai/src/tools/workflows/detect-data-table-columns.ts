import { isRecord } from '@n8n/utils/is-record';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { DATA_TABLE_SYSTEM_COLUMNS } from 'n8n-workflow';

import type { ValidationWarning } from './workflow-validation-warnings';
import type { InstanceAiContext } from '../../types';

const DATA_TABLE_NODE_TYPE = 'n8n-nodes-base.dataTable';

function isConcreteValue(value: string): boolean {
	return value.length > 0 && !value.includes('{{') && !value.includes('__PLACEHOLDER');
}

/** Table reference from the resource locator when it is a concrete id or name. */
function concreteTableReference(parameters: Record<string, unknown>): string | undefined {
	const locator = parameters.dataTableId;
	if (!isRecord(locator) || typeof locator.value !== 'string') return undefined;
	return isConcreteValue(locator.value) ? locator.value : undefined;
}

/** Column names the node statically references: filter keys + mapped columns + sort column. */
function referencedColumnNames(parameters: Record<string, unknown>): string[] {
	const names = new Set<string>();

	const filters = parameters.filters;
	if (isRecord(filters) && Array.isArray(filters.conditions)) {
		for (const condition of filters.conditions) {
			if (!isRecord(condition) || typeof condition.keyName !== 'string') continue;
			if (isConcreteValue(condition.keyName)) names.add(condition.keyName);
		}
	}

	const columns = parameters.columns;
	if (isRecord(columns) && columns.mappingMode === 'defineBelow' && isRecord(columns.value)) {
		for (const key of Object.keys(columns.value)) {
			if (isConcreteValue(key)) names.add(key);
		}
	}

	// The Get operation only reads `orderByColumn` when `orderBy` is enabled; a
	// typo'd column there fails at runtime with "Specified column does not exist".
	if (
		parameters.orderBy === true &&
		typeof parameters.orderByColumn === 'string' &&
		isConcreteValue(parameters.orderByColumn)
	) {
		names.add(parameters.orderByColumn);
	}

	return [...names];
}

function toSnakeCase(value: string): string {
	return value.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

/**
 * Build-time check that dataTable nodes reference columns the target table
 * actually has. n8n normalizes Data Table column names to snake_case, so
 * agent-invented camelCase names (`dayName` vs `day_name`) fail on the first
 * run; this surfaces them as informational warnings with the likely fix.
 */
export async function detectUnknownDataTableColumns(
	json: WorkflowJSON,
	ctx: InstanceAiContext,
): Promise<ValidationWarning[]> {
	const warnings: ValidationWarning[] = [];
	const schemaCache = new Map<string, Set<string> | undefined>();

	const columnsForTable = async (tableRef: string): Promise<Set<string> | undefined> => {
		if (schemaCache.has(tableRef)) return schemaCache.get(tableRef);
		let columns: Set<string> | undefined;
		try {
			const schema = await ctx.dataTableService.getSchema(tableRef, {});
			columns = new Set([...DATA_TABLE_SYSTEM_COLUMNS, ...schema.map((column) => column.name)]);
		} catch {
			// Table not found / ambiguous name / lookup failure — nothing to check.
			columns = undefined;
		}
		schemaCache.set(tableRef, columns);
		return columns;
	};

	for (const node of json.nodes ?? []) {
		if (node.type !== DATA_TABLE_NODE_TYPE || !node.name || !isRecord(node.parameters)) continue;

		const tableRef = concreteTableReference(node.parameters);
		if (!tableRef) continue;

		const referenced = referencedColumnNames(node.parameters);
		if (referenced.length === 0) continue;

		const known = await columnsForTable(tableRef);
		if (!known) continue;

		const unknown = referenced.filter((name) => !known.has(name));
		if (unknown.length === 0) continue;

		const suggestions = unknown
			.map((name) =>
				known.has(toSnakeCase(name)) ? `"${name}" -> "${toSnakeCase(name)}"` : undefined,
			)
			.filter((suggestion): suggestion is string => suggestion !== undefined);

		warnings.push({
			code: 'DATA_TABLE_UNKNOWN_COLUMN',
			message:
				`references column(s) ${unknown.map((name) => `"${name}"`).join(', ')} that do not exist on the selected Data Table. ` +
				`Existing columns: ${[...known].join(', ')}.` +
				(suggestions.length > 0
					? ` Data Table column names are snake_case — likely fix: ${suggestions.join('; ')}.`
					: ''),
			nodeName: node.name,
			severity: 'informational',
		});
	}

	return warnings;
}
