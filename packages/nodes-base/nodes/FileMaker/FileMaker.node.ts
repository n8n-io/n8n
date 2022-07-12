/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import {IExecuteFunctions} from 'n8n-core';
import {
	ILoadOptionsFunctions,
	INodeExecutionData, INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';


import {OptionsWithUri} from 'request';
import {
	getFields,
	getPortals,
	getScripts,
	getToken,
	layoutsApiRequest,
	logout,
	parseFields,
	parsePortals,
	parseQuery,
	parseScripts,
	parseSort,
} from './GenericFunctions';

export class FileMaker implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'FileMaker',
		name: 'filemaker',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:filemaker.png',
		group: ['input'],
		version: 1,
		description: 'Retrieve data from the FileMaker data API',
		defaults: {
			name: 'FileMaker',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'fileMaker',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Action',
				name: 'action',
				type: 'options',
				default: 'record',
				options: [
					/*{
						name: 'Login',
						value: 'login',
					},
					{
						name: 'Logout',
						value: 'logout',
					},*/
					{
						name: 'Create Record',
						value: 'create',
					},
					{
						name: 'Delete Record',
						value: 'delete',
					},
					{
						name: 'Duplicate Record',
						value: 'duplicate',
					},
					{
						name: 'Edit Record',
						value: 'edit',
					},
					{
						name: 'Find Records',
						value: 'find',
					},
					{
						name: 'Get Records',
						value: 'records',
					},
					{
						name: 'Get Records By ID',
						value: 'record',
					},
					{
						name: 'Perform Script',
						value: 'performscript',
					},
				],
			},

			// ----------------------------------
			//         shared
			// ----------------------------------
			{
				displayName: 'Layout Name or ID',
				name: 'layout',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getLayouts',
				},
				options: [],
				default: '',
				required: true,
				displayOptions: {},
				placeholder: 'Layout Name',
				description: 'FileMaker Layout Name. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
			},
			{
				displayName: 'Record ID',
				name: 'recid',
				type: 'number',
				default: '',
				required: true,
				displayOptions: {
					show: {
						action: [
							'record',
							'edit',
							'delete',
							'duplicate',
						],
					},
				},
				placeholder: 'Record ID',
				description: 'Internal Record ID returned by get (recordid)',
			},
			{
				displayName: 'Offset',
				name: 'offset',
				placeholder: '0',
				description: 'The record number of the first record in the range of records',
				type: 'number',
				default: 1,
				displayOptions: {
					show: {
						action: [
							'find',
							'records',
						],
					},
				},
			},
			{
				displayName: 'Limit',
				name: 'limit',
				placeholder: '100',
				description: 'Max number of results to return',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 100,
				displayOptions: {
					show: {
						action: [
							'find',
							'records',
						],
					},
				},
			},
			{
				displayName: 'Get Portals',
				name: 'getPortals',
				type: 'boolean',
				default: false,
				description: 'Whether to get portal data as well',
				displayOptions: {
					show: {
						action: [
							'record',
							'records',
							'find',
						],
					},
				},
			},
			{
				displayName: 'Portals Name or ID',
				name: 'portals',
				type: 'options',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add portal',
					loadOptionsMethod: 'getPortals',
				},
				options: [],
				default: [],
				displayOptions: {
					show: {
						action: [
							'record',
							'records',
							'find',
						],
						getPortals: [
							true,
						],
					},
				},
				placeholder: 'Portals',
				description: 'The portal result set to return. Use the portal object name or portal table name. If this parameter is omitted, the API will return all portal objects and records in the layout. For best performance, pass the portal object name or portal table name. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
			},
			// ----------------------------------
			//         find/records
			// ----------------------------------
			{
				displayName: 'Response Layout Name or ID',
				name: 'responseLayout',
				type: 'options',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getResponseLayouts',
				},
				options: [],
				default: '',
				displayOptions: {
					show: {
						action: [
							'find',
						],
					},
				},
			},
			{
				displayName: 'Queries',
				name: 'queries',
				placeholder: 'Add query',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						action: [
							'find',
						],
					},
				},
				default: {},
				options: [
					{
						name: 'query',
						displayName: 'Query',
						values: [
							{
								displayName: 'Fields',
								name: 'fields',
								placeholder: 'Add field',
								type: 'fixedCollection',
								default: {},
								typeOptions: {
									multipleValues: true,
								},
								options: [{
									name: 'field',
									displayName: 'Field',
									values: [
										{
											displayName: 'Field Name or ID',
											name: 'name',
											type: 'options',
											default: '',
											typeOptions: {
												loadOptionsMethod: 'getFields',
											},
											options: [],
											description: 'Search Field. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
										},
										{
											displayName: 'Value',
											name: 'value',
											type: 'string',
											default: '',
											description: 'Value to search',
										},
									],
								},
								],
								description: 'Field Name',
							},
							{
								displayName: 'Omit',
								name: 'omit',
								type: 'boolean',
								default: false,
							},
						],
					},
				],
			},
			{
				displayName: 'Sort Data?',
				name: 'setSort',
				type: 'boolean',
				default: false,
				description: 'Whether to sort data',
				displayOptions: {
					show: {
						action: [
							'find',
							'record',
							'records',
						],
					},
				},
			},
			{
				displayName: 'Sort',
				name: 'sortParametersUi',
				placeholder: 'Add Sort Rules',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						setSort: [
							true,
						],
						action: [
							'find',
							'records',
						],
					},
				},
				description: 'Sort rules',
				default: {},
				options: [
					{
						name: 'rules',
						displayName: 'Rules',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'name',
								type: 'options',
								default: '',
								typeOptions: {
									loadOptionsMethod: 'getFields',
								},
								options: [],
								description: 'Field Name. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
							},
							{
								displayName: 'Order',
								name: 'value',
								type: 'options',
								default: 'ascend',
								options: [
									{
										name: 'Ascend',
										value: 'ascend',
									},
									{
										name: 'Descend',
										value: 'descend',
									},
								],
								description: 'Sort order',
							},
						],
					},
				],
			},
			{
				displayName: 'Before Find Script',
				name: 'setScriptBefore',
				type: 'boolean',
				default: false,
				description: 'Whether to define a script to be run before the action specified by the API call and after the subsequent sort',
				displayOptions: {
					show: {
						action: [
							'find',
							'record',
							'records',
						],
					},
				},
			},
			{
				displayName: 'Script Name or ID',
				name: 'scriptBefore',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getScripts',
				},
				options: [],
				default: '',
				required: true,
				displayOptions: {
					show: {
						action: [
							'find',
							'record',
							'records',
						],
						setScriptBefore: [
							true,
						],
					},
				},
				placeholder: 'Script Name',
				description: 'The name of the FileMaker script to be run after the action specified by the API call and after the subsequent sort. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
			},
			{
				displayName: 'Script Parameter',
				name: 'scriptBeforeParam',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						action: [
							'find',
							'record',
							'records',
						],
						setScriptBefore: [
							true,
						],
					},
				},
				placeholder: 'Script Parameters',
				description: 'A parameter for the FileMaker script',
			},
			{
				displayName: 'Before Sort Script',
				name: 'setScriptSort',
				type: 'boolean',
				default: false,
				description: 'Whether to define a script to be run after the action specified by the API call but before the subsequent sort',
				displayOptions: {
					show: {
						action: [
							'find',
							'record',
							'records',
						],
					},
				},
			},
			{
				displayName: 'Script Name or ID',
				name: 'scriptSort',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getScripts',
				},
				options: [],
				default: '',
				required: true,
				displayOptions: {
					show: {
						action: [
							'find',
							'record',
							'records',
						],
						setScriptSort: [
							true,
						],
					},
				},
				placeholder: 'Script Name',
				description: 'The name of the FileMaker script to be run after the action specified by the API call but before the subsequent sort. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
			},
			{
				displayName: 'Script Parameter',
				name: 'scriptSortParam',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						action: [
							'find',
							'record',
							'records',
						],
						setScriptSort: [
							true,
						],
					},
				},
				placeholder: 'Script Parameters',
				description: 'A parameter for the FileMaker script',
			},
			{
				displayName: 'After Sort Script',
				name: 'setScriptAfter',
				type: 'boolean',
				default: false,
				description: 'Whether to define a script to be run after the action specified by the API call but before the subsequent sort',
				displayOptions: {
					show: {
						action: [
							'find',
							'record',
							'records',
						],
					},
				},
			},
			{
				displayName: 'Script Name or ID',
				name: 'scriptAfter',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getScripts',
				},
				options: [],
				default: '',
				required: true,
				displayOptions: {
					show: {
						action: [
							'find',
							'record',
							'records',
						],
						setScriptAfter: [
							true,
						],
					},
				},
				placeholder: 'Script Name',
				description: 'The name of the FileMaker script to be run after the action specified by the API call and after the subsequent sort. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
			},
			{
				displayName: 'Script Parameter',
				name: 'scriptAfterParam',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						action: [
							'find',
							'record',
							'records',
						],
						setScriptAfter: [
							true,
						],
					},
				},
				placeholder: 'Script Parameters',
				description: 'A parameter for the FileMaker script',
			},
			// ----------------------------------
			//         create/edit
			// ----------------------------------
			/*{
				displayName: 'fieldData',
				name: 'fieldData',
				placeholder: '{"field1": "value", "field2": "value", ...}',
				description: 'Additional fields to add.',
				type: 'string',
				default: '{}',
				displayOptions: {
					show: {
						action: [
							'create',
							'edit',
						],
					},
				}
			},*/
			{
				displayName: 'Mod ID',
				name: 'modId',
				description: 'The last modification ID. When you use modId, a record is edited only when the modId matches.',
				type: 'number',
				default: '',
				displayOptions: {
					show: {
						action: [
							'edit',
						],
					},
				},
			},
			{
				displayName: 'Fields',
				name: 'fieldsParametersUi',
				placeholder: 'Add field',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						action: [
							'create',
							'edit',
						],
					},
				},
				description: 'Fields to define',
				default: {},
				options: [
					{
						name: 'fields',
						displayName: 'Fields',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'name',
								type: 'options',
								default: '',
								typeOptions: {
									loadOptionsMethod: 'getFields',
								},
								options: [],
								description: 'Field Name. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			// ----------------------------------
			//         performscript
			// ----------------------------------
			{
				displayName: 'Script Name or ID',
				name: 'script',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getScripts',
				},
				options: [],
				default: '',
				required: true,
				displayOptions: {
					show: {
						action: [
							'performscript',
						],
					},
				},
				placeholder: 'Script Name',
				description: 'The name of the FileMaker script to be run. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
			},
			{
				displayName: 'Script Parameter',
				name: 'scriptParam',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						action: [
							'performscript',
						],
					},
				},
				placeholder: 'Script Parameters',
				description: 'A parameter for the FileMaker script',
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the available topics to display them to user so that he can
			// select them easily
			async getLayouts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				let returnData: INodePropertyOptions[];

				try {
					returnData = await layoutsApiRequest.call(this);
				} catch (error) {
					throw new NodeOperationError(this.getNode(), `FileMaker Error: ${error}`);
				}

				return returnData;
			},
			async getResponseLayouts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				returnData.push({
					name: 'Use main layout',
					value: '',
				});

				let layouts;
				try {
					layouts = await layoutsApiRequest.call(this);
				} catch (error) {
					throw new NodeOperationError(this.getNode(), `FileMaker Error: ${error}`);
				}
				for (const layout of layouts) {
					returnData.push({
						name: layout.name,
						value: layout.name,
					});
				}
				return returnData;
			},

			async getFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				let fields;
				try {
					fields = await getFields.call(this);
				} catch (error) {
					throw new NodeOperationError(this.getNode(), `FileMaker Error: ${error}`);
				}
				for (const field of fields) {
					returnData.push({
						name: field.name,
						value: field.name,
					});
				}
				return returnData;
			},

			async getScripts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				let scripts;
				try {
					scripts = await getScripts.call(this);
				} catch (error) {
					throw new NodeOperationError(this.getNode(), `FileMaker Error: ${error}`);
				}
				for (const script of scripts) {
					if (!script.isFolder) {
						returnData.push({
							name: script.name,
							value: script.name,
						});
					}
				}
				return returnData;
			},

			async getPortals(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				let portals;
				try {
					portals = await getPortals.call(this);
				} catch (error) {
					throw new NodeOperationError(this.getNode(), `FileMaker Error: ${error}`);
				}
				Object.keys(portals).forEach((portal) => {
					returnData.push({
						name: portal,
						value: portal,
					});
				});

				return returnData;
			},
		},
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('fileMaker');

		let token;
		try {
			token = await getToken.call(this);
		} catch (error) {
			throw new NodeOperationError(this.getNode(), `Login fail: ${error}`);
		}

		let requestOptions: OptionsWithUri;

		const host = credentials.host as string;
		const database = credentials.db as string;

		const url = `https://${host}/fmi/data/v1`;

		const action = this.getNodeParameter('action', 0) as string;

		try {
			for (let i = 0; i < items.length; i++) {
				// Reset all values
				requestOptions = {
					uri: '',
					headers: {
						'Authorization': `Bearer ${token}`,
					},
					method: 'GET',
					json: true,
				};

				const layout = this.getNodeParameter('layout', i) as string;

				if (action === 'record') {
					const recid = this.getNodeParameter('recid', i) as string;
					requestOptions.uri = url + `/databases/${database}/layouts/${layout}/records/${recid}`;
					requestOptions.qs = {
						'portal': JSON.stringify(parsePortals.call(this, i)),
						...parseScripts.call(this, i),
					};
				} else if (action === 'records') {
					requestOptions.uri = url + `/databases/${database}/layouts/${layout}/records`;
					requestOptions.qs = {
						'_offset': this.getNodeParameter('offset', i),
						'_limit': this.getNodeParameter('limit', i),
						'portal': JSON.stringify(parsePortals.call(this, i)),
						...parseScripts.call(this, i),
					};
					const sort = parseSort.call(this, i);
					if (sort) {
						requestOptions.body.sort = sort;
					}
				} else if (action === 'find') {
					requestOptions.uri = url + `/databases/${database}/layouts/${layout}/_find`;
					requestOptions.method = 'POST';
					requestOptions.body = {
						'query': parseQuery.call(this, i),
						'offset': this.getNodeParameter('offset', i),
						'limit': this.getNodeParameter('limit', i),
						'layout.response': this.getNodeParameter('responseLayout', i),
						...parseScripts.call(this, i),
					};
					const sort = parseSort.call(this, i);
					if (sort) {
						requestOptions.body.sort = sort;
					}
				} else if (action === 'create') {
					requestOptions.uri = url + `/databases/${database}/layouts/${layout}/records`;
					requestOptions.method = 'POST';
					requestOptions.headers!['Content-Type'] = 'application/json';

					//TODO: handle portalData
					requestOptions.body = {
						fieldData: {...parseFields.call(this, i)},
						portalData: {},
						...parseScripts.call(this, i),
					};
				} else if (action === 'edit') {
					const recid = this.getNodeParameter('recid', i) as string;
					requestOptions.uri = url + `/databases/${database}/layouts/${layout}/records/${recid}`;
					requestOptions.method = 'PATCH';
					requestOptions.headers!['Content-Type'] = 'application/json';

					//TODO: handle portalData
					requestOptions.body = {
						fieldData: {...parseFields.call(this, i)},
						portalData: {},
						...parseScripts.call(this, i),
					};
				} else if (action === 'performscript') {
					const scriptName = this.getNodeParameter('script', i) as string;
					requestOptions.uri = url + `/databases/${database}/layouts/${layout}/script/${scriptName}`;
					requestOptions.qs = {
						'script.param': this.getNodeParameter('scriptParam', i),
					};
				} else if (action === 'duplicate') {
					const recid = this.getNodeParameter('recid', i) as string;
					requestOptions.uri = url + `/databases/${database}/layouts/${layout}/records/${recid}`;
					requestOptions.method = 'POST';
					requestOptions.headers!['Content-Type'] = 'application/json';
					requestOptions.qs = {
						...parseScripts.call(this, i),
					};
				} else if (action === 'delete') {
					const recid = this.getNodeParameter('recid', i) as string;
					requestOptions.uri = url + `/databases/${database}/layouts/${layout}/records/${recid}`;
					requestOptions.method = 'DELETE';
					requestOptions.qs = {
						...parseScripts.call(this, i),
					};
				} else {
					throw new NodeOperationError(this.getNode(), `The action "${action}" is not implemented yet!`, { itemIndex: i });
				}

				// Now that the options are all set make the actual http request
				let response;
				try {
					response = await this.helpers.request(requestOptions);
				} catch (error) {
					response = error.response.body;
				}

				if (typeof response === 'string') {
					throw new NodeOperationError(this.getNode(), 'Response body is not valid JSON. Change "Response Format" to "String"', { itemIndex: i });
				}
				returnData.push({json: response});
			}
		} catch (error) {
			await logout.call(this, token);

			if (error.node) {
				throw error;
			}

			throw new NodeOperationError(this.getNode(), `The action "${error.message}" is not implemented yet!`);
		}

		return this.prepareOutputData(returnData);
	}
}
