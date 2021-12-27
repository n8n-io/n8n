import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';

import { router } from './v1/actions/router';
import { versionDescription } from './v1/actions/versionDescription';

import {
	apiRequest,
} from './v1/transport';

export class BambooHR implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	methods = {
		loadOptions: {
			async getTimeOffTypeID(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const body = {} as IDataObject;
				const requestMethod = 'GET';
				const endPoint = 'meta/time_off/types';

				const response = await apiRequest.call(this, requestMethod, endPoint, body);
				const timeOffTypeIds = response.body.timeOffTypes;

				for (const item of timeOffTypeIds) {
					returnData.push({
						name: item.name,
						value: item.id,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions) {
		// Router returns INodeExecutionData[]
		// We need to output INodeExecutionData[][]
		// So we wrap in []
		return [await router.call(this)];
	}
}
