import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	INodeExecutionData,
} from 'n8n-workflow';

import * as employees from './employees';
import * as employeeFile from './employeeFile';
import * as companyFile from './companyFile';
import * as reports from './reports';
import * as tabularData from './tabularData';
import * as timeOff from './timeOff';

import { BambooHR } from './Interfaces';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const operationResult: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		const resource = this.getNodeParameter<BambooHR>('resource', i);
		const operation = this.getNodeParameter('operation', i);

		const bamboohr = {
			resource,
			operation,
		} as BambooHR;

		try {
			if (bamboohr.resource === 'employees') {
				operationResult.push(...await employees[bamboohr.operation].execute.call(this, i));
			} else if (bamboohr.resource === 'employeeFile') {
				//@ts-ignore
				operationResult.push(...await employeeFile[bamboohr.operation].execute.call(this, i));
			} else if (bamboohr.resource === 'companyFile') {
				//@ts-ignore
				operationResult.push(...await companyFile[bamboohr.operation].execute.call(this, i));
			} else if (bamboohr.resource === 'reports') {
				operationResult.push(...await reports[bamboohr.operation].execute.call(this, i));
			} else if (bamboohr.resource === 'tabularData') {
				operationResult.push(...await tabularData[bamboohr.operation].execute.call(this, i));
			} else if (bamboohr.resource === 'timeOff') {
				operationResult.push(...await timeOff[bamboohr.operation].execute.call(this, i));
			}
		} catch (err) {
			if (this.continueOnFail()) {
				operationResult.push({ json: this.getInputData(i)[0].json, error: err });
			} else {
				throw err;
			}
		}
	}

	return operationResult;
}
