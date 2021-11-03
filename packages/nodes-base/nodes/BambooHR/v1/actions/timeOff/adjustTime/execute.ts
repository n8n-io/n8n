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

export async function adjustTime(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
  var body = {} as IDataObject;
  
  const requestMethod = 'PUT';
  const endPoint = 'employees';
  const companyName = this.getNodeParameter('companyName', index) as string;
  const employeeId = this.getNodeParameter('employeeId', index) as string;

  body.date = this.getNodeParameter('date', index) as string;
  body.timeOffTypeId = this.getNodeParameter('timeOffTypeId', index) as string;
  body.amount = this.getNodeParameter('amount', index) as string;
  body.note = this.getNodeParameter('note', index) as string;

  const uri = `https://api.bamboohr.com/api/gateway.php/${companyName}/v1/${endPoint}/${employeeId}/time_off/balance_adjustment`;

  const responseData = await apiRequest.call(this, requestMethod, uri, body);

  return this.helpers.returnJsonArray({ statusCode: responseData.statusCode, statusMessage: responseData.statusMessage });
}