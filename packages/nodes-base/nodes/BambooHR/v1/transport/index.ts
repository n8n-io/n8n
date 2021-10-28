import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import {
  OptionsWithUri,
} from 'request';

/**
 * Make an API request to Mattermost
 */
export async function apiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD',
	uri: string,
  body: string[] | IDataObject = {},
  option: IDataObject = {}
) {
  const credentials = await this.getCredentials('bambooHRApi');

	if (!credentials) {
		throw new NodeOperationError(this.getNode(), 'No credentials returned!');
	}

  let options: OptionsWithUri = {
    headers: {
      'Content-Type': 'application/json',
    },
    method: method,
    uri: uri,
    body: body ? JSON.stringify(body) : null,
    auth: {
      user: credentials.apiKey as string,
      pass: 'x',
    },
    json: true
  };
  options = Object.assign({}, options, option);


  try {
    return await this.helpers.request!(options);
  } catch (error) {
    throw new NodeApiError(this.getNode(), error);
  }
}
