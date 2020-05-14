import { OptionsWithUri } from 'request';
import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IExecuteSingleFunctions,
} from 'n8n-core';
import { IDataObject } from 'n8n-workflow';

export async function facebookAdsApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('facebookAdsApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const options: OptionsWithUri = {
		headers: { 'Authorization': `Bearer ${credentials.accessToken}`},
		method,
		qs,
		body,
		uri: uri ||`https://graph.facebook.com/v7.0/${resource}`,
		json: true
	};
    
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new Error(`Facebook Ads error. Status Code: ${error.statusCode} Message: ${error.message}`);
	}
}

export function validateJSON(json : string | undefined) : {} | undefined {
    let result;
    try {
        result = JSON.parse(json!);
    } catch (exception) {
        result = undefined;
    }
    return result;
}