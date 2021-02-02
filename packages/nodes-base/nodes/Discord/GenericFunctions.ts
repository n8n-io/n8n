import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	IOAuth2Options,
} from 'n8n-workflow';

export async function discordApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IHookFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	let options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `https://discord.com/api${resource}`,
		json: true,
	};
	options = Object.assign({}, options, option);

	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		const oAuth2Options: IOAuth2Options = {
			includeCredentialsOnRefreshOnBody: true,
		};

		//@ts-ignore
		return await this.helpers.requestOAuth2.call(this, 'discordOAuth2Api', options, oAuth2Options);

	} catch (error) {

		let errorMessage;

		if (error.response && error.response.body) {

			if (error.response.body.context_info && error.response.body.context_info.errors) {
				const errors = error.response.body.context_info.errors;
				errorMessage = errors.map((e: IDataObject) => e.message);
				errorMessage = errorMessage.join('|');
			} else if (error.response.body.message) {
				errorMessage = error.response.body.message;
			}

			throw new Error(`Discord error response [${error.statusCode}]: ${errorMessage}`);
		}
		throw error;
	}
}
