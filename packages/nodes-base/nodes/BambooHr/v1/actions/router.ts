import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import * as companyReport from './companyReport';
import * as employee from './employee';
import * as employeeDocument from './employeeDocument';
import * as file from './file';
import type { BambooHr } from './Interfaces';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	let operationResult: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		const resource = this.getNodeParameter<BambooHr>('resource', i);
		const operation = this.getNodeParameter('operation', i);

		const bamboohr = {
			resource,
			operation,
		} as BambooHr;

		if (bamboohr.operation === 'delete') {
			//@ts-ignore
			bamboohr.operation = 'del';
		}

		try {
			if (bamboohr.resource === 'employee') {
				operationResult = operationResult.concat(
					await employee[bamboohr.operation].execute.call(this, i),
				);
			} else if (bamboohr.resource === 'employeeDocument') {
				operationResult = operationResult.concat(
					//@ts-ignore
					await employeeDocument[bamboohr.operation].execute.call(this, i),
				);
			} else if (bamboohr.resource === 'file') {
				operationResult = operationResult.concat(
					//@ts-ignore
					await file[bamboohr.operation].execute.call(this, i),
				);
			} else if (bamboohr.resource === 'companyReport') {
				operationResult = operationResult.concat(
					//@ts-ignore
					await companyReport[bamboohr.operation].execute.call(this, i),
				);
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
