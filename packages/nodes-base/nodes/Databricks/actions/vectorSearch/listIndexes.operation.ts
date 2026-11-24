import { requestUrl } from 'n8n-workflow';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { databricksApiRequest, getActiveCredentialType, getHost } from '../helpers';

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const credentialType = getActiveCredentialType(this, i);
	const host = await getHost(this, credentialType);
	const endpointName = this.getNodeParameter('endpointName', i) as string;

	const response = await databricksApiRequest(
		this,
		credentialType,
		requestUrl`${host}/api/2.0/vector-search/indexes`,
		{
			method: 'GET',
			qs: { endpoint_name: endpointName },
			json: true,
		},
	);

	return [{ json: response, pairedItem: { item: i } }];
}
