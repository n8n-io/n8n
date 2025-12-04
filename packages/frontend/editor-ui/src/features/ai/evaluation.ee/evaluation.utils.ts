import type { JsonValue } from 'n8n-workflow';
import type { TestCaseExecutionRecord, TestRunRecord } from './evaluation.api';
import type { Column, Header } from './views/TestRunDetailView.vue';

export const SHORT_TABLE_CELL_MIN_WIDTH = 125;
const LONG_TABLE_CELL_MIN_WIDTH = 250;
const specialKeys = ['promptTokens', 'completionTokens', 'totalTokens', 'executionTime'];

export function getDefaultOrderedColumns(
	run?: TestRunRecord,
	filteredTestCases?: TestCaseExecutionRecord[],
) {
	// Default sort order
	// -> inputs, outputs, metrics, tokens, executionTime
	const metricColumns = Object.keys(run?.metrics ?? {}).filter((key) => !specialKeys.includes(key));
	const specialColumns = specialKeys.filter((key) => (run?.metrics ? key in run.metrics : false));
	const inputColumns = getTestCasesColumns(filteredTestCases ?? [], 'inputs');
	const outputColumns = getTestCasesColumns(filteredTestCases ?? [], 'outputs');

	const defaultOrder: Column[] = [
		...mapToColumns(inputColumns, 'inputs'),
		...mapToColumns(outputColumns, 'outputs'),
		...mapToColumns(metricColumns, 'metrics', true),
		...mapToColumns(specialColumns, 'metrics', true),
	];

	return defaultOrder;
}

export function applyCachedVisibility(
	columns: Column[],
	visibility?: Record<string, boolean>,
): Column[] {
	if (!visibility) {
		return columns;
	}

	return columns.map((column) =>
		column.disabled
			? column
			: {
					...column,
					visible: visibility.hasOwnProperty(column.key) ? visibility[column.key] : column.visible,
				},
	);
}

export function applyCachedSortOrder(defaultOrder: Column[], cachedOrder?: string[]): Column[] {
	if (!cachedOrder?.length) {
		return defaultOrder;
	}

	const result = cachedOrder.map((columnKey): Column => {
		const matchingColumn = defaultOrder.find((col) => columnKey === col.key);
		if (!matchingColumn) {
			return {
				key: columnKey,
				disabled: true,
			};
		}
		return matchingColumn;
	});

	// Add any missing columns from defaultOrder that aren't in the cached order
	const missingColumns = defaultOrder.filter((defaultCol) => !cachedOrder.includes(defaultCol.key));
	result.push(...missingColumns);

	return result;
}

export function getTestCasesColumns(
	cases: TestCaseExecutionRecord[],
	columnType: 'inputs' | 'outputs',
): string[] {
	const inputColumnNames = cases.reduce(
		(set, testCase) => {
			Object.keys(testCase[columnType] ?? {}).forEach((key) => set.add(key));
			return set;
		},
		new Set([] as string[]),
	);

	return Array.from(inputColumnNames.keys());
}

function mapToColumns(
	columnNames: string[],
	columnType: 'inputs' | 'outputs' | 'metrics',
	numeric?: boolean,
): Column[] {
	return columnNames.map((column) => ({
		key: `${columnType}.${column}`,
		label: column,
		visible: true,
		disabled: false,
		columnType,
		numeric,
	}));
}

function formatValue(
	key: string,
	value?: JsonValue,
	{ numeric }: { numeric?: boolean } = { numeric: false },
) {
	let stringValue: string;

	if (numeric && typeof value === 'number' && !specialKeys.includes(key)) {
		stringValue = value.toFixed(2) ?? '-';
	} else if (typeof value === 'object' && value !== null) {
		stringValue = JSON.stringify(value, null, 2);
	} else {
		stringValue = `${value}`;
	}

	return stringValue;
}

export function getTestTableHeaders(
	columnNames: Column[],
	testCases: TestCaseExecutionRecord[],
): Header[] {
	return columnNames
		.filter((column): column is Column & { disabled: false } => !column.disabled && column.visible)
		.map((column) => {
			// Check if any content exceeds 10 characters
			const hasLongContent = Boolean(
				testCases.find((row) => {
					const value = row[column.columnType]?.[column.label];
					const formattedValue = formatValue(column.label, value, { numeric: column.numeric });

					return formattedValue?.length > 10;
				}),
			);

			return {
				prop: column.key,
				label: column.disabled ? column.key : column.label,
				sortable: true,
				filter: true,
				showHeaderTooltip: true,
				minWidth: hasLongContent ? LONG_TABLE_CELL_MIN_WIDTH : SHORT_TABLE_CELL_MIN_WIDTH,
				formatter: (row: TestCaseExecutionRecord) => {
					const value = row[column.columnType]?.[column.label];
					const formattedValue = formatValue(column.label, value, { numeric: column.numeric });

					return formattedValue;
				},
			};
		});
}
