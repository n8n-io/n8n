import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	apiTemplateIoApiRequest,
	apiTemplateIoApiRequestV2,
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
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
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
						name: 'PDF V2',
						value: 'pdfv2',
					},
					{
						name: 'Account V1 (deprecated)',
						value: 'account',
					},
					{
						name: 'Image V1 (deprecated)',
						value: 'image',
					},
					{
						name: 'PDF V1 (deprecated)',
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
						resource: ['image'],
					},
				},
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
						action: 'Create a pdf',
					},
				],
				displayOptions: {
					show: {
						resource: ['pdf'],
					},
				},
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				default: 'createFromHtml',
				required: true,
				options: [
					{
						name: 'Create From HTML',
						value: 'createFromHtml',
						action: 'Create a PDF from HTML',
					},
					{
						name: 'Create From Markdown',
						value: 'createFromMarkdown',
						action: 'Create a PDF from Markdown',
					},
					{
						name: 'Create From URL',
						value: 'createFromUrl',
						action: 'Create a PDF from URL',
					},
				],
				displayOptions: {
					show: {
						resource: ['pdfv2'],
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
					'ID of the image template to use. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
					'ID of the PDF template to use. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
				displayName: 'Put Output File in Field',
				name: 'binaryProperty',
				type: 'string',
				required: true,
				default: 'data',
				hint: 'The name of the output binary field to put the file in',
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
			// ------------------------------------------------------------------
			//        V2 PDF Operations: Region & Body Parameters
			// ------------------------------------------------------------------
			{
				displayName: 'Region',
				name: 'region',
				type: 'options',
				default: 'rest',
				required: true,
				description: 'Region of the API endpoint',
				displayOptions: {
					show: {
						resource: ['pdfv2'],
						operation: ['createFromHtml', 'createFromUrl', 'createFromMarkdown'],
					},
				},
				options: [
					{
						name: 'Default Endpoint',
						value: 'rest',
						description: 'Default endpoint for the API',
					},
					{
						name: 'Endpoint: Australia',
						value: 'rest-au',
						description: 'Endpoint for Australia',
					},
					{
						name: 'Endpoint: Europe (Frankfurt)',
						value: 'rest-de',
						description: 'Endpoint for Europe (Frankfurt)',
					},
					{
						name: 'Endpoint: US East (N. Virginia)',
						value: 'rest-us',
						description: 'Endpoint for US East (N. Virginia).',
					},
					{
						name: 'Other: Alternative - Europe (Frankfurt)',
						value: 'rest-alt-de',
						description: 'Alternative endpoint for Europe (Frankfurt)',
					},
					{
						name: 'Other: Alternative - Singapore',
						value: 'rest-alt',
						description: 'Alternative endpoint for Singapore',
					},
					{
						name: 'Other: Alternative - US East (N. Virginia)',
						value: 'rest-alt-us',
						description: 'Alternative endpoint for US East (N. Virginia).',
					},
					{
						name: 'Other: Staging',
						value: 'rest-staging',
						description: 'Staging endpoint',
					},
				],
			},
			{
				displayName: 'HTML Body',
				name: 'htmlBody',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				required: true,
				default: '',
				placeholder: '<h1>Hello {{name}}</h1>',
				description: 'HTML content for the PDF. Supports Jinja2 syntax for dynamic content.',
				displayOptions: {
					show: {
						resource: ['pdfv2'],
						operation: ['createFromHtml'],
					},
				},
			},
			{
				displayName: 'URL',
				name: 'pdfUrl',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'https://example.com',
				description: 'The URL to create a PDF from',
				displayOptions: {
					show: {
						resource: ['pdfv2'],
						operation: ['createFromUrl'],
					},
				},
			},
			{
				displayName: 'Markdown Body',
				name: 'markdownBody',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				required: true,
				default: '',
				placeholder: '# {{title}}\n\nContent here...',
				description: 'Markdown content for the PDF. Supports Jinja2 syntax for dynamic content.',
				displayOptions: {
					show: {
						resource: ['pdfv2'],
						operation: ['createFromMarkdown'],
					},
				},
			},
			{
				displayName: 'CSS',
				name: 'css',
				type: 'string',
				typeOptions: {
					rows: 3,
				},
				default: '',
				placeholder: '<style>.bg{background: red};</style>',
				description: 'CSS styles to apply to the PDF. Include the style tag.',
				displayOptions: {
					show: {
						resource: ['pdfv2'],
						operation: ['createFromHtml', 'createFromMarkdown'],
					},
				},
			},
			{
				displayName: 'Data (JSON)',
				name: 'dataJson',
				type: 'json',
				default: '{}',
				description:
					'JSON object with values for dynamic content (e.g. {"name": "John"}). Must be a valid JSON object.',
				displayOptions: {
					show: {
						resource: ['pdfv2'],
						operation: ['createFromHtml', 'createFromMarkdown'],
					},
				},
			},
			// ------------------------------------------------------------------
			//        V2 PDF Operations: Export & Expiration
			// ------------------------------------------------------------------
			{
				displayName: 'Export Type',
				name: 'exportType',
				type: 'options',
				options: [
					{
						name: 'JSON',
						value: 'json',
						description: 'Returns a JSON response with a CDN download URL',
					},
					{
						name: 'File',
						value: 'file',
						description: 'Returns binary PDF data directly',
					},
				],
				default: 'json',
				displayOptions: {
					show: {
						resource: ['pdfv2'],
						operation: ['createFromHtml', 'createFromUrl', 'createFromMarkdown'],
					},
				},
			},
			{
				displayName: 'Expiration',
				name: 'expiration',
				type: 'number',
				typeOptions: {
					minValue: 60,
					maxValue: 10080,
				},
				default: 60,
				required: true,
				description: 'Expiration of the generated PDF in minutes',
				displayOptions: {
					show: {
						resource: ['pdfv2'],
						operation: ['createFromHtml', 'createFromUrl', 'createFromMarkdown'],
					},
				},
			},
			{
				displayName: 'Put Output File in Field',
				name: 'v2BinaryProperty',
				type: 'string',
				required: true,
				default: 'data',
				hint: 'The name of the output binary field to put the file in',
				displayOptions: {
					show: {
						resource: ['pdfv2'],
						operation: ['createFromHtml', 'createFromUrl', 'createFromMarkdown'],
						exportType: ['file'],
					},
				},
			},
			// ------------------------------------------------------------------
			//        V2 PDF Operations: Async
			// ------------------------------------------------------------------
			{
				displayName: 'Async',
				name: 'isAsync',
				type: 'boolean',
				default: false,
				description:
					'Whether to generate the PDF asynchronously. When enabled, a Webhook URL is required to receive the result.',
				displayOptions: {
					show: {
						resource: ['pdfv2'],
						operation: ['createFromHtml', 'createFromUrl', 'createFromMarkdown'],
					},
				},
			},
			{
				displayName: 'Webhook URL',
				name: 'webhookUrl',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'https://yourwebserver.com/webhook',
				description: 'The URL to receive the async callback when PDF generation is complete',
				displayOptions: {
					show: {
						resource: ['pdfv2'],
						operation: ['createFromHtml', 'createFromUrl', 'createFromMarkdown'],
						isAsync: [true],
					},
				},
			},
			{
				displayName: 'Webhook Method',
				name: 'webhookMethod',
				type: 'options',
				options: [
					{ name: 'GET', value: 'GET' },
					{ name: 'POST', value: 'POST' },
				],
				default: 'GET',
				displayOptions: {
					show: {
						resource: ['pdfv2'],
						operation: ['createFromHtml', 'createFromUrl', 'createFromMarkdown'],
						isAsync: [true],
					},
				},
			},
			// ------------------------------------------------------------------
			//        V2 PDF Operations: Additional Options
			// ------------------------------------------------------------------
			{
				displayName: 'Options',
				name: 'v2Options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['pdfv2'],
						operation: ['createFromHtml', 'createFromUrl', 'createFromMarkdown'],
					},
				},
				options: [
					{
						displayName: 'Filename',
						name: 'filename',
						type: 'string',
						default: '',
						placeholder: 'invoice_123.pdf',
						description: 'Custom filename for the generated PDF',
					},
					{
						displayName: 'Generation Delay',
						name: 'generation_delay',
						type: 'number',
						default: 0,
						description: 'Delay in milliseconds before PDF generation',
					},
					{
						displayName: 'Image Resample Resolution',
						name: 'image_resample_res',
						type: 'string',
						default: '',
						placeholder: '150',
						description:
							'Downsample images to this DPI to reduce file size (e.g. 72, 96, 150, 300, 600)',
					},
					{
						displayName: 'Output Format',
						name: 'output_format',
						type: 'options',
						options: [
							{ name: 'PDF', value: 'pdf' },
							{ name: 'HTML', value: 'html' },
							{ name: 'PNG', value: 'png' },
							{ name: 'JPEG', value: 'jpeg' },
						],
						default: 'pdf',
						description: 'The desired output format',
					},
				],
			},
			// ------------------------------------------------------------------
			//        V2 PDF Operations: PDF Settings
			// ------------------------------------------------------------------
			{
				displayName: 'PDF Settings',
				name: 'pdfSettings',
				type: 'collection',
				placeholder: 'Add Setting',
				default: {},
				displayOptions: {
					show: {
						resource: ['pdfv2'],
						operation: ['createFromHtml', 'createFromUrl', 'createFromMarkdown'],
					},
				},
				options: [
					{
						displayName: 'Custom Footer',
						name: 'custom_footer',
						type: 'string',
						typeOptions: { rows: 3 },
						default: '',
						description: 'Custom HTML markup for the footer of the PDF',
					},
					{
						displayName: 'Custom Header',
						name: 'custom_header',
						type: 'string',
						typeOptions: { rows: 3 },
						default: '',
						description: 'Custom HTML markup for the header of the PDF',
					},
					{
						displayName: 'Custom Height',
						name: 'custom_height',
						type: 'string',
						default: '',
						placeholder: '30mm',
						description: 'Custom height when Paper Size is set to Custom. Valid units: mm, px, cm.',
					},
					{
						displayName: 'Custom Width',
						name: 'custom_width',
						type: 'string',
						default: '',
						placeholder: '30mm',
						description: 'Custom width when Paper Size is set to Custom. Valid units: mm, px, cm.',
					},
					{
						displayName: 'Display Header Footer',
						name: 'displayHeaderFooter',
						type: 'boolean',
						default: false,
						description: 'Whether to display the header and footer in the PDF',
					},
					{
						displayName: 'Header Font Size',
						name: 'header_font_size',
						type: 'string',
						default: '',
						placeholder: '9px',
						description: 'Font size for the header in the PDF',
					},
					{
						displayName: 'Margin Bottom',
						name: 'margin_bottom',
						type: 'string',
						default: '',
						placeholder: '40',
						description: 'Bottom margin in millimeters',
					},
					{
						displayName: 'Margin Left',
						name: 'margin_left',
						type: 'string',
						default: '',
						placeholder: '10',
						description: 'Left margin in millimeters',
					},
					{
						displayName: 'Margin Right',
						name: 'margin_right',
						type: 'string',
						default: '',
						placeholder: '10',
						description: 'Right margin in millimeters',
					},
					{
						displayName: 'Margin Top',
						name: 'margin_top',
						type: 'string',
						default: '',
						placeholder: '40',
						description: 'Top margin in millimeters',
					},
					{
						displayName: 'Orientation',
						name: 'orientation',
						type: 'options',
						options: [
							{ name: 'Portrait', value: '1' },
							{ name: 'Landscape', value: '2' },
						],
						default: '1',
						description: 'Page orientation for the PDF',
					},
					{
						displayName: 'Paper Size',
						name: 'paper_size',
						type: 'options',
						options: [
							{ name: 'A0', value: 'A0' },
							{ name: 'A1', value: 'A1' },
							{ name: 'A2', value: 'A2' },
							{ name: 'A3', value: 'A3' },
							{ name: 'A4', value: 'A4' },
							{ name: 'A5', value: 'A5' },
							{ name: 'A6', value: 'A6' },
							{ name: 'Custom', value: 'custom' },
							{ name: 'Ledger', value: 'Ledger' },
							{ name: 'Legal', value: 'Legal' },
							{ name: 'Letter', value: 'Letter' },
							{ name: 'Tabloid', value: 'Tabloid' },
						],
						default: 'A4',
						description: 'Paper size for the PDF',
					},
					{
						displayName: 'Print Background',
						name: 'print_background',
						type: 'options',
						options: [
							{ name: 'No', value: '0' },
							{ name: 'Yes', value: '1' },
						],
						default: '1',
						description: 'Whether to print background graphics and colors',
					},
				],
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

						returnData.push(responseData as IDataObject);
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
							const data = await downloadImage.call(this, responseData.download_url as string);
							const fileName = responseData.download_url.split('/').pop();
							const binaryData = await this.helpers.prepareBinaryData(
								data as Buffer,
								(options.fileName as string) || (fileName as string),
							);
							responseData = {
								json: responseData,
								binary: {
									[binaryProperty]: binaryData,
								},
							};
						}
						returnData.push(responseData as IDataObject);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({ json: { error: error.message } });
							continue;
						}
						throw error;
					}
				}

				if (download) {
					return [returnData as unknown as INodeExecutionData[]];
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

						responseData = await apiTemplateIoApiRequest.call(
							this,
							'POST',
							'/create',
							qs,
							data as IDataObject,
						);

						if (download) {
							const binaryProperty = this.getNodeParameter('binaryProperty', i);
							const imageData = await downloadImage.call(this, responseData.download_url as string);
							const fileName = responseData.download_url.split('/').pop();
							const binaryData = await this.helpers.prepareBinaryData(
								imageData as Buffer,
								(options.fileName || fileName) as string,
							);
							responseData = {
								json: responseData,
								binary: {
									[binaryProperty]: binaryData,
								},
							};
						}
						returnData.push(responseData as IDataObject);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({ json: { error: error.message } });
							continue;
						}
						throw error;
					}
				}
				if (download) {
					return [returnData as unknown as INodeExecutionData[]];
				}
			}
		} else if (resource === 'pdfv2') {
			if (
				operation === 'createFromHtml' ||
				operation === 'createFromUrl' ||
				operation === 'createFromMarkdown'
			) {
				const exportType = this.getNodeParameter('exportType', 0) as string;

				for (let i = 0; i < length; i++) {
					try {
						const expiration = this.getNodeParameter('expiration', i) as number;
						const isAsync = this.getNodeParameter('isAsync', i) as boolean;
						const v2Options = this.getNodeParameter('v2Options', i) as IDataObject;

						const qs: IDataObject = {
							export_type: this.getNodeParameter('exportType', i) as string,
							expiration,
						};

						if (isAsync) {
							const webhookUrl = this.getNodeParameter('webhookUrl', i) as string;
							const webhookMethod = this.getNodeParameter('webhookMethod', i) as string;
							qs.async = '1';
							qs.webhook_url = webhookUrl;
							qs.webhook_method = webhookMethod;
						}

						for (const [key, value] of Object.entries(v2Options)) {
							if (value !== '' && value !== undefined) {
								qs[key] = value;
							}
						}

						const body: IDataObject = {};

						if (operation === 'createFromHtml' || operation === 'createFromMarkdown') {
							const bodyContent =
								operation === 'createFromHtml'
									? (this.getNodeParameter('htmlBody', i) as string)
									: (this.getNodeParameter('markdownBody', i) as string);
							body.body = bodyContent;

							const css = this.getNodeParameter('css', i) as string;
							if (css) {
								body.css = css;
							}

							const dataJsonRaw = this.getNodeParameter('dataJson', i) as string;
							if (dataJsonRaw) {
								const parsedData = validateJSON(dataJsonRaw);
								if (parsedData === undefined) {
									throw new NodeOperationError(
										this.getNode(),
										'The Data field must contain valid JSON',
										{ itemIndex: i },
									);
								}
								body.data = parsedData;
							}
						} else if (operation === 'createFromUrl') {
							body.url = this.getNodeParameter('pdfUrl', i) as string;
						}

						const pdfSettings = this.getNodeParameter('pdfSettings', i) as IDataObject;
						if (Object.keys(pdfSettings).length) {
							body.settings = pdfSettings;
						}

						const endpointMap: Record<string, string> = {
							createFromHtml: '/v2/create-pdf-from-html',
							createFromUrl: '/v2/create-pdf-from-url',
							createFromMarkdown: '/v2/create-pdf-from-markdown',
						};
						const endpoint = endpointMap[operation as string];
						const returnBinary = qs.export_type === 'file';

						const region = this.getNodeParameter('region', i) as string;

						responseData = await apiTemplateIoApiRequestV2.call(
							this,
							'POST',
							region,
							endpoint,
							qs,
							body,
							returnBinary,
						);

						if (returnBinary) {
							const binaryProperty = this.getNodeParameter('v2BinaryProperty', i) as string;
							const outputFormat = (v2Options.output_format as string) || 'pdf';
							const mimeTypes: Record<string, string> = {
								pdf: 'application/pdf',
								html: 'text/html',
								png: 'image/png',
								jpeg: 'image/jpeg',
							};
							const extensions: Record<string, string> = {
								pdf: 'pdf',
								html: 'html',
								png: 'png',
								jpeg: 'jpeg',
							};
							const fileName =
								(v2Options.filename as string) || `output.${extensions[outputFormat] || 'pdf'}`;
							const binaryData = await this.helpers.prepareBinaryData(
								responseData as Buffer,
								fileName,
								mimeTypes[outputFormat] || 'application/pdf',
							);
							returnData.push({
								json: {},
								binary: { [binaryProperty]: binaryData },
							} as unknown as IDataObject);
						} else {
							returnData.push(responseData as IDataObject);
						}
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({ json: { error: error.message } });
							continue;
						}
						throw error;
					}
				}

				if (exportType === 'file') {
					return [returnData as unknown as INodeExecutionData[]];
				}
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
