import { t } from '@n8n/node-sdk';

import { encoding, extractFromFile, file, stripBom } from '../extract-from-file.node';

export const extractJson = extractFromFile.action('json', {
	action: 'Extract from JSON',
	summary: 'Parse the JSON file of each item into the data field. An empty file gives {}.',
	flow: { effect: 'transform', cardinality: 'per-item' },
	imports: ['parsers'],
	input: { file, encoding, stripBom },
	output: t.obj({ data: t.jsonValue().hint('The value of the file') }),
	async run({ input, parsers }) {
		const { file: json, ...options } = input;
		return { data: await parsers.extract(json, 'json', options) };
	},
});
