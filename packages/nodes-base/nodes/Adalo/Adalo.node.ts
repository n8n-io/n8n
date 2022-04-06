import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';


import {FieldsUiValues, Operation} from './types';
import {adaloApiRequest} from './GenericFunctions';
import {operationFields} from './OperationDescription';

/**
 * The Adalo API Key is available on a per-app basis, providing a CRUD REST API
 * to interact with any collection defined in the application
 *
 * @docs https://help.adalo.com/integrations/the-adalo-api/collections
 */

export class Adalo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Adalo',
		name: 'adalo',
		icon: 'file:adalo.png',
		group: ['transform'],
		version: 1,
		description: 'Consume the Adalo API',
		defaults: {
			name: 'Adalo',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'adaloApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Collection ID',
				name: 'collectionId',
				type: 'string',
				default: '',
				required: true,
				description: 'Your Adalo collection ID',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a row',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a row',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve a row',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Retrieve all rows',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a row',
					},
				],
				default: 'getAll',
				description: 'Operation to perform',
			},
			...operationFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const body: IDataObject = {};
		const qs: IDataObject = {};
		const returnData: IDataObject[] = [];

		const collectionId = this.getNodeParameter('collectionId', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as Operation;
		let endpoint = `/collections/${collectionId}`;

		for (let i = 0; i < items.length; i++) {
			if (['get', 'update', 'delete'].includes(operation)) {
				const elementId = this.getNodeParameter('elementId', i) as string;
				endpoint += `/${elementId}`;
			}

			try {
				if (operation === 'getAll') {

					/**
					 * getAll
					 */

					const limit = this.getNodeParameter('limit', 0) as number;
					const offset = this.getNodeParameter('offset', 0) as number;

					if (limit) {
						qs.limit = limit;
					}

					if (offset) {
						qs.offset = offset;
					}

					const { records } = await adaloApiRequest.call(this, 'GET', endpoint, body, qs);

					returnData.push(...records);
				} else if (operation === 'get') {

					/**
					 * get
					 */

					const record = await adaloApiRequest.call(this, 'GET', endpoint, body, qs);

					returnData.push(record);
				} else if (operation === 'create' || operation === 'update') {

					/**
					 * create / update
					 */

					const dataToSend = this.getNodeParameter('dataToSend', 0) as 'defineBelow' | 'autoMapInputData';
					const method = operation === 'create' ? 'POST' : 'PUT';
					const body: IDataObject = {};

					if (dataToSend === 'autoMapInputData') {
						const incomingKeys = Object.keys(items[i].json);
						const rawInputsToIgnore = this.getNodeParameter('inputsToIgnore', i) as string;
						const inputsToIgnore = rawInputsToIgnore.split(',').map(c => c.trim());

						for (const key of incomingKeys) {
							if (inputsToIgnore.includes(key)) continue;

							body[key] = items[i].json[key];
						}
					} else {
						const fields = this.getNodeParameter('fieldsUi.fieldValues', i, []) as FieldsUiValues;
						for (const field of fields) {
							body[field.fieldId] = field.fieldValue;
						}
					}

					const updatedRecord = await adaloApiRequest.call(this, method, endpoint, body, qs);

					returnData.push(updatedRecord);
				} else if (operation === 'delete') {

					/**
					 * delete
					 */

					await adaloApiRequest.call(this, 'DELETE', endpoint, {}, {});

					returnData.push({ success: true });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}

				throw error;
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
