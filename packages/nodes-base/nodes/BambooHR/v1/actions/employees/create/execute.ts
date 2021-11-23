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

export async function create(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
  var body = {} as IDataObject;
  const requestMethod = 'POST';
  const endPoint = 'employees';

  //body parameters
  body = this.getNodeParameter('additionalFields', index) as IDataObject;
  body.firstName = this.getNodeParameter('firstName', index) as string;
  body.lastName = this.getNodeParameter('lastName', index) as string;

  //response
  const responseData = await apiRequest.call(this, requestMethod, endPoint, body);

  //return
  return this.helpers.returnJsonArray({ statusCode: responseData.statusCode, statusMessage: responseData.statusMessage });
}
