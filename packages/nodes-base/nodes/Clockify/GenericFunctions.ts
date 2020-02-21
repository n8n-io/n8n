import { OptionsWithUri } from 'request';
import {
	ILoadOptionsFunctions,
	IPollFunctions
} from 'n8n-core';

import { IDataObject } from 'n8n-workflow';

export async function clockifyApiRequest(this: ILoadOptionsFunctions | IPollFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('clockifyApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}
	const BASE_URL = 'https://api.clockify.me/api/v1';

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
			'X-Api-Key': credentials.apiKey as string,
		},
		method,
		qs,
		body,
		uri: `${BASE_URL}/${resource}`,
		json: true
	};
	try {
		return await this.helpers.request!(options);
	} catch (error) {

		let errorMessage = error.message;
		if (error.response.body && error.response.body.message) {
			errorMessage = `[${error.response.body.status_code}] ${error.response.body.message}`;
		}

		throw new Error('Clockify Error: ' + errorMessage);
	}
}
