import type { TestCaseExecutionRecord } from '@/api/evaluation.ee';

export function getTestCasesColumns(cases: TestCaseExecutionRecord[], key: 'inputs' | 'outputs') {
	const inputColumnNames = cases.reduce(
		(set, testCase) => {
			Object.keys(testCase[key] ?? {}).forEach((key) => set.add(key));
			return set;
		},
		new Set([] as string[]),
	);

	const allColumnNames = cases.reduce((set, testCase) => {
		Object.keys(testCase[key] ?? {}).forEach((key) => set.add(key));
		return set;
	}, inputColumnNames);

	return [...allColumnNames.keys()].map((column) => ({
		prop: `${key}.${column}`,
		label: column,
		sortable: true,
		filter: true,
		showHeaderTooltip: true,
	}));
}
