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

export async function createRequest(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
  var body = {} as IDataObject;
  const requestMethod = 'PUT';

  //meta data
  const employeeId = this.getNodeParameter('employeeId', index) as string;

	//endpoint
	const endPoint = `employees/${employeeId}/time_off/request`;

  //body parameters
  body = this.getNodeParameter('additionalFields', index) as IDataObject;
  body.timeOffTypeId = this.getNodeParameter('timeOffTypeId', index) as string;
  body.status = this.getNodeParameter('status', index) as string;
  body.start = this.getNodeParameter('start', index) as string;
  body.end = this.getNodeParameter('end', index) as string;

  //response
  const responseData = await apiRequest.call(this, requestMethod, endPoint, body);

  //return
  return this.helpers.returnJsonArray({ statusCode: responseData.statusCode, statusMessage: responseData.statusMessage });
}
