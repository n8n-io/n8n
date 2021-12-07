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
  const fileId = this.getNodeParameter('fileId', index) as string;

	//endpoint
	const endPoint = `files/${fileId}`;

  //response
  const responseData = await apiRequest.call(this, requestMethod, endPoint, body);

  //return
  return this.helpers.returnJsonArray(responseData);
}
