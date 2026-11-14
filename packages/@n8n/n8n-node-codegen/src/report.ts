import type { OperationRow } from './resolve-operations';

const resourceTitle = ({ operation, resource }: OperationRow) =>
	`${operation.tag.group.displayName} / ${resource.displayName} (resource: ${resource.id})`;

function notes({ operation, excludeReason }: OperationRow): string {
	return [operation.deprecated ? 'deprecated' : undefined, excludeReason]
		.filter((note) => note !== undefined)
		.join('; ');
}

function formatTable(rows: OperationRow[]): string[] {
	const cells = rows.map((row) => [
		row.excludeReason === undefined ? 'in node' : 'excluded',
		row.operation.operationId,
		row.operation.summary,
		row.operation.method,
		row.operation.apiPath,
		notes(row),
	]);
	const widths = cells[0].map((_, column) => Math.max(...cells.map((row) => row[column].length)));
	return cells.map((row) =>
		`  ${row.map((cell, column) => cell.padEnd(widths[column])).join('  ')}`.trimEnd(),
	);
}

export function formatReport(rows: OperationRow[]): string {
	const rowsByTitle = new Map<string, OperationRow[]>();
	for (const row of rows) {
		rowsByTitle.set(resourceTitle(row), [...(rowsByTitle.get(resourceTitle(row)) ?? []), row]);
	}

	const lines: string[] = [];
	for (const [title, resourceRows] of [...rowsByTitle].sort(([a], [b]) => a.localeCompare(b))) {
		lines.push(`${title}: ${resourceRows.length}`, ...formatTable(resourceRows), '');
	}

	const groups = new Set(rows.map((row) => row.operation.tag.group.name));
	const excluded = rows.filter((row) => row.excludeReason !== undefined).length;
	lines.push(
		`Operations: ${rows.length}. Resources: ${rowsByTitle.size}. Groups: ${groups.size}. In the node: ${rows.length - excluded}. Excluded: ${excluded}.`,
	);
	return lines.join('\n');
}
