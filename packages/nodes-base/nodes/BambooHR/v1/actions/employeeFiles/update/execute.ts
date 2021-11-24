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

export async function update(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
  var body = {} as IDataObject;
  const requestMethod = 'POST';

  //meta data
  const id = this.getNodeParameter('id', index) as string;
  const fileId = this.getNodeParameter('fileId', index) as string;

	//endpoint
	const endPoint = `employees/${id}/files/${fileId}`;

  //body parameters
  body = this.getNodeParameter('updateFields', index) as IDataObject;

  //response
  const responseData = await apiRequest.call(this, requestMethod, endPoint, body);

  //return
  return this.helpers.returnJsonArray({ statusCode: responseData.statusCode, statusMessage: responseData.statusMessage });
}
