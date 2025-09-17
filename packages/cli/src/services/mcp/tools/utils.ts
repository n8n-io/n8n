import type { User } from '@n8n/db';
import type { INode } from 'n8n-workflow';

import type { CredentialsService } from '@/credentials/credentials.service';

export const getWebhookDetails = async (
	user: User,
	webhookNodes: INode[],
	baseUrl: string,
	isWorkflowActive: boolean,
	crednetialsService: CredentialsService,
): Promise<string> => {
	let triggerNotice = 'This workflow does not have a trigger node that can be executed via MCP.';

	if (webhookNodes.length === 0) {
		return triggerNotice;
	}

	triggerNotice = 'This workflow is triggered by the following webhook(s):\n\n';

	const webhookPromises = webhookNodes.map(async (node, index) => {
		let credentialsInfo: string | null = null;
		if (node.parameters.authentication) {
			const authType = node.parameters.authentication as string;
			switch (authType) {
				case 'basicAuth':
					credentialsInfo =
						'\n\t - This webhook requires basic authentication with a username and password that should be provided by the user.';
					break;
				case 'headerAuth': {
					const headerAuthDetails = await getHeaderAuthDetails(user, node, crednetialsService);
					if (headerAuthDetails) {
						credentialsInfo = headerAuthDetails;
					}
					break;
				}
				case 'jwtAuth': {
					const jwtDetails = await getJWTAuthDetails(user, node, crednetialsService);
					if (jwtDetails) {
						credentialsInfo = jwtDetails;
					}
					break;
				}
			}
		}

		const responseModeDetails = getResponseModeDescription(node);

		return `
				<trigger ${index + 1}>
				\t - Node name: ${node.name}
				\t - Base URL: ${baseUrl}
				\t - PATH: ${isWorkflowActive ? '/webhook/' : '/webhook-test/'}${node.parameters.path as string}
				\t - HTTP Method: ${(node.parameters.httpMethod as string) ?? 'GET'}
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

	// TODO: Fix these type castings (check correct type for credentials)
	const creds = await credentialsService.getOne(user, id, true);
	if (
		creds &&
		'data' in creds &&
		(creds as any).data?.name &&
		typeof (creds as any).data?.name === 'string'
	) {
		return `\n\t - This webhook requires a header with name "${creds.data.name as string}" and a value that should be provided by the user.`;
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
	const creds = await credentialsService.getOne(user, id, true);
	// Passphrase
	if (creds && 'data' in creds && (creds as any).data?.secret) {
		return '\n\t - This webhook requires a JWT secret that should be provided by the user.';
	} else if (creds && 'data' in creds && (creds as any).data?.keyType) {
		// PEM keys
		return '\n\t - This webhook requires a JWT private and public keys that should be provided by the user.';
	}
	return null;
};

const getResponseModeDescription = (node: INode): string => {
	const responseMode = node.parameters.responseMode as string | undefined;
	let responseModeInfo =
		'Webhook is configured to respond immediately with the message "Workflow got started."';
	if (responseMode === 'responseNode') {
		responseModeInfo = 'Webhook is configured to respond using "Respond to Webhook" node.';
	} else if (responseMode === 'lastNode') {
		// [undefined = firstEntryJSOn], allEntries, firstEntryBinary, noData
		const responseData = node.parameters.responseData as string | undefined;
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
