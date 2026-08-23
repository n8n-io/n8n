import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { getActiveCredentialType, getHost } from '../helpers';

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const credentialType = getActiveCredentialType(this, i);
	const host = await getHost(this, credentialType);
	const volumePath = this.getNodeParameter('volumePath', i) as string;
	const filePath = this.getNodeParameter('filePath', i);

	const parts = volumePath.split('.');
	if (parts.length !== 3) {
		throw new NodeOperationError(
			this.getNode(),
			'Volume path must be in format: catalog.schema.volume (e.g., main.default.my_volume)',
		);
	}
	const [catalog, schema, volume] = parts;

	const response = await this.helpers.httpRequestWithAuthentication.call(this, credentialType, {
		method: 'HEAD',
		url: `${host}/api/2.0/fs/files/Volumes/${catalog}/${schema}/${volume}/${filePath}`,
		returnFullResponse: true,
	});

	return [
		{
			json: {
				volumePath,
				filePath,
				headers: response.headers,
				contentLength: response.headers['content-length'],
				contentType: response.headers['content-type'],
				lastModified: response.headers['last-modified'],
			},
			pairedItem: { item: i },
		},
	];
}
