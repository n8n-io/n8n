import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	bubbleApiRequest,
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
			color: '#0205d3',
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
				options: [
					{
						name: 'Object',
						value: 'object',
					},
				],
				default: 'object',
				description: 'Resource to consume',
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

					const { pairs } = this.getNodeParameter('keysAndValues', i) as {
						pairs: [
							{ key: string; value: string; },
						],
					};

					const body = {} as IDataObject;

					pairs.forEach(pair => body[pair.key] = pair.value);

					responseData = await bubbleApiRequest.call(this, 'POST', `/obj/${typeName}`, {}, body);

				} else if (operation === 'delete') {

					// ----------------------------------
					//         object: delete
					// ----------------------------------

					const typeNameInput = this.getNodeParameter('typeName', i) as string;
					const typeName = typeNameInput.replace(/\s/g, '').toLowerCase();
					const objectId = this.getNodeParameter('objectId', i) as string;

					const endpoint = `/obj/${typeName}/${objectId}`;
					responseData = await bubbleApiRequest.call(this, 'DELETE', endpoint, {}, {});

				} else if (operation === 'get') {

					// ----------------------------------
					//         object: get
					// ----------------------------------

					const typeNameInput = this.getNodeParameter('typeName', i) as string;
					const typeName = typeNameInput.replace(/\s/g, '').toLowerCase();
					const objectId = this.getNodeParameter('objectId', i) as string;

					const endpoint = `/obj/${typeName}/${objectId}`;
					responseData = await bubbleApiRequest.call(this, 'GET', endpoint, {}, {});

				} else if (operation === 'getAll') {

					// ----------------------------------
					//         object: getAll
					// ----------------------------------

					// ...

				} else if (operation === 'update') {

					// ----------------------------------
					//         object: update
					// ----------------------------------

					const typeNameInput = this.getNodeParameter('typeName', i) as string;
					const typeName = typeNameInput.replace(/\s/g, '').toLowerCase();
					const objectId = this.getNodeParameter('objectId', i) as string;

					const body = {
						// ...
					} as IDataObject;

					const endpoint = `/obj/${typeName}/${objectId}`;
					responseData = await bubbleApiRequest.call(this, 'PATCH', endpoint, {}, body);

				}


			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);
		}

		return [this.helpers.returnJsonArray(returnData)];

	}
}
