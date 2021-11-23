import {
  IExecuteFunctions,
} from 'n8n-core';

import {
  IDataObject,
  INodeExecutionData,
} from 'n8n-workflow';

import {
  apiRequest,
} from '../../../transport';

export async function get(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
  const body = {} as IDataObject;
  const requestMethod = 'GET';

	//meta data
	const id = this.getNodeParameter('id', index) as string;

	//query parameters
  const fields = this.getNodeParameter('fields', index);

	//endpoint
  const endPoint = `employees/${id}/?fields=${fields}`;

	//response
	const responseData = await apiRequest.call(this, requestMethod, endPoint, body);

  //return
  return this.helpers.returnJsonArray(responseData);
}
