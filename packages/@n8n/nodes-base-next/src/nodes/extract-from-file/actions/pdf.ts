import { t } from '@n8n/node-sdk';

import { extractFromFile, file } from '../extract-from-file.node';

export const extractPdf = extractFromFile.action('pdf', {
	action: 'Extract from PDF',
	summary: 'Read the text and the document data of the PDF file of each item.',
	flow: { effect: 'transform', cardinality: 'per-item' },
	imports: ['parsers'],
	input: {
		file,
		password: t
			.str()
			.with({ title: 'Password', minLength: 1, writeOnly: true })
			.optional()
			.hint('The password of an encrypted file'),
		maxPages: t
			.int()
			.with({ title: 'Max Pages', minimum: 1 })
			.optional()
			.hint('Omit for every page'),
	},
	output: t.obj({
		text: t.str().hint('The text of the pages that were read, with an empty line between pages'),
		pageCount: t.int().hint('The number of pages of the file'),
		info: t.json().optional().hint('The document information, e.g. Title, Author, CreationDate'),
		metadata: t.json().optional().hint('The XMP metadata by name, e.g. dc:title'),
	}),
	async run({ input, parsers }) {
		const { file: pdf, ...options } = input;
		const { pages, pageCount, info, metadata } = await parsers.extract(pdf, 'pdf', options);
		return {
			text: pages.join('\n\n'),
			pageCount,
			...(info ? { info } : {}),
			...(metadata ? { metadata } : {}),
		};
	},
});
