import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject, NodeApiError, NodeOperationError,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

/**
 * Make an API request to Upload Data MonkeyLearn
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url_api
 * @param {object} qs
 * @param {object} body
 * @returns {Promise<any>}
 */

 export async function apiCall(this: IHookFunctions | IExecuteFunctions, method : string, url_api:string, qs:IDataObject, body: IDataObject) : Promise<any> {
 	const credentials = await this.getCredentials('akauntingApi') as {
 		url: string;
 		company_id: string;
 		username: string;
 		password: string;
 	};

 	if (credentials === undefined) {
 		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
 	}

 	try {
 		let url = `${credentials.url}${url_api}`
		let basic = Buffer.from(`${credentials.username}:${credentials.password}`, 'utf8').toString('base64')
		console.log(`basic ${basic}`)
		console.log(`url ${url}`)
		console.log(`qs ${JSON.stringify(qs)}`)
		console.log(`body ${JSON.stringify(body)}`)
 		const options: OptionsWithUri = {
 			method,
 			body,
 			qs,
 			uri:url,
			json: true,
 			headers : {
 				Authorization : `Basic ${basic}`
 			},
 		};

 		return await this.helpers.request(options);
 	} catch (error) {
 		throw new NodeApiError(this.getNode(), error);
 	}
 }
