import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	apiTemplateIoApiRequest,
	downloadImage,
	loadResource,
	validateJSON,
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
			name: 'APITemplate.io',
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
				noDataExpression: true,
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
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				default: 'create',
				required: true,
				options: [
					{
						name: 'Create',
						value: 'create',
						action: 'Create an image',
					},
				],
				displayOptions: {
					show: {
						resource: ['image', 'pdf'],
					},
				},
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				default: 'get',
				required: true,
				options: [
					{
						name: 'Get',
						value: 'get',
						action: 'Get an account',
					},
				],
				displayOptions: {
					show: {
						resource: ['account'],
					},
				},
			},
			{
				displayName: 'Template Name or ID',
				name: 'imageTemplateId',
				type: 'options',
				required: true,
				default: '',
				description:
					'ID of the image template to use. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getImageTemplates',
				},
				displayOptions: {
					show: {
						resource: ['image'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Template Name or ID',
				name: 'pdfTemplateId',
				type: 'options',
				required: true,
				default: '',
				description:
					'ID of the PDF template to use. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getPdfTemplates',
				},
				displayOptions: {
					show: {
						resource: ['pdf'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'JSON Parameters',
				name: 'jsonParameters',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['pdf', 'image'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Download',
				name: 'download',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['pdf', 'image'],
						operation: ['create'],
					},
				},
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description: 'Name of the binary property to which to write the data of the read file',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryProperty',
				type: 'string',
				required: true,
				default: 'data',
				description: 'Name of the binary property to which to write to',
				displayOptions: {
					show: {
						resource: ['pdf', 'image'],
						operation: ['create'],
						download: [true],
					},
				},
			},
			{
				displayName: 'Overrides (JSON)',
				name: 'overridesJson',
				type: 'json',
				default: '',
				displayOptions: {
					show: {
						resource: ['image'],
						operation: ['create'],
						jsonParameters: [true],
					},
				},
				placeholder:
					'[ {"name": "text_1", "text": "hello world", "textBackgroundColor": "rgba(246, 243, 243, 0)" } ]',
			},
			{
				displayName: 'Properties (JSON)',
				name: 'propertiesJson',
				type: 'json',
				default: '',
				displayOptions: {
					show: {
						resource: ['pdf'],
						operation: ['create'],
						jsonParameters: [true],
					},
				},
				placeholder: '{ "name": "text_1" }',
			},
			{
				displayName: 'Overrides',
				name: 'overridesUi',
				placeholder: 'Add Override',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						resource: ['image'],
						operation: ['create'],
						jsonParameters: [false],
					},
				},
				default: {},
				options: [
					{
						name: 'overrideValues',
						displayName: 'Override',
						values: [
							{
								displayName: 'Properties',
								name: 'propertiesUi',
								placeholder: 'Add Property',
								type: 'fixedCollection',
								typeOptions: {
									multipleValues: true,
								},
								default: {},
								options: [
									{
										name: 'propertyValues',
										displayName: 'Property',
										values: [
											{
												displayName: 'Key',
												name: 'key',
												type: 'string',
												default: '',
												description: 'Name of the property',
											},
											{
												displayName: 'Value',
												name: 'value',
												type: 'string',
												default: '',
												description: 'Value to the property',
											},
										],
									},
								],
							},
						],
					},
				],
			},
			{
				displayName: 'Properties',
				name: 'propertiesUi',
				placeholder: 'Add Property',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				displayOptions: {
					show: {
						resource: ['pdf'],
						operation: ['create'],
						jsonParameters: [false],
					},
				},
				options: [
					{
						name: 'propertyValues',
						displayName: 'Property',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
								description: 'Name of the property',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value to the property',
							},
						],
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['pdf', 'image'],
						download: [true],
					},
				},
				default: {},
				options: [
					{
						displayName: 'File Name',
						name: 'fileName',
						type: 'string',
						default: '',
						description:
							'The name of the downloaded image/pdf. It has to include the extension. For example: report.pdf',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getImageTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return loadResource.call(this, 'image');
			},

			async getPdfTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return loadResource.call(this, 'pdf');
			},
		},
	};

	async execute(this: IExecuteFunctions) {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;

		let responseData;

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		if (resource === 'account') {
			// *********************************************************************
			//                               account
			// *********************************************************************

			if (operation === 'get') {
				// ----------------------------------
				//         account: get
				// ----------------------------------

				for (let i = 0; i < length; i++) {
					try {
						responseData = await apiTemplateIoApiRequest.call(this, 'GET', '/account-information');

						returnData.push(responseData);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({ json: { error: error.message } });
							continue;
						}
						throw error;
					}
				}
			}
		} else if (resource === 'image') {
			// *********************************************************************
			//                               image
			// *********************************************************************

			if (operation === 'create') {
				// ----------------------------------
				//          image: create
				// ----------------------------------

				const download = this.getNodeParameter('download', 0);

				// https://docs.apitemplate.io/reference/api-reference.html#create-an-image-jpeg-and-png
				for (let i = 0; i < length; i++) {
					try {
						const jsonParameters = this.getNodeParameter('jsonParameters', i);

						let options: IDataObject = {};
						if (download) {
							options = this.getNodeParameter('options', i);
						}

						const qs = {
							template_id: this.getNodeParameter('imageTemplateId', i),
						};

						const body = { overrides: [] } as IDataObject;

						if (!jsonParameters) {
							const overrides =
								((this.getNodeParameter('overridesUi', i) as IDataObject)
									?.overrideValues as IDataObject[]) || [];
							if (overrides.length !== 0) {
								const data: IDataObject[] = [];
								for (const override of overrides) {
									const properties =
										((override.propertiesUi as IDataObject)?.propertyValues as IDataObject[]) || [];
									data.push(
										properties.reduce(
											(obj, value) => Object.assign(obj, { [`${value.key}`]: value.value }),
											{},
										),
									);
								}
								body.overrides = data;
							}
						} else {
							const overrideJson = this.getNodeParameter('overridesJson', i) as string;
							if (overrideJson !== '') {
								const data = validateJSON(overrideJson);
								if (data === undefined) {
									throw new NodeOperationError(this.getNode(), 'A valid JSON must be provided.', {
										itemIndex: i,
									});
								}
								body.overrides = data;
							}
						}

						responseData = await apiTemplateIoApiRequest.call(this, 'POST', '/create', qs, body);

						if (download) {
							const binaryProperty = this.getNodeParameter('binaryProperty', i);
							const data = await downloadImage.call(this, responseData.download_url);
							const fileName = responseData.download_url.split('/').pop();
							const binaryData = await this.helpers.prepareBinaryData(
								data,
								options.fileName || fileName,
							);
							responseData = {
								json: responseData,
								binary: {
									[binaryProperty]: binaryData,
								},
							};
						}
						returnData.push(responseData);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({ json: { error: error.message } });
							continue;
						}
						throw error;
					}
				}

				if (download) {
					return this.prepareOutputData(returnData as unknown as INodeExecutionData[]);
				}
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
				const download = this.getNodeParameter('download', 0);

				for (let i = 0; i < length; i++) {
					try {
						const jsonParameters = this.getNodeParameter('jsonParameters', i);

						let options: IDataObject = {};
						if (download) {
							options = this.getNodeParameter('options', i);
						}

						const qs = {
							template_id: this.getNodeParameter('pdfTemplateId', i),
						};

						let data;

						if (!jsonParameters) {
							const properties =
								((this.getNodeParameter('propertiesUi', i) as IDataObject)
									?.propertyValues as IDataObject[]) || [];
							if (properties.length === 0) {
								throw new NodeOperationError(
									this.getNode(),
									'The parameter properties cannot be empty',
									{ itemIndex: i },
								);
							}
							data = properties.reduce(
								(obj, value) => Object.assign(obj, { [`${value.key}`]: value.value }),
								{},
							);
						} else {
							const propertiesJson = this.getNodeParameter('propertiesJson', i) as string;
							data = validateJSON(propertiesJson);
							if (data === undefined) {
								throw new NodeOperationError(this.getNode(), 'A valid JSON must be provided.', {
									itemIndex: i,
								});
							}
						}

						responseData = await apiTemplateIoApiRequest.call(this, 'POST', '/create', qs, data);

						if (download) {
							const binaryProperty = this.getNodeParameter('binaryProperty', i);
							const imageData = await downloadImage.call(this, responseData.download_url);
							const fileName = responseData.download_url.split('/').pop();
							const binaryData = await this.helpers.prepareBinaryData(
								imageData,
								options.fileName || fileName,
							);
							responseData = {
								json: responseData,
								binary: {
									[binaryProperty]: binaryData,
								},
							};
						}
						returnData.push(responseData);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({ json: { error: error.message } });
							continue;
						}
						throw error;
					}
				}
				if (download) {
					return this.prepareOutputData(returnData as unknown as INodeExecutionData[]);
				}
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
