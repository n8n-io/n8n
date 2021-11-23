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

export async function getAll(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
  const body = {} as IDataObject;
  const requestMethod = 'GET';

  //meta data
  const id = this.getNodeParameter('id', index) as string;

	//endpoint
	const endPoint = `employees/${id}/files/view/`;

  //response
  const responseData = await apiRequest.call(this, requestMethod, endPoint, body);

  //return
  return this.helpers.returnJsonArray(responseData);
}
