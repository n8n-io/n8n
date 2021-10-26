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
  IDataObject, NodeApiError, NodeOperationError,
} from 'n8n-workflow';

export async function apiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, uri: string, qs: IDataObject = {}, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
  const credentials = await this.getCredentials('bambooHRApi') as IDataObject;
  if (credentials === undefined) {
    throw new NodeOperationError(this.getNode(), 'No credentials!');
  }

  let options: OptionsWithUri = {
    headers: {
      'Content-Type': 'application/json',
    },
    method: method,
    uri: uri,
    body: qs ? JSON.stringify(qs) : null,
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

export async function createUri(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, companyName: string, endPoint: string): Promise<any> {
  return `https://api.bamboohr.com/api/gateway.php/${companyName}/v1/${endPoint}/`;
}