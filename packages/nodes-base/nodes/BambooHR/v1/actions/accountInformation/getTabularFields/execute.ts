import {
  IExecuteFunctions,
} from 'n8n-core';

import {
  INodeExecutionData,
} from 'n8n-workflow';

import {
  apiRequest,
} from '../../../transport';

export async function getTabularFields(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
  const body: string[] = [];
  const requestMethod = 'GET';
  const endPoint = 'meta/tables';
  const companyName = this.getNodeParameter('companyName', index) as string;

  const uri = `https://api.bamboohr.com/api/gateway.php/${companyName}/v1/${endPoint}`;
  const responseData = await apiRequest.call(this, requestMethod, uri, body);

  return this.helpers.returnJsonArray(responseData);
}