import {IExecuteFunctions,} from 'n8n-core';

import {
	GenericValue,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { reportToSentry } from './ErrorReportFunctions';


export class SentryErrorReport implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sentry.io Error Report',
		name: 'sentryIoErrorReport',
		icon: 'file:sentryio.svg',
		group: ['output'],
		version: 1,
		description: 'Report Error into Sentry.io',
		defaults: {
			name: 'Sentry.io Error Report',
			color: '#362d59',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'sentryErrorApi', 
				required: true
			}
		],
		properties: [],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items:IDataObject[] = this.getInputData();
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++){
			// @ts-ignore
			let responseData = await reportToSentry.call(this, items[i].json);
			if (responseData){
				returnData.push({json: responseData});
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	};
};
