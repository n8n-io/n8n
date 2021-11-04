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

  //meta data
  const companyName = this.getNodeParameter('companyName', index) as string;
  const requestId = this.getNodeParameter('requestId', index) as string;

  //body parameters
  body = this.getNodeParameter('additionalFields', index) as IDataObject;
  body.status = this.getNodeParameter('status', index) as string;

  //API uri
  const uri = `https://api.bamboohr.com/api/gateway.php/${companyName}/v1/${endPoint}/${requestId}/status`;

  //response
  const responseData = await apiRequest.call(this, requestMethod, uri, body);

  //return
  return this.helpers.returnJsonArray({ statusCode: responseData.statusCode, statusMessage: responseData.statusMessage });
}