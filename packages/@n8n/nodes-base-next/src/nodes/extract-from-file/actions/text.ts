import { t } from '@n8n/node-sdk';

import { encoding, extractFromFile, file, stripBom } from '../extract-from-file.node';

export const extractText = extractFromFile.action('text', {
	action: 'Extract from text file',
	summary: 'Read the text file of each item into the data field.',
	flow: { effect: 'transform', cardinality: 'per-item' },
	imports: ['parsers'],
	input: { file, encoding, stripBom },
	output: t.obj({ data: t.str().hint('The text of the file') }),
	async run({ input, parsers }) {
		const { file: text, ...options } = input;
		return { data: await parsers.extract(text, 'text', options) };
	},
});
