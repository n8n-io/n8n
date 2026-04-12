import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

import type { SQLExecuteInfo } from './interfaces';

export function transformResults(
	executeInfo: SQLExecuteInfo,
	options: { replaceEmptyStrings?: boolean } = {},
): INodeExecutionData[] {
	const { replaceEmptyStrings = false } = options;
	const items: INodeExecutionData[] = [];

	for (const queryResult of executeInfo.results ?? []) {
		const resultSet = queryResult.resultSet;
		if (!resultSet) continue;

		const columns = resultSet.columns ?? [];
		const rows = resultSet.rowsWithMetaData ?? [];

		for (const row of rows) {
			const json: IDataObject = {};
			columns.forEach((col, i) => {
				const name = col.name ?? `col${i}`;
				const value = row.data[i] ?? null;
				json[name] = replaceEmptyStrings && value === '' ? null : value;
			});
			items.push({ json });
		}
	}

	return items;
}
