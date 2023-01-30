import type { IExecuteFunctions } from 'n8n-core';

import type { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { apiRequest } from '../../../transport';

import moment from 'moment';

import { capitalCase } from 'change-case';

export async function update(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	let body: IDataObject = {};
	const requestMethod = 'POST';

	//meta data
	const id = this.getNodeParameter('employeeId', index) as string;

	//endpoint
	const endpoint = `employees/${id}`;

	//body parameters
	body = this.getNodeParameter('updateFields', index);

	const updateFields = this.getNodeParameter('updateFields', index);
	const synced = this.getNodeParameter('synced', index) as boolean;

	if (synced) {
		Object.assign(body, {
			address: this.getNodeParameter('address.value', index, {}) as IDataObject,
		});
		Object.assign(body, {
			payRate: this.getNodeParameter('payRate.value', index, {}) as IDataObject,
		});
		body.firstName = this.getNodeParameter('firstName', index) as string;
		body.lastName = this.getNodeParameter('lastName', index) as string;
		body.department = this.getNodeParameter('department', index) as string;
		body.dateOfBirth = this.getNodeParameter('dateOfBirth', index) as string;
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
		if (!Object.keys(updateFields).length) {
			throw new NodeOperationError(this.getNode(), 'At least one fields must be updated');
		}

		Object.assign(body, {
			address: this.getNodeParameter('updateFields.address.value', index, {}) as IDataObject,
		});
		Object.assign(body, {
			payRate: this.getNodeParameter('updateFields.payRate.value', index, {}) as IDataObject,
		});
		delete updateFields.address;
		delete updateFields.payRate;
	}

	Object.assign(body, updateFields);

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

	await apiRequest.call(this, requestMethod, endpoint, body);

	//return
	return this.helpers.returnJsonArray({ success: true });
}
