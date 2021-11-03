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

export async function getEmployeePolicies(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
  var body = {} as IDataObject;
  
  const requestMethod = 'GET';
  const endPoint = 'employees';
  const companyName = this.getNodeParameter('companyName', index) as string;
  const employeeId = this.getNodeParameter('employeeId', index) as string;

  const uri = `https://api.bamboohr.com/api/gateway.php/${companyName}/v1/${endPoint}/${employeeId}/time_off/policies`;

  const responseData = await apiRequest.call(this, requestMethod, uri, body);

  return this.helpers.returnJsonArray(responseData);
}