import {
  IExecuteFunctions,
} from 'n8n-core';

import {
  INodeExecutionData,
} from 'n8n-workflow';

import {
  apiRequest,
} from '../../../transport';

export async function getUsers(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
  const body: string[] = [];
  const requestMethod = 'GET';
  const endPoint = 'meta/users';

  //response
  const responseData = await apiRequest.call(this, requestMethod, endPoint, body);

  //return
  return this.helpers.returnJsonArray(responseData);
}
