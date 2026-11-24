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
	const catalogName = extractResourceLocatorValue(this.getNodeParameter('catalogName', i));
	const schemaName = extractResourceLocatorValue(this.getNodeParameter('schemaName', i));
	const volumeName = this.getNodeParameter('volumeName', i) as string;
	const fullName = `${catalogName}.${schemaName}.${volumeName}`;

	const response = await databricksApiRequest(
		this,
		credentialType,
		requestUrl`${host}/api/2.1/unity-catalog/volumes/${fullName}`,
		{
			method: 'GET',
			json: true,
		},
	);

	return [{ json: response, pairedItem: { item: i } }];
}
