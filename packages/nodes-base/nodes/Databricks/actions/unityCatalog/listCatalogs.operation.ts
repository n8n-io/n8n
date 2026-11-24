import { requestUrl } from 'n8n-workflow';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { databricksApiRequest, getActiveCredentialType, getHost } from '../helpers';

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const credentialType = getActiveCredentialType(this, i);
	const host = await getHost(this, credentialType);

	const response = await databricksApiRequest(
		this,
		credentialType,
		requestUrl`${host}/api/2.1/unity-catalog/catalogs`,
		{
			method: 'GET',
			json: true,
		},
	);

	return [{ json: response, pairedItem: { item: i } }];
}
