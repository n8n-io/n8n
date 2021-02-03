import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

// import * as uuid from 'uuid/v4';

/**
 * Make an authenticated API request to Bitwarden.
 */
export async function bitwardenApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject,
	body: IDataObject,
	option: IDataObject = {},
): Promise<any> { // tslint:disable-line:no-any

	const { access_token } =  await getAccessToken.call(this);

	const options: OptionsWithUri = {
		headers: {
			'user-agent': 'n8n',
			Authorization: `Bearer ${access_token}`,
			'Content-Type': 'application/json',
		},
		method,
		qs,
		body,
		uri: `${getBaseUrl.call(this)}${endpoint}`,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	if (Object.keys(option)) {
		Object.assign(options, option);
	}

	try {
		console.log('------------------------------');
		console.log(options);
		console.log('------------------------------');
		return await this.helpers.request!(options);
	} catch (error) {

		// console.log(error);

		throw error;
	}
}

async function getAccessToken(
	this: IExecuteFunctions | ILoadOptionsFunctions,
): Promise<any> { // tslint:disable-line:no-any

	const credentials = this.getCredentials('bitwardenApi') as IDataObject;

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		method: 'POST',
		form: {
			client_id: credentials.clientId,
			client_secret: credentials.clientSecret,
			grant_type: 'client_credentials',
			scope: 'api.organization',
			deviceName: 'firefox', // TODO: How to set this?
			deviceType: 3, // TODO: How to set this?
			deviceIdentifier: 'aac2e34a-44db-42ab-a733-5322dd582c3d', // TODO: How to set this?
		},
		uri: getTokenUrl.call(this),
		json: true,
	};

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw error;
	}
}

function getTokenUrl(this: IExecuteFunctions | ILoadOptionsFunctions) {
	const credentials = this.getCredentials('bitwardenApi') as IDataObject;

	return credentials.environment === 'cloudHosted'
		? 'https://identity.bitwarden.com/connect/token'
		: `${credentials.domain}/identity/connect/token`;

}

function getBaseUrl(this: IExecuteFunctions | ILoadOptionsFunctions) {
	const credentials = this.getCredentials('bitwardenApi') as IDataObject;

	return credentials.environment === 'cloudHosted'
		? 'https://api.bitwarden.com'
		: `${credentials.domain}/api`;

}
