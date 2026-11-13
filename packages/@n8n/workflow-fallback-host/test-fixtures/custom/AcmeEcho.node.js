'use strict';
// A node in a custom extension folder (type `CUSTOM.acmeEcho`): it marks each item.
class AcmeEcho {
	constructor() {
		this.description = {
			displayName: 'Acme Echo',
			name: 'acmeEcho',
			group: ['transform'],
			version: 1,
			description: 'Marks each item',
			defaults: { name: 'Acme Echo' },
			inputs: ['main'],
			outputs: ['main'],
			properties: [{ displayName: 'Mark', name: 'mark', type: 'string', default: 'echo' }],
		};
	}

	async execute() {
		const items = this.getInputData();
		return [
			items.map((item, i) => ({
				json: { ...item.json, mark: this.getNodeParameter('mark', i) },
				pairedItem: { item: i },
			})),
		];
	}
}
exports.AcmeEcho = AcmeEcho;
