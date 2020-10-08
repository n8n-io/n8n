import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	awsApiRequestSOAP,
	awsApiRequestSOAPAllItems,
} from './GenericFunctions';

function setParameter(params: string[], base: string, values: string[]) {
	for (let i = 0; i < values.length; i++) {
		params.push(`${base}.${i+1}=${values[i]}`);
	}
}

export class AwsSes implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS SES',
		name: 'awsSes',
		icon: 'file:ses.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Sends data to AWS SES',
		defaults: {
			name: 'AWS SES',
			color: '#FF9900',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'aws',
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
						name: 'Email',
						value: 'email',
					},
					{
						name: 'Template',
						value: 'template',
					},
				],
				default: 'email',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'email',
						],
					},
				},
				options: [
					{
						name: 'Send',
						value: 'send',
					},
					{
						name: 'Send Template',
						value: 'sendTemplate',
					},
				],
				default: 'send',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Is Body HTML',
				name: 'isBodyHtml',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'send',
						],
					},
				},
				default: false,
				description: 'If body is HTML or simple text.',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'send',
						],
					},
				},
				default: '',
				required: true,
			},
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'send',
						],
					},
				},
				default: '',
				description: 'The message to be sent.',
				required: true,
			},
			{
				displayName: 'From Email',
				name: 'fromEmail',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'send',
						],
					},
				},
				required: true,
				description: 'Email address of the sender.',
				placeholder: 'admin@example.com',
				default: '',
			},
			{
				displayName: 'To Addresses',
				name: 'toAddresses',
				type: 'string',
				description: 'Email addresses of the recipients.',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add To Email',
				},
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'send',
						],
					},
				},
				placeholder: 'info@example.com',
				default: [],
			},
			{
				displayName: 'Template Name',
				name: 'templateName',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTemplates',
				},
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'sendTemplate',
						],
					},
				},
				default: '',
				description: 'The ARN of the template to use when sending this email',
			},
			{
				displayName: 'From Email',
				name: 'fromEmail',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'sendTemplate',
						],
					},
				},
				required: true,
				description: 'Email address of the sender.',
				placeholder: 'admin@example.com',
				default: '',
			},
			{
				displayName: 'To Addresses',
				name: 'toAddresses',
				type: 'string',
				description: 'Email addresses of the recipients.',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add To Email',
				},
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'sendTemplate',
						],
					},
				},
				placeholder: 'info@example.com',
				default: [],
			},
			{
				displayName: 'Template Data',
				name: 'templateDataUi',
				type: 'fixedCollection',
				placeholder: 'Add Data',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'sendTemplate',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Data',
						name: 'templateDataValues',
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
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: [
							'email',
						],
						operation: [
							'send',
							'sendTemplate',
						],
					},
				},
				options: [
					{
						displayName: 'Bcc Addresses',
						name: 'bccAddresses',
						type: 'string',
						typeOptions: {
							multipleValues: true,
							multipleValueButtonText: 'Add Bcc Email',
						},
						description: 'Bcc Recipients of the email.',
						default: [],
					},
					{
						displayName: 'Cc Addresses',
						name: 'ccAddresses',
						type: 'string',
						typeOptions: {
							multipleValues: true,
							multipleValueButtonText: 'Add Cc Email',
						},
						description: 'Cc recipients of the email.',
						default: [],
					},
					{
						displayName: 'Configuration Set Name',
						name: 'configurationSetName',
						type: 'string',
						description: 'Name of the configuration set to use when you send an email using send.',
						default: '',
					},
					{
						displayName: 'Reply To Addresses',
						name: 'replyToAddresses',
						type: 'string',
						typeOptions: {
							multipleValues: true,
							multipleValueButtonText: 'Add Reply To Email',
						},
						placeholder: 'Add Reply Address',
						description: 'Reply-to email address(es) for the message.',
						default: [],
					},
					{
						displayName: 'Return Path',
						name: 'returnPath',
						type: 'string',
						description: 'Email address that bounces and complaints will be forwarded to when feedback forwarding is enabled',
						default: '',
					},
					{
						displayName: 'Return Path ARN',
						name: 'returnPathArn',
						type: 'string',
						default: '',
						description: 'This parameter is used only for sending authorization',
					},
					{
						displayName: 'Source ARN',
						name: 'sourceArn',
						type: 'string',
						description: 'This parameter is used only for sending authorization.',
						default: '',
					},
				],
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'template',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a template',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a template',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a template',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Get all templates',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a template',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Template Name',
				name: 'templateName',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'template',
						],
						operation: [
							'update',
							'create',
							'get',
							'delete',
						],
					},
				},
				required: true,
				description: 'The name of the template.',
				default: '',
			},
			{
				displayName: 'Subject Part',
				name: 'subjectPart',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'template',
						],
						operation: [
							'create',
						],
					},
				},
				description: 'The subject line of the email.',
				default: '',
			},
			{
				displayName: 'Html Part',
				name: 'htmlPart',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'template',
						],
						operation: [
							'create',
						],
					},
				},
				description: 'The HTML body of the email.',
				default: '',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: [
							'template',
						],
						operation: [
							'create',
						],
					},
				},
				options: [
					{
						displayName: 'Text Part',
						name: 'textPart',
						type: 'string',
						description: 'The email body that will be visible to recipients whose email clients do not display HTML.',
						default: '',
					},
				],
			},
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: [
							'template',
						],
						operation: [
							'update',
						],
					},
				},
				options: [
					{
						displayName: 'Text Part',
						name: 'textPart',
						type: 'string',
						description: 'The email body that will be visible to recipients whose email clients do not display HTML.',
						default: '',
					},
					{
						displayName: 'Subject Part',
						name: 'subjectPart',
						type: 'string',
						description: 'The subject line of the email.',
						default: '',
					},
					{
						displayName: 'Html Part',
						name: 'htmlPart',
						type: 'string',
						description: 'The HTML body of the email.',
						default: '',
					},
				],
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: [
							'template',
						],
						operation: [
							'getAll',
						],
					},
				},
				default: false,
				description: 'If all results should be returned or only up to a given limit.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 20,
				displayOptions: {
					show: {
						resource: [
							'template',
						],
						operation: [
							'getAll',
						],
						returnAll: [
							false,
						],
					},
				},
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the available templates to display them to user so that he can
			// select them easily
			async getTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const templates = await awsApiRequestSOAPAllItems.call(this, 'ListTemplatesResponse.ListTemplatesResult.TemplatesMetadata.member', 'email', 'POST', '/?Action=ListTemplates');

				for (const template of templates) {
					const templateName = template.Name;
					const templateId = template.Name;

					returnData.push({
						name: templateName,
						value: templateId,
					});
				}

				return returnData;
			}
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {

			if (resource === 'email') {

				if (operation === 'send') {

					const toAddresses = this.getNodeParameter('toAddresses', i) as string[];

					const message = this.getNodeParameter('body', i) as string;

					const subject = this.getNodeParameter('subject', i) as string;

					const fromEmail = this.getNodeParameter('fromEmail', i) as string;

					const isBodyHtml = this.getNodeParameter('isBodyHtml', i) as boolean;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					const params = [
						`Message.Subject.Data=${subject}`,
						`Source=${fromEmail}`,
					];

					if (isBodyHtml) {
						params.push(`Message.Body.Html.Data=${encodeURI(message)}`);
					} else {
						params.push(`Message.Body.Text.Data=${encodeURI(message)}`);
					}

					if (toAddresses.length) {
						setParameter(params, 'Destination.ToAddresses.member', toAddresses);
					} else {
						throw new Error('At least one "To Address" has to be added!');
					}

					if (additionalFields.configurationSetName) {
						params.push(`ConfigurationSetName=${additionalFields.configurationSetName}`);
					}

					if (additionalFields.returnPath) {
						params.push(`ReturnPath=${additionalFields.returnPath}`);
					}

					if (additionalFields.returnPathArn) {
						params.push(`ReturnPathArn=${additionalFields.returnPathArn}`);
					}

					if (additionalFields.sourceArn) {
						params.push(`SourceArn=${additionalFields.sourceArn}`);
					}

					if (additionalFields.replyToAddresses) {
						setParameter(params, 'ReplyToAddresses.member', additionalFields.replyToAddresses as string[]);
					}

					if (additionalFields.bccAddresses) {
						setParameter(params, 'Destination.BccAddresses.member', additionalFields.bccAddresses as string[]);
					}

					if (additionalFields.ccAddressesUi) {
						let ccAddresses = (additionalFields.ccAddressesUi as IDataObject).ccAddressesValues as string[];
						//@ts-ignore
						ccAddresses = ccAddresses.map(o => o.address);
						if (ccAddresses) {
							setParameter(params, 'Destination.CcAddresses.member', ccAddresses);
						}
					}

					responseData = await awsApiRequestSOAP.call(this, 'email', 'POST', '/?Action=send&' + params.join('&'));
				}

				if (operation === 'sendTemplate') {

					const toAddresses = this.getNodeParameter('toAddresses', i) as string[];

					const template = this.getNodeParameter('templateName', i) as string;

					const fromEmail = this.getNodeParameter('fromEmail', i) as string;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					const templateDataUi = this.getNodeParameter('templateDataUi', i) as IDataObject;

					const params = [
						`Template=${template}`,
						`Source=${fromEmail}`,
					];

					if (toAddresses.length) {
						setParameter(params, 'Destination.ToAddresses.member', toAddresses);
					} else {
						throw new Error('At least one "To Address" has to be added!');
					}

					if (additionalFields.configurationSetName) {
						params.push(`ConfigurationSetName=${additionalFields.configurationSetName}`);
					}

					if (additionalFields.returnPath) {
						params.push(`ReturnPath=${additionalFields.returnPath}`);
					}

					if (additionalFields.returnPathArn) {
						params.push(`ReturnPathArn=${additionalFields.returnPathArn}`);
					}

					if (additionalFields.sourceArn) {
						params.push(`SourceArn=${additionalFields.sourceArn}`);
					}

					if (additionalFields.replyToAddresses) {
						setParameter(params, 'ReplyToAddresses.member', additionalFields.replyToAddresses as string[]);
					}

					if (additionalFields.bccAddresses) {
						setParameter(params, 'Destination.BccAddresses.member', additionalFields.bccAddresses as string[]);
					}

					if (additionalFields.ccAddressesUi) {
						let ccAddresses = (additionalFields.ccAddressesUi as IDataObject).ccAddressesValues as string[];
						//@ts-ignore
						ccAddresses = ccAddresses.map(o => o.address);
						if (ccAddresses) {
							setParameter(params, 'Destination.CcAddresses.member', ccAddresses);
						}
					}

					if (templateDataUi) {
						const templateDataValues = (templateDataUi as IDataObject).templateDataValues as IDataObject[];
						const templateData: IDataObject = {};
						for (const key of Object.keys(templateDataValues)) {
							//@ts-ignore
							templateData[key]= templateDataValues[key];
						}
						params.push(`TemplateData=${JSON.stringify(templateData)}`);
					}

					responseData = await awsApiRequestSOAP.call(this, 'email', 'POST', '/?Action=SendTemplatedEmail&' + params.join('&'));

					responseData = responseData.SendTemplatedEmailResponse;
				}
			}

			if (resource === 'template') {

				if (operation === 'create') {

					const templateName = this.getNodeParameter('templateName', i) as string;

					const subjectPart = this.getNodeParameter('subjectPart', i) as string;

					const htmlPart = this.getNodeParameter('htmlPart', i) as string;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					const params = [
						`Template.TemplateName=${templateName}`,
						`Template.SubjectPart=${subjectPart}`,
						`Template.HtmlPart=<h1>${htmlPart}</h1>`
					];

					if (additionalFields.textPart) {
						params.push(`Template.TextPart=${additionalFields.textPart}`);
					}

					responseData = await awsApiRequestSOAP.call(this, 'email', 'POST', '/?Action=CreateTemplate&' + params.join('&'));

					responseData = responseData.CreateTemplateResponse;
				}

				if (operation === 'delete') {

					const templateName = this.getNodeParameter('templateName', i) as string;

					const params = [
						`TemplateName=${templateName}`,
					];

					responseData = await awsApiRequestSOAP.call(this, 'email', 'POST', '/?Action=DeleteTemplate&' + params.join('&'));

					responseData = responseData.DeleteTemplateResponse;
				}

				if (operation === 'get') {

					const templateName = this.getNodeParameter('templateName', i) as string;

					const params = [
						`TemplateName=${templateName}`,
					];

					responseData = await awsApiRequestSOAP.call(this, 'email', 'POST', '/?Action=GetTemplate&' + params.join('&'));

					responseData = responseData.GetTemplateResponse;
				}

				if (operation === 'getAll') {

					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					if (returnAll === true) {
						responseData = await awsApiRequestSOAPAllItems.call(this, 'ListTemplatesResponse.ListTemplatesResult.TemplatesMetadata.member', 'email', 'POST', '/?Action=ListTemplates');

					} else {
						const limit = this.getNodeParameter('limit', i) as number;

						responseData = await awsApiRequestSOAP.call(this, 'email', 'GET', `/?Action=ListTemplates&MaxItems=${limit}`);

						responseData = responseData.ListTemplatesResponse.ListTemplatesResult.TemplatesMetadata.member;
					}
				}

				if (operation === 'update') {

					const templateName = this.getNodeParameter('templateName', i) as string;

					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

					const params = [
						`Template.TemplateName=${templateName}`,
					];

					if (updateFields.textPart) {
						params.push(`Template.TextPart=${updateFields.textPart}`);
					}

					if (updateFields.subjectPart) {
						params.push(`Template.SubjectPart=${updateFields.subjectPart}`);
					}

					if (updateFields.subjectPart) {
						params.push(`Template.HtmlPart=${updateFields.htmlPart}`);
					}

					responseData = await awsApiRequestSOAP.call(this, 'email', 'POST', '/?Action=UpdateTemplate&' + params.join('&'));

					responseData = responseData.UpdateTemplateResponse;
				}
			}
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);

			} else {
				returnData.push(responseData as IDataObject);
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
