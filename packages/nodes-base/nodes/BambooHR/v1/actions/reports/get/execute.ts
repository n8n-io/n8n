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
  const format = this.getNodeParameter('format', 0) as string;

	//endpoint
	const endPoint = `reports/${id}/?${format}`;

  //response
  const responseData = await apiRequest.call(this, requestMethod, endPoint, body);

  //return
  return this.helpers.returnJsonArray(responseData);
}
