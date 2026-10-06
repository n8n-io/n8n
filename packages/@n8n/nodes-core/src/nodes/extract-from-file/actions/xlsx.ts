import { t } from '@n8n/node-sdk';

import {
	extractFromFile,
	file,
	header,
	includeEmptyCells,
	itemOfRow,
	tableRow,
} from '../extract-from-file.node';

export const extractXlsx = extractFromFile.action('xlsx', {
	action: 'Extract from XLSX',
	summary: 'Read one sheet of an Excel file of each item. One output item per row.',
	flow: { effect: 'transform', cardinality: '1:N' },
	imports: ['parsers'],
	input: {
		file,
		sheet: t
			.str()
			.with({ title: 'Sheet Name', minLength: 1 })
			.optional()
			.hint('Omit for the first sheet'),
		range: t
			.str()
			.with({ title: 'Range', minLength: 1 })
			.optional()
			.hint('An A1 range, e.g. A2:D20, or the row to start at, from 0, e.g. 2'),
		header,
		includeEmptyCells,
	},
	output: tableRow,
	async *run({ input, parsers }) {
		const { file: workbook, ...options } = input;
		const rows = await parsers.extract(workbook, 'xlsx', options);
		yield* rows.map(itemOfRow);
	},
});
