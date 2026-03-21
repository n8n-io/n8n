import type { IncomingMessage } from 'http';
import https from 'https';
import type {
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
	IExecuteFunctions,
} from 'n8n-workflow';

export class Blocked implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Blocked Demo',
		name: 'blocked',
		group: ['transform'],
		version: 1,
		subtitle: 'Network request without permission',
		description: 'Attempts an HTTPS request without declaring network permissions — should fail in sandbox',
		defaults: { name: 'Blocked Demo' },
		inputs: ['main'] as INodeTypeDescription['inputs'],
		outputs: ['main'] as INodeTypeDescription['outputs'],

		thirdPartyDeps: true,
		// No permissions declared — network access will be denied

		properties: [
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: 'https://example.com',
				description: 'URL to attempt fetching (will be blocked)',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const url = this.getNodeParameter('url', 0) as string;

		return new Promise((resolve, reject) => {
			https.get(url, (res: IncomingMessage) => {
				let body = '';
				res.on('data', (chunk: string) => { body += chunk; });
				res.on('end', () => {
					resolve([[{ json: { status: res.statusCode ?? 0, body } }]]);
				});
			}).on('error', (err: Error) => {
				reject(err);
			});
		});
	}
}
