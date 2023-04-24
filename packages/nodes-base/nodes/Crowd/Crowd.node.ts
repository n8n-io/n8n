import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { allProperties } from './descriptions';
import { callApi } from './GenericFunctions';

export class Crowd implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Crowd.dev Node',
		name: 'crowdNode',
		icon: 'file:crowd.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Crowd.dev - An open-source suite of community and data tools built to unlock community-led growth for developer tools.',
		defaults: {
			name: 'Crowd Node',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'crowdApi',
				required: true,
			},
		],
		properties: allProperties,
	};

	// The function below is responsible for actually doing whatever this node
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const result = await callApi(this, itemIndex, resource, operation);
				if (result === undefined) {
					returnData.push({ json: { result: 'success' } });
				}
				else if (result.constructor === Array) {
					result.forEach(i => returnData.push({ json: result }))
				} else {
					returnData.push({ json: result });
				}
			} catch (error) {
				// This node should never fail but we want to showcase how
				// to handle errors.
				if (this.continueOnFail()) {
					items.push({ json: this.getInputData(itemIndex)[0].json, error, pairedItem: itemIndex });
				} else {
					// Adding `itemIndex` allows other workflows to handle this error
					if (error.context) {
						// If the error thrown already contains the context property,
						// only append the itemIndex
						error.context.itemIndex = itemIndex;
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
		}
		return [returnData as INodeExecutionData[]];
	}
}
