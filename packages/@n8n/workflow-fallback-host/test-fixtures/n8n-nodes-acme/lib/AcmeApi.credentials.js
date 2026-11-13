'use strict';
// A custom credential type: the key goes in the `x-acme-key` header (generic authenticate).
class AcmeApi {
	constructor() {
		this.name = 'acmeApi';
		this.displayName = 'Acme API';
		this.properties = [
			{ displayName: 'URL', name: 'url', type: 'string', default: '' },
			{
				displayName: 'API Key',
				name: 'apiKey',
				type: 'string',
				typeOptions: { password: true },
				default: '',
			},
		];
		this.authenticate = {
			type: 'generic',
			properties: { headers: { 'x-acme-key': '={{$credentials.apiKey}}' } },
		};
	}
}
exports.AcmeApi = AcmeApi;
