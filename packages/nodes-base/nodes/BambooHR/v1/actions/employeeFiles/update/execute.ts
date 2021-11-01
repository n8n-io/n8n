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

export async function update(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
  var body = {} as IDataObject;
  const requestMethod = 'POST';
  const endPoint = 'employees';
  const companyName = this.getNodeParameter('companyName', index) as string;
  const id = this.getNodeParameter('id', index) as string;
  const fileId = this.getNodeParameter('fileId', index) as string;

  body = this.getNodeParameter('additionalFields', index) as IDataObject;

  const uri = `https://api.bamboohr.com/api/gateway.php/${companyName}/v1/${endPoint}/${id}/files/${fileId}`;
  const responseData = await apiRequest.call(this, requestMethod, uri, body);

  return this.helpers.returnJsonArray({ statusCode: responseData.statusCode, statusMessage: responseData.statusMessage });
}