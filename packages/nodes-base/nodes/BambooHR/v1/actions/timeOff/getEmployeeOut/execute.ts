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

export async function getEmployeeOut(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
  var body = {} as IDataObject;
  const requestMethod = 'GET';
  const endPoint = 'time_off/whos_out';

  //meta data
  const companyName = this.getNodeParameter('companyName', index) as string;

  //body parameters
  body = this.getNodeParameter('additionalFields', index) as IDataObject;

  //API uri
  const uri = `https://api.bamboohr.com/api/gateway.php/${companyName}/v1/${endPoint}`;

  //response
  const responseData = await apiRequest.call(this, requestMethod, uri, body);

  //return
  return this.helpers.returnJsonArray(responseData);
}