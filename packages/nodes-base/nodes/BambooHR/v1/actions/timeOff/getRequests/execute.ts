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

export async function getRequests(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
  var body = {} as IDataObject;
  
  const requestMethod = 'GET';
  const endPoint = 'time_off/requests';
  const companyName = this.getNodeParameter('companyName', index) as string;

  const uri = `https://api.bamboohr.com/api/gateway.php/${companyName}/v1/${endPoint}`;

  const responseData = await apiRequest.call(this, requestMethod, uri, body);

  return this.helpers.returnJsonArray(responseData);
}