import { IExecuteFunctions } from 'n8n-core';

import { IDataObject, INodeExecutionData } from 'n8n-workflow';

import { apiRequest } from '../../../transport';

import moment from 'moment';

import { capitalCase } from 'change-case';

export async function create(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const body: IDataObject = {};
	const requestMethod = 'POST';
	const endpoint = 'employees';

	//body parameters
	body.firstName = this.getNodeParameter('firstName', index) as string;
	body.lastName = this.getNodeParameter('lastName', index) as string;

	const additionalFields = this.getNodeParameter('additionalFields', index);
	const synced = this.getNodeParameter('synced', index) as boolean;

	if (synced) {
		Object.assign(body, {
			address: this.getNodeParameter('address.value', index, {}) as IDataObject,
		});
		Object.assign(body, {
			payRate: this.getNodeParameter('payRate.value', index, {}) as IDataObject,
		});
		body.department = this.getNodeParameter('department', index) as string;
		body.dateOfBirth = this.getNodeParameter('dateOfBirth', index);
		body.division = this.getNodeParameter('division', index) as string;
		body.employeeNumber = this.getNodeParameter('employeeNumber', index) as string;
		body.exempt = this.getNodeParameter('exempt', index) as string;
		body.gender = this.getNodeParameter('gender', index) as string;
		body.hireDate = this.getNodeParameter('hireDate', index) as string;
		body.location = this.getNodeParameter('location', index) as string;
		body.maritalStatus = this.getNodeParameter('maritalStatus', index) as string;
		body.mobilePhone = this.getNodeParameter('mobilePhone', index) as string;
		body.paidPer = this.getNodeParameter('paidPer', index) as string;
		body.payType = this.getNodeParameter('payType', index) as string;
		body.preferredName = this.getNodeParameter('preferredName', index) as string;
		body.ssn = this.getNodeParameter('ssn', index) as string;
	} else {
		Object.assign(body, {
			address: this.getNodeParameter('additionalFields.address.value', index, {}) as IDataObject,
		});
		Object.assign(body, {
			payRate: this.getNodeParameter('additionalFields.payRate.value', index, {}) as IDataObject,
		});
		delete additionalFields.address;
		delete additionalFields.payRate;
	}

	Object.assign(body, additionalFields);

	if (body.gender) {
		body.gender = capitalCase(body.gender as string);
	}

	if (body.dateOfBirth) {
		body.dateOfBirth = moment(body.dateOfBirth as string).format('YYYY-MM-DD');
	}

	if (body.exempt) {
		body.exempt = capitalCase(body.exempt as string);
	}

	if (body.hireDate) {
		body.hireDate = moment(body.hireDate as string).format('YYYY-MM-DD');
	}

	if (body.maritalStatus) {
		body.maritalStatus = capitalCase(body.maritalStatus as string);
	}

	if (body.payType) {
		body.payType = capitalCase(body.payType as string);
	}

	if (body.paidPer) {
		body.paidPer = capitalCase(body.paidPer as string);
	}

	if (!Object.keys(body.payRate as IDataObject).length) {
		delete body.payRate;
	}

	//response
	const responseData = await apiRequest.call(
		this,
		requestMethod,
		endpoint,
		body,
		{},
		{ resolveWithFullResponse: true },
	);

	//obtain employeeID
	const rawEmployeeId = responseData.headers.location.lastIndexOf('/');
	const employeeId = responseData.headers.location.substring(rawEmployeeId + 1);

	//return
	return this.helpers.returnJsonArray({ id: employeeId });
}
