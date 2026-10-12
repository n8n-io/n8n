import type { WhatsAppCredentialCheck, WhatsAppWebhookStatus } from '@n8n/api-types';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

const integrationPath = (projectId: string, agentId: string) =>
	`/projects/${projectId}/agents/v2/${agentId}/integrations/whatsapp`;

export const checkWhatsAppCredential = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	credentialId: string,
): Promise<WhatsAppCredentialCheck> =>
	await makeRestApiRequest(
		context,
		'POST',
		`${integrationPath(projectId, agentId)}/check/${credentialId}`,
	);

export const getWhatsAppWebhookStatus = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<WhatsAppWebhookStatus> =>
	await makeRestApiRequest(context, 'GET', `${integrationPath(projectId, agentId)}/webhook-status`);
