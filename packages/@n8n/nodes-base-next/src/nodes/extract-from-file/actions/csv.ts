import { t } from '@n8n/node-sdk';

import {
	extractFromFile,
	file,
	header,
	includeEmptyCells,
	itemOfRow,
	tableRow,
} from '../extract-from-file.node';

export const extractCsv = extractFromFile.action('csv', {
	action: 'Extract from CSV',
	summary: 'Read a CSV file of each item. One output item per row.',
	flow: { effect: 'transform', cardinality: '1:N' },
	imports: ['parsers'],
	input: {
		file,
		delimiter: t.str().with({ title: 'Delimiter', minLength: 1 }).default(','),
		header,
		includeEmptyCells,
		fromLine: t
			.int()
			.with({ title: 'Start Line', minimum: 1 })
			.optional()
			.hint('The first line to read, from 1'),
		maxRows: t.int().with({ title: 'Max Rows', minimum: 1 }).optional().hint('Omit for every row'),
		relaxQuotes: t
			.bool()
			.with({ title: 'Relax Quotes' })
			.default(false)
			.hint('Accept a quote in a cell that does not start with a quote'),
		encoding: t
			.oneOf('utf8', 'utf16le', 'latin1', 'ascii', 'ucs2')
			.with({ title: 'Encoding' })
			.default('utf8'),
		bom: t
			.bool()
			.with({ title: 'Strip BOM' })
			.default(false)
			.hint('Remove a byte order mark at the start of the file'),
	},
	output: tableRow,
	async *run({ input, parsers }) {
		const { file: csv, ...options } = input;
		const rows = await parsers.extract(csv, 'csv', options);
		yield* rows.map(itemOfRow);
	},
});
