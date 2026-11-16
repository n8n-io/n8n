import { NodeOperationError, requestUrl } from 'n8n-workflow';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { databricksApiRequest, getActiveCredentialType, getHost, toRequestPath } from '../helpers';

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const credentialType = getActiveCredentialType(this, i);
	const host = await getHost(this, credentialType);
	const volumePath = this.getNodeParameter('volumePath', i) as string;
	const filePath = String(this.getNodeParameter('filePath', i));

	const parts = volumePath.split('.');
	if (parts.length !== 3) {
		throw new NodeOperationError(
			this.getNode(),
			'Volume path must be in format: catalog.schema.volume (e.g., main.default.my_volume)',
		);
	}
	const [catalog, schema, volume] = parts;

	await databricksApiRequest(
		this,
		credentialType,
		requestUrl`${host}/api/2.0/fs/files/Volumes/${catalog}/${schema}/${volume}${toRequestPath(filePath, this.getNode().typeVersion)}`,
		{
			method: 'DELETE',
			json: true,
		},
	);

	return [
		{
			json: {
				success: true,
				message: `File deleted successfully: ${filePath}`,
				volumePath,
				filePath,
			},
			pairedItem: { item: i },
		},
	];
}
