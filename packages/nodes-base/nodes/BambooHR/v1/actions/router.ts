import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	INodeExecutionData,
} from 'n8n-workflow';

import * as employees from './employees';
import { BambooHR } from './Interfaces';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const operationResult: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
    const resource = this.getNodeParameter<BambooHR>('resource', i);
		let operation = this.getNodeParameter('operation', i);
		
		const bamboohr = {
			resource,
			operation,
    } as BambooHR;

		try {
      if (bamboohr.resource === 'employees') {
        operationResult.push(...await employees[bamboohr.operation].execute.call(this, i));
			} 
		} catch (err) {
			if (this.continueOnFail()) {
				operationResult.push({json: this.getInputData(i)[0].json, error: err});
			} else {
				throw err;
			}
		}
	}

	return operationResult;
}
