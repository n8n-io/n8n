import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { extractResourceLocatorValue, getActiveCredentialType, getHost } from '../helpers';

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const credentialType = getActiveCredentialType(this, i);
	const host = await getHost(this, credentialType);
	const catalogName = extractResourceLocatorValue(this.getNodeParameter('catalogName', i));
	const comment = this.getNodeParameter('comment', i, '') as string;

	const response = await this.helpers.httpRequestWithAuthentication.call(this, credentialType, {
		method: 'PATCH',
		url: `${host}/api/2.1/unity-catalog/catalogs/${catalogName}`,
		body: { comment },
		headers: { 'Content-Type': 'application/json' },
		json: true,
	});

	return [{ json: response, pairedItem: { item: i } }];
}
