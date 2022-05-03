import { OptionsWithUri, OptionsWithUrl } from 'request';

import {
	IExecuteFunctions, IExecuteSingleFunctions,
	IHookFunctions, ILoadOptionsFunctions
} from 'n8n-core';

import {
	IDataObject, INodeParameters, NodeApiError, NodeOperationError, NodeParameterValue
} from 'n8n-workflow';

import { DSAccount, DSMetadataObject } from './types';

async function getMetadata(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, oauthTokenData: IDataObject) {
	const credentials = await this.getCredentials('docusignOAuth2Api');
	const options: OptionsWithUrl = {
		headers: {
			'Accept': 'application/json',
			'Authorization': `Bearer ${oauthTokenData.access_token}`,
		},
		method: 'GET',
		url: credentials.metadataUrl as string,
		json: true,
	};
	return this.helpers.request!(options);
}

/**
 * Make an API request to Github
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function docusignApiRequest(this: IHookFunctions | IExecuteFunctions, method: string, endpoint: string, body: object, query?: object, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const options: OptionsWithUri = {
		method,
		headers: {
			'User-Agent': 'n8n',
		},
		body,
		qs: query,
		uri: '',
		json: true,
	};

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	try {

		const credentials = await this.getCredentials('docusignOAuth2Api');

		options.headers!.Authorization = `Bearer ${credentials.accessToken}`;

		// Get all DS accounts from the authenticated user
		const { accounts } = await getMetadata.call(this, credentials.oauthTokenData as IDataObject) as DSMetadataObject;
		if ( accounts.length <= 0 ) {
			throw new NodeApiError(this.getNode(), {message: 'No accounts found in connected Docusign User'});
		}

		// Get the correct Account to use
		let account: DSAccount | undefined = undefined;

		const useDefaultAccount = this.getNodeParameter('useDefaultAccount', 0) as boolean;
		if ( useDefaultAccount ) {
			// Use the "default" account
			account = accounts.find(account => account.is_default);
		}

		if ( !account ) {

			// Use the provided account id, if present
			const useAccountId = this.getNodeParameter('accountId', 0) as string;
			if ( useAccountId ) {
				account = accounts.find(account => account.account_id === useAccountId);
			}

			// Fallback to the first account if none was selected previously
			if ( !account ) {
				account = accounts[0];
			}
		}

		if ( !account ) {
			throw new NodeOperationError(this.getNode(), `Could not select DocuSign Account to use!`);
		}

		const baseUrl = `${account.base_uri}/restapi/v2.1/accounts/${account.account_id}`;
		//const baseUrl = `https://webhook.site/cdb4524d-e52b-45ac-a310-1f3a6e08c990/${account.base_uri}/restapi/v2.1/accounts/${account.account_id}`;
		options.uri = `${baseUrl}${endpoint}`;

		//@ts-ignore
		return await this.helpers.requestOAuth2.call(this, 'docusignOAuth2Api', options);

	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}


export async function docusignApiRequestAllItems(this: IHookFunctions | IExecuteFunctions, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	query.per_page = 100;
	query.page = 1;

	do {
		responseData = await docusignApiRequest.call(this, method, endpoint, body, query, { resolveWithFullResponse: true });
		query.page++;
		returnData.push.apply(returnData, responseData.body);
	} while (
		responseData.headers.link && responseData.headers.link.includes('next')
	);
	return returnData;
}
