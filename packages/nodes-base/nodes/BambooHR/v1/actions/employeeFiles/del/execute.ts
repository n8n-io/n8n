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

export async function del(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
  const body = {} as IDataObject;
  const requestMethod = 'DELETE';
  const endPoint = 'employees';
  const companyName = this.getNodeParameter('companyName', index) as string;
  const id = this.getNodeParameter('id', index) as string;
  const fileId = this.getNodeParameter('fileId', index) as string;

  const uri = `https://api.bamboohr.com/api/gateway.php/${companyName}/v1/${endPoint}/${id}/files/${fileId}`;
  const responseData = await apiRequest.call(this, requestMethod, uri, body);

  return this.helpers.returnJsonArray(responseData);
}