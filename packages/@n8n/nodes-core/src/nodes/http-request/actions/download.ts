import { t } from '@n8n/node-sdk';

import { httpRequest } from '../http-request.node';
import { common, commonUi } from '../request';

// An own action, not a `get` option: `get` gives JSON items, this gives one file per item.
export const downloadFile = httpRequest.action('download', {
	// Major 2: the action declares that it reaches the host of `url`.
	version: '2.0.0',
	action: 'Download a file',
	summary: 'GET a URL and keep the response body as a file. The bytes go to n8n binary storage.',
	flow: { effect: 'read', cardinality: 'per-item', idempotent: true },
	egress: { fromInput: 'url' },
	input: common,
	ui: commonUi,
	output: t.obj({
		data: t.binary().hint('The response body; file name and MIME type come from the response'),
	}),
	async run({ input, http }) {
		const data = await http.request({
			method: 'GET',
			url: input.url,
			query: input.query,
			headers: input.headers,
			response: 'binary',
		});
		return { data };
	},
});
