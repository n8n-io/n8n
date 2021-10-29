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
  const endPoint = 'files';
  const companyName = this.getNodeParameter('companyName', index) as string;

  const uri = `https://api.bamboohr.com/api/gateway.php/${companyName}/v1/${endPoint}/view/`;
  const responseData = await apiRequest.call(this, requestMethod, uri, body);

  return this.helpers.returnJsonArray(responseData);
}