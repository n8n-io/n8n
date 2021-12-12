import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import { INode, NodeOperationError } from 'n8n-workflow';
import { createHash } from 'crypto';

export async function performOperation(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, apiUrl: string): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('blueIrisApi');
	if (!credentials) {
		throw new NodeOperationError(this.getNode(), 'Credentials are mandatory!');
	}
	const operation = this.getNodeParameter('operation', 0) as string;

	const initSessionRequest = getInitializeSessionRequest(apiUrl);
	let responseData = await this.helpers.request!(initSessionRequest);

	const session = responseData.session;
	const authenticatioRequest = `${credentials.username}:${session}:${credentials.password}`;
	const hashedAuthentication = createHash('md5').update(authenticatioRequest).digest('hex');

	const loginRequest = getLoginRequest(apiUrl, session, hashedAuthentication);
	responseData = await this.helpers.request!(loginRequest);
	checkResponseErrors(this.getNode(), responseData);

	const operationRequest = getOperationRequest(apiUrl, session, operation);
	responseData = await this.helpers.request!(operationRequest);
	checkResponseErrors(this.getNode(), responseData);

	const logoutRequest = getCloseSessionRequest(apiUrl, session);
	await this.helpers.request!(logoutRequest);

	return responseData;
}

function checkResponseErrors(node: INode, responseData: any) { // tslint:disable-line:no-any
	if (responseData.result !== 'success') {
		throw new NodeOperationError(node, `Received the following error from BlueIris API: ${responseData.data.reason}`);
	}
}

function getInitializeSessionRequest(apiUrl: string) {
	const body = { cmd: 'login' };
	return {
		body,
		method: 'POST',
		uri: apiUrl,
		json: true,
	} as OptionsWithUri;
}

function getLoginRequest(apiUrl: string, session: string, hashedAuthentication: string) {
	const body = {
		cmd: 'login',
		session,
		response: hashedAuthentication,
	};
	return {
		body,
		method: 'POST',
		uri: apiUrl,
		json: true,
	} as OptionsWithUri;
}

function getOperationRequest(apiUrl: string, session: string, operation: string) {
	const body = {
		cmd: operation,
		session,
	};
	return {
		body,
		method: 'POST',
		uri: apiUrl,
		json: true,
	} as OptionsWithUri;
}

function getCloseSessionRequest(apiUrl: string, session: string) {
	const body = {
		cmd: 'logout',
		session,
	};
	return {
		body,
		method: 'POST',
		uri: apiUrl,
		json: true,
	} as OptionsWithUri;
}
