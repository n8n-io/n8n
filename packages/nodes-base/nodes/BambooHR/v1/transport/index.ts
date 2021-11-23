import {
  IExecuteFunctions,
  IHookFunctions,
  ILoadOptionsFunctions,
} from 'n8n-core';

import {
  IDataObject,
  IHttpRequestOptions,
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
  endPoint: string,
  body: string[] | IDataObject = {},
  query: IDataObject = {},
) {
  const credentials = await this.getCredentials('bambooHRApi');

  if (!credentials) {
    throw new NodeOperationError(this.getNode(), 'No credentials returned!');
  }

	//set-up credentials
  const apiKey = credentials.apiKey;
	const companyName = credentials.companyName;

	//set-up uri
	const uri = `https://api.bamboohr.com/api/gateway.php/${companyName}/v1/${endPoint}`;

  let options: IHttpRequestOptions = {
    method,
    body: body ? JSON.stringify(body) : null,
    qs: query,
    url: uri,
    auth: {
      username: apiKey as string,
      password: 'x',
    },
    headers: {
      'Content-Type': 'application/json',
    },
    returnFullResponse: true,
    json: true
  };

  try {
    return await this.helpers.httpRequest(options);
  } catch (error) {
    throw new NodeApiError(this.getNode(), error);
  }
}
