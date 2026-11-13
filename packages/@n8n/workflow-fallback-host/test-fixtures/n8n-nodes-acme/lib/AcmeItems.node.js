'use strict';
// A declarative node: n8n's routing sends GET <url>/items with the credential.
class AcmeItems {
	constructor() {
		this.description = {
			displayName: 'Acme Items',
			name: 'acmeItems',
			group: ['transform'],
			version: 1,
			description: 'Lists the items of the Acme API',
			defaults: { name: 'Acme Items' },
			inputs: ['main'],
			outputs: ['main'],
			credentials: [{ name: 'acmeApi', required: true }],
			requestDefaults: {
				baseURL: '={{$credentials.url}}',
				headers: { accept: 'application/json' },
			},
			properties: [
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					noDataExpression: true,
					options: [
						{ name: 'List', value: 'list', routing: { request: { method: 'GET', url: '/items' } } },
					],
					default: 'list',
				},
			],
		};
	}
}
exports.AcmeItems = AcmeItems;
