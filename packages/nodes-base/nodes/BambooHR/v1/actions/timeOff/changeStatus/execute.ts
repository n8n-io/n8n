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

export async function changeStatus(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
  var body = {} as IDataObject;
  
  const requestMethod = 'PUT';
  const endPoint = 'time_off/requests';
  const companyName = this.getNodeParameter('companyName', index) as string;
  const requestId = this.getNodeParameter('requestId', index) as string;

  body = this.getNodeParameter('additionalFields', index) as IDataObject;

  const uri = `https://api.bamboohr.com/api/gateway.php/${companyName}/v1/${endPoint}/${requestId}/status`;

  const responseData = await apiRequest.call(this, requestMethod, uri, body);

  return this.helpers.returnJsonArray({ statusCode: responseData.statusCode, statusMessage: responseData.statusMessage });
}