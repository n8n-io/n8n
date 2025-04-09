import EventSource from 'eventsource';
import get from 'lodash/get';
import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	INodeCredentialTestResult,
} from 'n8n-workflow';

import type { McpSseCredential } from './types';
import { getHeaders } from './utils';

const ERROR_MESSAGE = 'Could not connect to your MCP Server';
const SUCCESS_MESSAGE = 'Successfully connected to your MCP Server';

export async function testMcpSseCredential(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	return await new Promise((resolve) => {
		const typedCredential = credential.data as McpSseCredential | undefined;

		if (!typedCredential) {
			return resolve({ status: 'Error', message: ERROR_MESSAGE });
		}

		const source = new EventSource(typedCredential.sseEndpoint, {
			headers: getHeaders(typedCredential),
		});

		source.onerror = (event) => {
			source.close();
			resolve({
				status: 'Error',
				message: get(event, 'message') ?? ERROR_MESSAGE,
			});
		};

		source.onopen = () => {
			source.close();
			resolve({ status: 'OK', message: SUCCESS_MESSAGE });
		};
	});
}
