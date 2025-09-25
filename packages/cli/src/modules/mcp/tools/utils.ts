import type { User } from '@n8n/db';
import type { INode } from 'n8n-workflow';

import {
	hasHttpHeaderAuthDecryptedData,
	hasJwtPemKeyDecryptedData,
	hasJwtSecretDecryptedData,
} from '../mcp.typeguards';

import type { CredentialsService } from '@/credentials/credentials.service';

/**
 * Creates a detailed textual description of the webhook triggers in a workflow, including URLs, methods, authentication, and response modes.
 * This helps MCP clients understand how craft a request to trigger the workflow.
 * @param user
 * @param webhookNodes
 * @param baseUrl
 * @param isWorkflowActive
 * @param credentialsService
 * @returns A detailed string description of the webhook triggers in the workflow.
 */
export const getWebhookDetails = async (
	user: User,
	webhookNodes: INode[],
	baseUrl: string,
	isWorkflowActive: boolean,
	credentialsService: CredentialsService,
): Promise<string> => {
	if (webhookNodes.length === 0) {
		return 'This workflow does not have a trigger node that can be executed via MCP.';
	}

	let triggerNotice = 'This workflow is triggered by the following webhook(s):\n\n';

	const webhookPromises = webhookNodes.map(async (node, index) => {
		let credentialsInfo: string | null = null;
		if (node.parameters.authentication) {
			const authType =
				typeof node.parameters.authentication === 'string'
					? node.parameters.authentication
					: undefined;
			switch (authType) {
				case 'basicAuth':
					credentialsInfo =
						'\n\t - This webhook requires basic authentication with a username and password that should be provided by the user.';
					break;
				case 'headerAuth': {
					const headerAuthDetails = await getHeaderAuthDetails(user, node, credentialsService);
					if (headerAuthDetails) {
						credentialsInfo = headerAuthDetails;
					}
					break;
				}
				case 'jwtAuth': {
					const jwtDetails = await getJWTAuthDetails(user, node, credentialsService);
					if (jwtDetails) {
						credentialsInfo = jwtDetails;
					}
					break;
				}
			}
		}

		const responseModeDetails = getResponseModeDescription(node);
		const pathParam = typeof node.parameters.path === 'string' ? node.parameters.path : '';
		const httpMethod =
			typeof node.parameters.httpMethod === 'string' ? node.parameters.httpMethod : 'GET';

		return `
				<trigger ${index + 1}>
				\t - Node name: ${node.name}
				\t - Base URL: ${baseUrl}
				\t - PATH: ${isWorkflowActive ? '/webhook/' : '/webhook-test/'}${pathParam}
				\t - HTTP Method: ${httpMethod}
				\t - Response Mode: ${responseModeDetails}
				${
					credentialsInfo
						? `\t - Credentials: ${credentialsInfo}`
						: '\t - No credentials required for this webhook.'
				}
				</trigger ${index + 1}>`;
	});

	const webhookResults = await Promise.all(webhookPromises);
	triggerNotice += webhookResults.join('\n\n');

	return triggerNotice;
};

const getHeaderAuthDetails = async (
	user: User,
	node: INode,
	credentialsService: CredentialsService,
): Promise<string | null> => {
	const id = node.credentials?.httpHeaderAuth?.id;
	if (!id) return null;

	const creds = await credentialsService.getOne(user, id, true);
	if (hasHttpHeaderAuthDecryptedData(creds)) {
		return `\n\t - This webhook requires a header with name "${creds.data.name}" and a value that should be provided by the user.`;
	}
	return null;
};

const getJWTAuthDetails = async (
	user: User,
	node: INode,
	credentialsService: CredentialsService,
): Promise<string | null> => {
	const id = node.credentials?.jwtAuth?.id;
	if (!id) return null;
	try {
		const creds = await credentialsService.getOne(user, id, true);
		if (hasJwtSecretDecryptedData(creds)) {
			return '\n\t - This webhook requires a JWT secret that should be provided by the user.';
		} else if (hasJwtPemKeyDecryptedData(creds)) {
			return '\n\t - This webhook requires JWT private and public keys that should be provided by the user.';
		}
	} catch {
		return null;
	}
	return null;
};

const getResponseModeDescription = (node: INode): string => {
	const responseMode =
		typeof node.parameters.responseMode === 'string' ? node.parameters.responseMode : undefined;
	let responseModeInfo =
		'Webhook is configured to respond immediately with the message "Workflow got started."';
	if (responseMode === 'responseNode') {
		responseModeInfo = 'Webhook is configured to respond using "Respond to Webhook" node.';
	} else if (responseMode === 'lastNode') {
		// [undefined = firstEntryJSON], allEntries, firstEntryBinary, noData
		const responseData =
			typeof node.parameters.responseData === 'string' ? node.parameters.responseData : undefined;
		responseModeInfo = 'Webhook is configured to respond when the last node is executed. ';
		switch (responseData) {
			case 'allEntries':
				responseModeInfo += 'Returns all the entries of the last node. Always returns an array.';
				break;
			case 'firstEntryBinary':
				responseModeInfo +=
					'Returns the binary data of the first entry of the last node. Always returns a binary file.';
				break;
			case 'noData':
				responseModeInfo += 'Returns without a body.';
				break;
			default:
				responseModeInfo +=
					'Returns the JSON data of the first entry of the last node. Always returns a JSON object.';
				break;
		}
	}
	return responseModeInfo;
};
