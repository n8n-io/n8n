import {
  IExecuteFunctions,
} from 'n8n-core';

import {
  INodeExecutionData,
} from 'n8n-workflow';

import {
  apiRequest,
} from '../../../transport';

export async function create(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
  const body: string[] = [];
  const requestMethod = 'POST';
  const endPoint = 'files/categories';
  const companyName = this.getNodeParameter('companyName', index) as string;
  const categoryName = this.getNodeParameter('categoryName', index) as string;

  body.push(categoryName);

  const uri = `https://api.bamboohr.com/api/gateway.php/${companyName}/v1/${endPoint}/`;
  const responseData = await apiRequest.call(this, requestMethod, uri, body);

  return this.helpers.returnJsonArray(responseData);
}