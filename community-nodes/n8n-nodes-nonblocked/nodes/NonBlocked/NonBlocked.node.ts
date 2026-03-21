import type { IncomingMessage } from 'http';
import https from 'https';
import type {
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
	IExecuteFunctions,
} from 'n8n-workflow';

export class NonBlocked implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Non-Blocked Demo',
		name: 'nonBlocked',
		group: ['transform'],
		version: 1,
		subtitle: 'Network request with permission',
		description: 'Makes an HTTPS request with declared network permissions — should succeed in sandbox',
		defaults: { name: 'Non-Blocked Demo' },
		inputs: ['main'] as INodeTypeDescription['inputs'],
		outputs: ['main'] as INodeTypeDescription['outputs'],

		thirdPartyDeps: true,

		permissions: {
			network: { allowedHosts: ['jsonplaceholder.typicode.com'] },
		},

		properties: [
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: 'https://jsonplaceholder.typicode.com/posts/1',
				description: 'URL to fetch (allowed by sandbox permissions)',
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
					try {
						resolve([[{ json: JSON.parse(body) as INodeExecutionData['json'] }]]);
					} catch {
						resolve([[{ json: { status: res.statusCode ?? 0, body } }]]);
					}
				});
			}).on('error', (err: Error) => {
				reject(err);
			});
		});
	}
}
