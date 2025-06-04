import basicAuth from 'basic-auth';
import pick from 'lodash/pick';
import type {
	ICredentialDataDecryptedObject,
	IWebhookFunctions,
	MultiPartFormData,
	INodeExecutionData,
	IBinaryData,
	IDataObject,
} from 'n8n-workflow';

import { ChatTriggerAuthorizationError } from './error';
import type { AuthenticationChatOption } from './types';

export async function validateAuth(context: IWebhookFunctions) {
	const authentication = context.getNodeParameter('authentication') as AuthenticationChatOption;
	const req = context.getRequestObject();
	const headers = context.getHeaderData();

	if (authentication === 'none') {
		return;
	} else if (authentication === 'basicAuth') {
		// Basic authorization is needed to call webhook
		let expectedAuth: ICredentialDataDecryptedObject | undefined;
		try {
			expectedAuth = await context.getCredentials<ICredentialDataDecryptedObject>('httpBasicAuth');
		} catch {}

		if (expectedAuth === undefined || !expectedAuth.user || !expectedAuth.password) {
			// Data is not defined on node so can not authenticate
			throw new ChatTriggerAuthorizationError(500, 'No authentication data defined on node!');
		}

		const providedAuth = basicAuth(req);
		// Authorization data is missing
		if (!providedAuth) throw new ChatTriggerAuthorizationError(401);

		if (providedAuth.name !== expectedAuth.user || providedAuth.pass !== expectedAuth.password) {
			// Provided authentication data is wrong
			throw new ChatTriggerAuthorizationError(403);
		}
	} else if (authentication === 'n8nUserAuth') {
		const webhookName = context.getWebhookName();

		function getCookie(name: string) {
			const value = `; ${headers.cookie}`;
			const parts = value.split(`; ${name}=`);

			if (parts.length === 2) {
				return parts.pop()?.split(';').shift();
			}
			return '';
		}

		const authCookie = getCookie('n8n-auth');
		if (!authCookie && webhookName !== 'setup') {
			// Data is not defined on node so can not authenticate
			throw new ChatTriggerAuthorizationError(500, 'User not authenticated!');
		}
	}

	return;
}

export async function handleFormData(context: IWebhookFunctions) {
	const req = context.getRequestObject() as MultiPartFormData.Request;
	const options = context.getNodeParameter('options', {}) as IDataObject;
	const { data, files } = req.body;

	const returnItem: INodeExecutionData = {
		json: data,
	};

	if (files && Object.keys(files).length) {
		returnItem.json.files = [] as Array<Omit<IBinaryData, 'data'>>;
		returnItem.binary = {};

		const count = 0;
		for (const fileKey of Object.keys(files)) {
			const processedFiles: MultiPartFormData.File[] = [];
			if (Array.isArray(files[fileKey])) {
				processedFiles.push(...files[fileKey]);
			} else {
				processedFiles.push(files[fileKey]);
			}

			let fileIndex = 0;
			for (const file of processedFiles) {
				let binaryPropertyName = 'data';

				// Remove the '[]' suffix from the binaryPropertyName if it exists
				if (binaryPropertyName.endsWith('[]')) {
					binaryPropertyName = binaryPropertyName.slice(0, -2);
				}
				if (options.binaryPropertyName) {
					binaryPropertyName = `${options.binaryPropertyName.toString()}${count}`;
				}

				const binaryFile = await context.nodeHelpers.copyBinaryFile(
					file.filepath,
					file.originalFilename ?? file.newFilename,
					file.mimetype,
				);

				const binaryKey = `${binaryPropertyName}${fileIndex}`;

				const binaryInfo = {
					...pick(binaryFile, ['fileName', 'fileSize', 'fileType', 'mimeType', 'fileExtension']),
					binaryKey,
				};

				returnItem.binary = Object.assign(returnItem.binary ?? {}, {
					[`${binaryKey}`]: binaryFile,
				});
				returnItem.json.files = [
					...(returnItem.json.files as Array<Omit<IBinaryData, 'data'>>),
					binaryInfo,
				];
				fileIndex += 1;
			}
		}
	}

	return returnItem;
}
