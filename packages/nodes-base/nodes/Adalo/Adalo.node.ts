import {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import {operationFields} from './OperationDescription';
import {FieldsUiValues} from './types';

export class Adalo implements INodeType {
	async presendCreateUpdate (this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions>  {
		const dataToSend = this.getNodeParameter('dataToSend', 0) as 'defineBelow' | 'autoMapInputData';

		requestOptions.body = {};

		if (dataToSend === 'autoMapInputData') {
			const inputData = this.getInputData();
			const rawInputsToIgnore = this.getNodeParameter('inputsToIgnore') as string;

			const inputKeysToIgnore = rawInputsToIgnore.split(',').map(c => c.trim());
			const inputKeys = Object.keys(inputData.json)
				.filter((key) => !inputKeysToIgnore.includes(key));

			for (const key of inputKeys) {
				(requestOptions.body as IDataObject)[key] = inputData.json[key];
			}
		} else {
			const fields = this.getNodeParameter('fieldsUi.fieldValues') as FieldsUiValues;

			for (const field of fields) {
				(requestOptions.body as IDataObject)[field.fieldId] = field.fieldValue;
			}
		}

		return requestOptions;
	}

	description: INodeTypeDescription = {
		displayName: 'Adalo',
		name: 'adalo',
		icon: 'file:adalo.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Adalo API',
		defaults: {
			name: 'Adalo',
			color: '#4f44d7',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'adaloApi',
				required: true,
				// @TODO FInd a proper way to test credentials
				// testedBy: {
				// 	request: {
				// 		method: 'GET',
				// 		url: '/',
				// 	},
				// 	rules: [
				// 		{
				// 			type: 'responseCode',
				// 			properties: {
				// 				value: 403,
				// 				message: 'Does not exist.',
				// 			},
				// 		},
				// 	],
				// },
			},
		],
		requestDefaults: {
			baseURL: '=https://api.adalo.com/v0/apps/{{$credentials.appId}}',
		},
		requestOperations: {
			pagination: {
				type: 'offset',
				properties: {
					limitParameter: 'limit',
					offsetParameter: 'offset',
					pageSize: 100,
					rootProperty: '',
					type: 'query',
				},
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'string',
				required: true,
				default: '',
				description: 'Your Adalo collection ID',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a row',
						routing: {
							send: {
								preSend: [
									this.presendCreateUpdate,
								],
							},
							request: {
								method: 'POST',
								url: '=/collections/{{$parameter["resource"]}}',
							},
						},
						action: 'Create a row',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a row',
						routing: {
							request: {
								method: 'DELETE',
								url: '=/collections/{{$parameter["resource"]}}/{{$parameter["rowId"]}}',
							},
							output: {
								postReceive: [
									{
										type: 'set',
										properties: {
											value: '={{ { "success": true } }}',
										},
									},
								],
							},
						},
						action: 'Delete a row',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve a row',
						routing: {
							request: {
								method: 'GET',
								url: '=/collections/{{$parameter["resource"]}}/{{$parameter["rowId"]}}',
							},
						},
						action: 'Retrieve a row',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Retrieve all rows',
						routing: {
							request: {
								method: 'GET',
								url: '=/collections/{{$parameter["resource"]}}',
							},
							output: {
								postReceive: [
									async function (this: IExecuteSingleFunctions, items: INodeExecutionData[], response: IN8nHttpFullResponse,): Promise<INodeExecutionData[]> {
										const { records } = response.body as { records: IDataObject[] };

										return [...records.map((json) => ({ json }))];
									},
								],
							},
						},
						action: 'Retrieve all rows',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a row',
						routing: {
							send: {
								preSend: [
									this.presendCreateUpdate,
								],
							},
							request: {
								method: 'PUT',
								url: '=/collections/{{$parameter["resource"]}}/{{$parameter["rowId"]}}',
							},
						},
						action: 'Update a row',
					},
				],
				default: 'getAll',
			},
			...operationFields,
		],
	};

}
