import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { AirtableType } from './node.type';

import * as record from './record/Record.resource';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	let returnData: INodeExecutionData[] = [];

	const items = this.getInputData();
	const resource = this.getNodeParameter<AirtableType>('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	const airtableNodeData = {
		resource,
		operation,
	} as AirtableType;

	try {
		switch (airtableNodeData.resource) {
			case 'record':
				const base = this.getNodeParameter('base', 0, undefined, {
					extractValue: true,
				}) as string;

				const table = encodeURI(
					this.getNodeParameter('table', 0, undefined, {
						extractValue: true,
					}) as string,
				);
				returnData = await record[airtableNodeData.operation].execute.call(
					this,
					items,
					base,
					table,
				);
				break;
			default:
				throw new NodeOperationError(
					this.getNode(),
					`The operation "${operation}" is not supported!`,
				);
		}
	} catch (error) {
		throw error;
	}

	return this.prepareOutputData(returnData);
}
