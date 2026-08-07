import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { extractResourceLocatorValue, getActiveCredentialType, getHost } from '../helpers';

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const credentialType = getActiveCredentialType(this, i);
	const host = await getHost(this, credentialType);
	const fullName = extractResourceLocatorValue(this.getNodeParameter('fullName', i));

	await this.helpers.httpRequestWithAuthentication.call(this, credentialType, {
		method: 'DELETE',
		url: `${host}/api/2.1/unity-catalog/functions/${fullName}`,
		json: true,
	});

	return [
		{
			json: { success: true, message: 'Function deleted successfully', functionName: fullName },
			pairedItem: { item: i },
		},
	];
}
