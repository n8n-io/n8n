'use strict';
// A programmatic node: one GET request for each item, signed with the `acmeApi` credential.
class Acme {
	constructor() {
		this.description = {
			displayName: 'Acme',
			name: 'acme',
			group: ['transform'],
			version: 1,
			description: 'Reads a resource of the Acme API',
			defaults: { name: 'Acme' },
			inputs: ['main'],
			outputs: ['main'],
			credentials: [{ name: 'acmeApi', required: true }],
			properties: [{ displayName: 'Path', name: 'path', type: 'string', default: '/hello' }],
		};
	}

	async execute() {
		const items = this.getInputData();
		const credentials = await this.getCredentials('acmeApi');
		const out = [];
		for (let i = 0; i < items.length; i++) {
			const path = this.getNodeParameter('path', i);
			const response = await this.helpers.httpRequestWithAuthentication.call(this, 'acmeApi', {
				method: 'GET',
				url: `${credentials.url}${path}`,
				json: true,
			});
			out.push({ json: { ...response, item: i }, pairedItem: { item: i } });
		}
		return [out];
	}
}
exports.Acme = Acme;
