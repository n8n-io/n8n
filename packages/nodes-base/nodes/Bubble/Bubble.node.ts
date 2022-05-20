import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	bubbleApiRequest,
	bubbleApiRequestAllItems,
	validateJSON,
} from './GenericFunctions';

import {
	objectFields,
	objectOperations,
} from './ObjectDescription';

export class Bubble implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Bubble',
		name: 'bubble',
		icon: 'file:bubble.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Bubble Data API',
		defaults: {
			name: 'Bubble',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'bubbleApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Object',
						value: 'object',
					},
				],
				default: 'object',
			},
			...objectOperations,
			...objectFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;
		const qs: IDataObject = {};
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {

			if (resource === 'object') {

				// *********************************************************************
				//                             object
				// *********************************************************************

				// https://bubble.io/reference#API

				if (operation === 'create') {

					// ----------------------------------
					//         object: create
					// ----------------------------------

					const typeNameInput = this.getNodeParameter('typeName', i) as string;
					const typeName = typeNameInput.replace(/\s/g, '').toLowerCase();

					const { property } = this.getNodeParameter('properties', i) as {
						property: [
							{ key: string; value: string; },
						],
					};

					const body = {} as IDataObject;

					property.forEach(data => body[data.key] = data.value);

					responseData = await bubbleApiRequest.call(this, 'POST', `/obj/${typeName}`, body, {});

				} else if (operation === 'delete') {

					// ----------------------------------
					//         object: delete
					// ----------------------------------

					const typeNameInput = this.getNodeParameter('typeName', i) as string;
					const typeName = typeNameInput.replace(/\s/g, '').toLowerCase();
					const objectId = this.getNodeParameter('objectId', i) as string;

					const endpoint = `/obj/${typeName}/${objectId}`;
					responseData = await bubbleApiRequest.call(this, 'DELETE', endpoint, {}, {});
					responseData = { success: true };

				} else if (operation === 'get') {

					// ----------------------------------
					//         object: get
					// ----------------------------------

					const typeNameInput = this.getNodeParameter('typeName', i) as string;
					const typeName = typeNameInput.replace(/\s/g, '').toLowerCase();
					const objectId = this.getNodeParameter('objectId', i) as string;

					const endpoint = `/obj/${typeName}/${objectId}`;
					responseData = await bubbleApiRequest.call(this, 'GET', endpoint, {}, {});
					responseData = responseData.response;

				} else if (operation === 'getAll') {

					// ----------------------------------
					//         object: getAll
					// ----------------------------------

					const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
					const typeNameInput = this.getNodeParameter('typeName', i) as string;
					const typeName = typeNameInput.replace(/\s/g, '').toLowerCase();

					const endpoint = `/obj/${typeName}`;

					const jsonParameters = this.getNodeParameter('jsonParameters', 0) as boolean;
					const options = this.getNodeParameter('options', i) as IDataObject;

					if (jsonParameters === false) {
						if (options.filters) {
							const { filter } = options.filters as IDataObject;
							qs.constraints = JSON.stringify(filter);
						}
					} else {
						const filter = options.filtersJson as string;
						const data = validateJSON(filter);
						if (data === undefined) {
							throw new NodeOperationError(this.getNode(), 'Filters must be a valid JSON');
						}
						qs.constraints = JSON.stringify(data);
					}

					if (options.sort) {
						const { sortValue } = options.sort as IDataObject;
						Object.assign(qs, sortValue);
					}

					if (returnAll === true) {
						responseData = await bubbleApiRequestAllItems.call(this, 'GET', endpoint, {}, qs);
					} else {
						qs.limit = this.getNodeParameter('limit', 0) as number;
						responseData = await bubbleApiRequest.call(this, 'GET', endpoint, {}, qs);
						responseData = responseData.response.results;
					}

				} else if (operation === 'update') {

					// ----------------------------------
					//         object: update
					// ----------------------------------

					const typeNameInput = this.getNodeParameter('typeName', i) as string;
					const typeName = typeNameInput.replace(/\s/g, '').toLowerCase();
					const objectId = this.getNodeParameter('objectId', i) as string;
					const endpoint = `/obj/${typeName}/${objectId}`;
					const { property } = this.getNodeParameter('properties', i) as {
						property: [
							{ key: string; value: string; },
						],
					};

					const body = {} as IDataObject;

					property.forEach(data => body[data.key] = data.value);
					responseData = await bubbleApiRequest.call(this, 'PATCH', endpoint, body, {});
					responseData = { sucess: true };
				}
			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);
		}

		return [this.helpers.returnJsonArray(returnData)];

	}
}
