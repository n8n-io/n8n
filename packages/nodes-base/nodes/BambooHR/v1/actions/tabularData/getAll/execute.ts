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
  var body = {} as IDataObject;
  const requestMethod = 'GET';
  const endPoint = 'employees/changed';

  //meta data
  const companyName = this.getNodeParameter('companyName', index) as string;
  const tableName = this.getNodeParameter('table', index) as string;

  //query parameter
  const since = this.getNodeParameter('since', index) as string;
  const encodedSince = encodeURIComponent(since);

  //API uri
  const uri = `https://api.bamboohr.com/api/gateway.php/${companyName}/v1/${endPoint}/tables/${tableName}/?since=${encodedSince}`;

  //response
  const responseData = await apiRequest.call(this, requestMethod, uri, body);

  //return
  return this.helpers.returnJsonArray(responseData);
}