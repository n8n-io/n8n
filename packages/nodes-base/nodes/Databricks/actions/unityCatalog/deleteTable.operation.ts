import { requestUrl } from 'n8n-workflow';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import {
	databricksApiRequest,
	extractResourceLocatorValue,
	getActiveCredentialType,
	getHost,
} from '../helpers';

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const credentialType = getActiveCredentialType(this, i);
	const host = await getHost(this, credentialType);
	const fullName = extractResourceLocatorValue(this.getNodeParameter('fullName', i));

	const response = await databricksApiRequest(
		this,
		credentialType,
		requestUrl`${host}/api/2.1/unity-catalog/tables/${fullName}`,
		{
			method: 'DELETE',
			json: true,
		},
	);

	return [{ json: response || {}, pairedItem: { item: i } }];
}
