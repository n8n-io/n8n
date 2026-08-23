import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { getActiveCredentialType, getHost } from '../helpers';

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const credentialType = getActiveCredentialType(this, i);
	const host = await getHost(this, credentialType);
	const spaceId = this.getNodeParameter('spaceId', i) as string;
	const conversationId = this.getNodeParameter('conversationId', i) as string;
	const messageId = this.getNodeParameter('messageId', i) as string;
	const attachmentId = this.getNodeParameter('attachmentId', i) as string;

	const response = await this.helpers.httpRequestWithAuthentication.call(this, credentialType, {
		method: 'POST',
		url: `${host}/api/2.0/genie/spaces/${spaceId}/conversations/${conversationId}/messages/${messageId}/attachments/${attachmentId}/execute-query`,
		headers: { 'Content-Type': 'application/json' },
		json: true,
	});

	return [{ json: response, pairedItem: { item: i } }];
}
