import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	apiTemplateIoApiRequest,
	GroupsOfKeyValuePairs,
	loadResource,
	Overrides,
} from './GenericFunctions';

export class ApiTemplateIo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'APITemplate.io',
		name: 'apiTemplateIo',
		icon: 'file:apiTemplateIo.svg',
		group: ['transform'],
		version: 1,
		description: 'Consume the APITemplate.io API',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: {
			name: 'APITemplate.Io',
			color: '#FFD051',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'apiTemplateIoApi',
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
						name: 'Account',
						value: 'account',
					},
					{
						name: 'Image',
						value: 'image',
					},
					{
						name: 'PDF',
						value: 'pdf',
					},
				],
				default: 'image',
				description: 'Resource to consume',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				default: 'create',
				required: true,
				description: 'Operation to perform',
				options: [
					{
						name: 'Create',
						value: 'create',
					},
				],
				displayOptions: {
					show: {
						resource: [
							'image',
							'pdf',
						],
					},
				},
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				default: 'create',
				required: true,
				description: 'Operation to perform',
				options: [
					{
						name: 'Get',
						value: 'get',
					},
				],
				displayOptions: {
					show: {
						resource: [
							'account',
						],
					},
				},
			},
			{
				displayName: 'Template ID',
				name: 'templateId',
				type: 'options',
				required: true,
				default: '',
				description: 'ID of the image template to use.',
				typeOptions: {
					loadOptionsMethod: 'getImageTemplates',
				},
				displayOptions: {
					show: {
						resource: [
							'image',
						],
						operation: [
							'create',
						]
					},
				},
			},
			{
				displayName: 'Template ID',
				name: 'templateId',
				type: 'options',
				required: true,
				default: '',
				description: 'ID of the PDF template to use.',
				typeOptions: {
					loadOptionsMethod: 'getPdfTemplates',
				},
				displayOptions: {
					show: {
						resource: [
							'pdf',
						],
						operation: [
							'create',
						]
					},
				},
			},
			{
				displayName: 'Overrides',
				name: 'overrides',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Item',
				default: {},
				options: [
					{
						displayName: 'Data',
						name: 'data',
						values: [
							{
								displayName: 'JSON',
								name: 'json',
								type: 'fixedCollection',
								typeOptions: {
									multipleValues: true,
								},
								default: {},
								options: [
									{
										displayName: 'Data',
										name: 'data',
										values: [
											{
												displayName: 'Key',
												name: 'key',
												type: 'string',
												default: '',
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
						],
					},
				],
				displayOptions: {
					show: {
						resource: [
							'image',
						],
						operation: [
							'create',
						],
					},
				},
			},
			{
				displayName: 'JSON',
				name: 'json',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Data',
				default: {},
				options: [
					{
						displayName: 'Data',
						name: 'data',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
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
				displayOptions: {
					show: {
						resource: [
							'pdf',
						],
						operation: [
							'create',
						],
					},
				},
			},
		],
	};

	methods = {
		loadOptions: {
			async getImageTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return await loadResource.call(this, 'image');
			},

			async getPdfTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return await loadResource.call(this, 'pdf');
			}
		},
	};

	async execute(this: IExecuteFunctions) {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;

		let responseData;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {

			if (resource === 'account') {

				// *********************************************************************
				//                               account
				// *********************************************************************

				if (operation === 'get') {

					// ----------------------------------
					//         account: get
					// ----------------------------------

					responseData = await apiTemplateIoApiRequest.call(this, 'GET', '/account-information');

				}

			} else if (resource === 'image') {

				// *********************************************************************
				//                               image
				// *********************************************************************

				if (operation === 'create') {

					// ----------------------------------
					//          image: create
					// ----------------------------------

					// https://docs.apitemplate.io/reference/api-reference.html#create-an-image-jpeg-and-png

					const qs = {
						template_id: this.getNodeParameter('templateId', i),
					};

					const overrides = this.getNodeParameter('overrides', i) as GroupsOfKeyValuePairs;
					const body = { overrides: [] } as Overrides;

					overrides.data.map(override => override.json.data).forEach(properties => {
						const temp: { [key: string]: string } = {};
						properties.forEach(property => temp[property.key] = property.value);
						body.overrides.push(temp);
					});

					responseData = await apiTemplateIoApiRequest.call(this, 'POST', '/create', qs, body);

				}

			} else if (resource === 'pdf') {

				// *********************************************************************
				//                               pdf
				// *********************************************************************

				if (operation === 'create') {

					// ----------------------------------
					//          pdf: create
					// ----------------------------------

					// https://docs.apitemplate.io/reference/api-reference.html#create-a-pdf

					const qs = {
						template_id: this.getNodeParameter('templateId', i),
					};

					const { data } = this.getNodeParameter('json', i) as { data: Array<{ key: string, value: string }> };
					const contents = {} as { [key: string]: string };
					data.forEach(item => contents[item.key] = item.value)

					responseData = await apiTemplateIoApiRequest.call(this, 'POST', '/create', qs, contents);

				}
			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);

		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
