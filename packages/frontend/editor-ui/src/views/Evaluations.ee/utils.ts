import type { TestTableColumn } from '@/components/Evaluations.ee/shared/TestTableBase.vue';
import type { TestCaseExecutionRecord } from '../../api/evaluation.ee';

export function getTestCasesColumns(
	cases: TestCaseExecutionRecord[],
	columnType: 'inputs' | 'outputs',
): Array<TestTableColumn<TestCaseExecutionRecord & { index: number }>> {
	const inputColumnNames = cases.reduce(
		(set, testCase) => {
			Object.keys(testCase[columnType] ?? {}).forEach((key) => set.add(key));
			return set;
		},
		new Set([] as string[]),
	);

	return Array.from(inputColumnNames.keys()).map((column) => ({
		prop: `${columnType}.${column}`,
		label: column,
		sortable: true,
		filter: true,
		showHeaderTooltip: true,
		formatter: (row: TestCaseExecutionRecord) => {
			const value = row[columnType]?.[column];
			if (typeof value === 'object' && value !== null) {
				return JSON.stringify(value, null, 2);
			}

			return `${value}`;
		},
	}));
}

export function mapToNumericColumns(columnNames: string[]) {
	return columnNames.map((metric) => ({
		prop: `metrics.${metric}`,
		label: metric,
		sortable: true,
		filter: true,
		showHeaderTooltip: true,
		formatter: (row: TestCaseExecutionRecord) => row.metrics?.[metric]?.toFixed(2) ?? '-',
	}));
}
