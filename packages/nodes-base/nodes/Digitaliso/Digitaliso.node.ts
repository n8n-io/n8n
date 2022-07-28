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
	OptionsWithUri,
} from 'request';


export class Digitaliso implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Digitaliso',
		name: 'digitaliso',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:digitaliso.png',
		group: ['transform'],
		version: 1,
		description: 'Consume Digitaliso API.',
		defaults: {
			name: 'Digitaliso',
			color: '#1A82e2',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'digitalisoApi',
				required: true,
			},
		],
		properties: [
			// ----------------------------------
			//         Resources
			// ----------------------------------
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Item',
						value: 'item',
					},
				],
				default: 'item',
				required: true,
			},

			// ----------------------------------
			//         Operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: [
							'item',
						],
					},
				},
				options: [
					{
						name: 'Create Item',
						value: 'post',
						description: 'Create an item',
						action: 'Create an item',
					},
					{
						name: 'Delete Item',
						value: 'delete',
						description: 'Delete an item',
						action: 'Delete an item',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Get all items',
						action: 'Get all items',
					},
					{
						name: 'Get Item',
						value: 'get',
						description: 'Get an item',
						action: 'Get an item',
					},
					{
						name: 'Update Item',
						value: 'put',
						description: 'Update an item',
						action: 'Update an item',
					},
				],
				default: 'getAll',
			},

			// ----------------------------------
			//         Fields
			// ----------------------------------
			{
				displayName: 'Items',
				name: 'items',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'item',
						],
					},
				},
				default:'',
				description:'Items to run the API on',
			},
			{
				displayName: 'Full Response',
				name: 'fullResponse',
				type: 'boolean',
				default: false,
				description: 'Whether to return the full reponse data instead of only the body',
				displayOptions: {
					show: {
						resource: [
							'item',
						],
						operation: [
							'getAll',
						],
					},
				},
			},
			{
				displayName: 'Per Page',
				name: 'perPage',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 20,
				description: 'Max number of results to return (if 0 return all)',
				displayOptions: {
					show: {
						resource: [
							'item',
						],
						operation: [
							'getAll',
						],
					},
				},
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 1,
				description: 'Page number',
				displayOptions: {
					show: {
						resource: [
							'item',
						],
						operation: [
							'getAll',
						],
					},
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'number',
				default: 1,
				description: 'Item ID',
				displayOptions: {
					show: {
						resource: [
							'item',
						],
						operation: [
							'get',
							'put',
							'delete',
						],
					},
				},
			},

			// ----------------------------------
			//         Body Parameter
			// ----------------------------------
			{
				displayName: 'Body Parameters',
				name: 'bodyParametersUi',
				placeholder: 'Add Parameter',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						operation: [
							'post',
							'put',
						],
					},
				},
				description: 'The body parameter to send',
				default: {},
				options: [
					{
						name: 'parameter',
						displayName: 'Parameter',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Name of the parameter',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the parameter',
							},
						],
					},
				],
			},

			// ----------------------------------
			//         Query Parameter
			// ----------------------------------
			{
				displayName: 'Query Parameters',
				name: 'queryParametersUi',
				placeholder: 'Add Parameter',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						operation: [
							'getAll',
							'get',
						],
					},
				},
				description: 'The query parameter to send',
				default: {},
				options: [
					{
						name: 'parameter',
						displayName: 'Parameter',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Name of the parameter',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the parameter',
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		let responseData;
		let responseFullData;
		let responseAccessToken;
		const returnData = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let setUiParameter: IDataObject;

		const uiParameters: IDataObject = {
			bodyParametersUi: 'body',
			queryParametersUi: 'qs',
		};

		
		//Get credentials the user provided for this node
		const credentials = await this.getCredentials('digitalisoApi') as IDataObject;

		//Make http request according to doc Digitaliso to login
		try {
			const options: OptionsWithUri = {
				headers: {
					'Accept': 'application/json',
				},
				method: 'POST',
				body: {
					api_key: credentials.apiKey,
					company: credentials.company,
				},
				uri: `https://api.qsa.net/v1/user/login/`,
				json: true,
			};
	
			responseAccessToken = await this.helpers.request(options);
		}
		catch (error) {
			throw error;
		}
		
	
		if (resource === 'item') {

			// get items input and create endpoint
			const itms = this.getNodeParameter('items', 0) as string;
			let url = 'https://api.qsa.net/v1/' + itms + '/';
			let method = ''; 
			let fullResponse;

			switch (operation) {
				case 'getAll':
					method = 'GET';
					fullResponse = this.getNodeParameter('fullResponse', 0) as boolean;
					break;
				case 'get':
					url += 'view/';
					method = 'GET';
					break;
				case 'delete':
					url +=  'delete/';
					method = 'DELETE';
					break;
				case 'post':
					url +=  'create/';
					method = 'POST';
					break;
				case 'put':
					url +=  'update/';
					method = 'PUT';
					break;
				default:
					method = 'GET';
					fullResponse = this.getNodeParameter('fullResponse', 0) as boolean;
					break;
			}

			for (let i = 0; i < items.length; i++) {   
				try {
					let endpoint = '';
					let perPage;
					let page;
		
					switch (operation) {
						case 'getAll':
							perPage = this.getNodeParameter('perPage', i);
							page = this.getNodeParameter('page', i);
							endpoint = `${url}?per-page=${perPage}&page=${page}`;
							break;
						case 'get':
						case 'delete':
						case 'put':
							endpoint = `${url}?id=${this.getNodeParameter('id', i)}`;
							break;
						case 'post':
							endpoint = url;
						default:
							perPage = this.getNodeParameter('perPage', i);
							page = this.getNodeParameter('page', i);
							endpoint = `${url}?per-page=${perPage}&page=${page}`;
							break;
					}

							
					const requestOptions: OptionsWithUri = {
						headers: {
							'Accept': 'application/json',
							'Auth': `Access_Token ${responseAccessToken.access_token}`,
						},
						method,
						uri: endpoint,
						json: true,
						//  @ts-ignore
						resolveWithFullResponse: fullResponse,
					};

					// Paramters are defined in UI
					let optionName: string;
					for (const parameterName of Object.keys(uiParameters)) {
						setUiParameter = this.getNodeParameter(parameterName, i, {}) as IDataObject;
						optionName = uiParameters[parameterName] as string;
						if (setUiParameter.parameter !== undefined) {
							// @ts-ignore
							requestOptions[optionName] = {};
							for (const parameterData of setUiParameter!.parameter as IDataObject[]) {
								const parameterDataName = parameterData!.name as string;
								const newValue = parameterData!.value;
								if (optionName === 'qs') {
									const computeNewValue = (oldValue: unknown) => {
										if (typeof oldValue === 'string') {
											return [oldValue, newValue];
										} else if (Array.isArray(oldValue)) {
											return [...oldValue, newValue];
										} else {
											return newValue;
										}
									};
									requestOptions[optionName][parameterDataName] = computeNewValue(requestOptions[optionName][parameterDataName]);
								} else if (optionName === 'headers') {
									// @ts-ignore
									requestOptions[optionName][parameterDataName.toString().toLowerCase()] = newValue;
								} else {
									// @ts-ignore
									requestOptions[optionName][parameterDataName] = newValue;
								}
							}
						}
					}

					responseData = await this.helpers.request(requestOptions);

					if (operation === 'delete') {
						responseData = { success: true };
					}

					if (!fullResponse) {

						if (Array.isArray(responseData)) {
							returnData.push.apply(returnData, responseData as IDataObject[]);
						}
						else {
							returnData.push(responseData as IDataObject);
						}
					}
					else {
						responseFullData = { [itms]: responseData.body, 
							meta: {
								TotalRecord: parseInt(responseData.headers['x-pagination-total-count'], 10),
								TotalPages: parseInt(responseData.headers['x-pagination-page-count'], 10),
								CurrentPage: parseInt(responseData.headers['x-pagination-current-page'], 10),
							},
						};
						returnData.push(responseFullData as IDataObject);
					}

				}
				catch (error) {
					if (this.continueOnFail()) {
						returnData.push({ error: error.message });
						continue;
					}
					throw error;
				}
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
