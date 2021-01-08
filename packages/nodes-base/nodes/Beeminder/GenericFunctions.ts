import {
	OptionsWithUri,
 } from 'request';

import {
	ICredentialDataDecryptedObject
} from 'n8n-workflow'

import {
	IExecuteFunctions,
  ILoadOptionsFunctions
} from 'n8n-core';

import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-workflow';

const BEEMINDER_URI = 'https://www.beeminder.com/api/v1';

export async function beeminderApiRequest(this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions, credentials: ICredentialDataDecryptedObject, method: string, endpoint: string, body: any = {}): Promise<any> { // tslint:disable-line:no-any
	const options: OptionsWithUri = {
    method,
		body: {
      ...body,
      auth_token: credentials.authToken
    },
    uri: `${BEEMINDER_URI}${endpoint}`,
    json: true
  };

	try {
		return await this.helpers.request!(options);
	} catch (error) {
    if (error?.message) {
      throw new Error(`Beeminder API ${error.message}`);
    }
		throw error;
	}
}