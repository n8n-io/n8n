import {
	OptionsWithUri,
 } from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IExecuteSingleFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';
import { ecomOrderProductsFields } from '../ActiveCampaign/EcomOrderProductsDescription';

export async function agileCrmApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: any = {}, query: IDataObject = {}, uri?: string): Promise<any> {

    const node = this.getNode();
    const credentialName = Object.keys(node.credentials!)[0];
    const credentials = this.getCredentials(credentialName);

	const options: OptionsWithUri = {
		method,
		headers: {
			'Accept': 'application/json',
		},
        auth: {
			username: credentials!.email as string,
			password: credentials!.apiKey as string
		},
		uri: uri || `https://n8nio.agilecrm.com/dev/${endpoint}`,
		json: true
    };

	try {
		return await this.helpers.request!(options);
	} catch (error) {

		if (error.response && error.response.body && error.response.body.errors) {
			const errorMessages = error.response.body.errors.map((e: IDataObject) => e.message);
			throw new Error(`AgileCRM error response [${error.statusCode}]: ${errorMessages.join(' | ')}`);
		}

		throw error;
	}
}