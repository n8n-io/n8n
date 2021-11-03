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
  const endPoint = 'employees';
  const companyName = this.getNodeParameter('companyName', index) as string;
  const employeeId = this.getNodeParameter('employeeId', index) as string;

  body = this.getNodeParameter('additionalFields', index) as IDataObject;

  const uri = `https://api.bamboohr.com/api/gateway.php/${companyName}/v1/${endPoint}/${employeeId}/time_off/request`;

  const responseData = await apiRequest.call(this, requestMethod, uri, body);

  return this.helpers.returnJsonArray({ statusCode: responseData.statusCode, statusMessage: responseData.statusMessage });
}