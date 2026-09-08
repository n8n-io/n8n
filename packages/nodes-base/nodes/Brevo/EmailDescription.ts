import type { INodeProperties } from 'n8n-workflow';

import { BrevoNode } from './GenericFunctions';

export const emailOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['email'],
			},
		},
		options: [
			{
				name: 'Send',
				value: 'send',
				action: 'Send a transactional email',
			},
			{
				name: 'Send template',
				value: 'sendTemplate',
				action: 'Send an email with an existing template',
			},
		],
		routing: {
			request: {
				method: 'POST',
				url: '/v3/smtp/email',
			},
		},
		default: 'send',
	},
];

const sendHtmlEmailFields: INodeProperties[] = [
	{
		displayName: 'Send HTML',
		name: 'sendHTML',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['send'],
			},
		},
		default: false,
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['send'],
			},
		},
		routing: {
			send: {
				property: 'subject',
				type: 'body',
			},
		},
		default: '',
		description: 'Subject of the email',
	},
	{
		displayName: 'Text content',
		name: 'textContent',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['send'],
				sendHTML: [false],
			},
		},
		routing: {
			send: {
				property: 'textContent',
				type: 'body',
			},
		},
		default: '',
		description: 'Text content of the message',
	},
	{
		displayName: 'HTML content',
		name: 'htmlContent',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['send'],
				sendHTML: [true],
			},
		},
		routing: {
			send: {
				property: 'htmlContent',
				type: 'body',
			},
		},
		default: '',
		description: 'HTML content of the message',
	},
	{
		displayName: 'Sender',
		name: 'sender',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['send'],
			},
		},
		default: '',
		required: true,
		routing: {
			send: {
				preSend: [BrevoNode.Validators.validateAndCompileSenderEmail],
			},
		},
	},
	{
		displayName: 'Recipients',
		name: 'receipients',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['send'],
			},
		},
		default: '',
		required: true,
		routing: {
			send: {
				preSend: [BrevoNode.Validators.validateAndCompileRecipientEmails],
			},
		},
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		placeholder: 'Add field',
		description: 'Additional fields to add',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['send'],
			},
		},
		options: [
			{
				displayName: 'Attachments',
				name: 'emailAttachments',
				placeholder: 'Add attachment',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						name: 'attachment',
						displayName: 'Attachment data',
						values: [
							{
								displayName: 'Input data field name',
								default: '',
								name: 'binaryPropertyName',
								type: 'string',
								description:
									'The name of the incoming field containing the binary file data to be processed',
							},
						],
					},
				],
				routing: {
					send: {
						preSend: [BrevoNode.Validators.validateAndCompileAttachmentsData],
					},
				},
			},
			{
				displayName: 'Recipients BCC',
				name: 'receipientsBCC',
				placeholder: 'Add BCC',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						name: 'receipientBcc',
						displayName: 'Recipient',
						values: [
							{
								displayName: 'Recipient',
								name: 'bcc',
								type: 'string',
								default: '',
							},
						],
					},
				],
				routing: {
					send: {
						preSend: [BrevoNode.Validators.validateAndCompileBCCEmails],
					},
				},
			},
			{
				displayName: 'Recipients CC',
				name: 'receipientsCC',
				placeholder: 'Add CC',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						name: 'receipientCc',
						displayName: 'Recipient',
						values: [
							{
								displayName: 'Recipient',
								name: 'cc',
								type: 'string',
								default: '',
							},
						],
					},
				],
				routing: {
					send: {
						preSend: [BrevoNode.Validators.validateAndCompileCCEmails],
					},
				},
			},
			{
				displayName: 'Email tags',
				name: 'emailTags',
				default: {},
				description: 'Add tags to your emails to find them more easily',
				placeholder: 'Add email tags',
				type: 'fixedCollection',
				options: [
					{
						displayName: 'Tags',
						name: 'tags',
						values: [
							{
								displayName: 'Tag',
								default: '',
								name: 'tag',
								type: 'string',
							},
						],
					},
				],
				routing: {
					send: {
						preSend: [BrevoNode.Validators.validateAndCompileTags],
					},
				},
			},
		],
	},
];

const sendHtmlTemplateEmailFields: INodeProperties[] = [
	{
		displayName: 'Template ID',
		name: 'templateId',
		type: 'options',
		default: '',
		typeOptions: {
			loadOptions: {
				routing: {
					request: {
						method: 'GET',
						url: '/v3/smtp/templates',
						qs: {
							templateStatus: true,
							limit: 1000,
							offset: 0,
							sort: 'desc',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'templates',
								},
							},
							{
								type: 'setKeyValue',
								properties: {
									name: '={{$responseItem.name}}',
									value: '={{$responseItem.id}}',
								},
							},
							{
								type: 'sort',
								properties: {
									key: 'name',
								},
							},
						],
					},
				},
			},
		},
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['sendTemplate'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'templateId',
			},
		},
	},
	{
		displayName: 'Recipients',
		name: 'receipients',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['sendTemplate'],
			},
		},
		default: '',
		required: true,
		routing: {
			send: {
				preSend: [BrevoNode.Validators.validateAndCompileRecipientEmails],
			},
		},
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		description: 'Additional fields to add',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['sendTemplate'],
			},
		},
		options: [
			{
				displayName: 'Attachments',
				name: 'emailAttachments',
				placeholder: 'Add attachment',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						displayName: 'Attachment data',
						name: 'attachment',
						values: [
							{
								displayName: 'Input data field name',
								name: 'binaryPropertyName',
								default: '',
								type: 'string',
								description:
									'The name of the incoming field containing the binary file data to be processed',
							},
						],
					},
				],
				routing: {
					send: {
						preSend: [BrevoNode.Validators.validateAndCompileAttachmentsData],
					},
				},
			},
			{
				displayName: 'Email tags',
				name: 'emailTags',
				default: {},
				description: 'Add tags to your emails to find them more easily',
				placeholder: 'Add email tags',
				type: 'fixedCollection',
				options: [
					{
						displayName: 'Tags',
						name: 'tags',
						values: [
							{
								displayName: 'Tag',
								default: '',
								name: 'tag',
								type: 'string',
							},
						],
					},
				],
				routing: {
					send: {
						preSend: [BrevoNode.Validators.validateAndCompileTags],
					},
				},
			},
			{
				displayName: 'Template parameters',
				name: 'templateParameters',
				default: {},
				description: 'Pass a set of attributes to customize the template',
				placeholder: 'Add parameter',
				type: 'fixedCollection',
				options: [
					{
						name: 'parameterValues',
						displayName: 'Parameters',
						values: [
							{
								displayName: 'Parameter',
								name: 'parameters',
								type: 'string',
								default: '',
								placeholder: 'key=value',
								description: 'Comma-separated key=value pairs',
							},
						],
					},
				],
				routing: {
					send: {
						preSend: [BrevoNode.Validators.validateAndCompileTemplateParameters],
					},
				},
			},
		],
	},
];

export const emailFields: INodeProperties[] = [
	...sendHtmlEmailFields,
	...sendHtmlTemplateEmailFields,
];
