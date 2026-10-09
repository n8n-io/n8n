import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import type { GenieApiResponse } from '../helpers';
import {
	databricksApiRequest,
	getActiveCredentialType,
	getHost,
	withGenieDeepLink,
} from '../helpers';

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const credentialType = getActiveCredentialType(this, i);
	const host = await getHost(this, credentialType);
	const spaceId = this.getNodeParameter('spaceId', i) as string;
	const conversationId = this.getNodeParameter('conversationId', i) as string;
	const messageId = this.getNodeParameter('messageId', i) as string;
	const attachmentId = this.getNodeParameter('attachmentId', i) as string;

	const response: GenieApiResponse = await databricksApiRequest(this, credentialType, {
		method: 'GET',
		url: `${host}/api/2.0/genie/spaces/${spaceId}/conversations/${conversationId}/messages/${messageId}/attachments/${attachmentId}/query-result`,
		headers: { 'Content-Type': 'application/json' },
		json: true,
		returnFullResponse: true,
	});

	return [
		{ json: withGenieDeepLink(response, host, spaceId, conversationId), pairedItem: { item: i } },
	];
}
