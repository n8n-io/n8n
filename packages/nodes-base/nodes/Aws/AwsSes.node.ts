import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {  awsApiRequestSOAP } from './GenericFunctions';

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
		subtitle: '={{$parameter["operation"]}}',
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
			}
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Send Email',
						value: 'sendEmail',
					},
				],
				default: 'sendEmail',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Is Body HTML',
				name: 'isBodyHtml',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: [
							'sendEmail',
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
						operation: [
							'sendEmail',
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
						operation: [
							'sendEmail',
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
						operation: [
							'sendEmail',
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
						operation: [
							'sendEmail',
						],
					},
				},
				placeholder: 'info@example.com',
				default: [],
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: [
							'sendEmail',
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
						description: 'Name of the configuration set to use when you send an email using SendEmail.',
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
						displayName: 'Return Path Arn',
						name: 'returnPathArn',
						type: 'string',
						default: '',
						description: 'This parameter is used only for sending authorization',
					},
					{
						displayName: 'Source Arn',
						name: 'sourceArn',
						type: 'string',
						description: 'This parameter is used only for sending authorization.',
						default: '',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let responseData;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < items.length; i++) {
			if (operation === 'sendEmail') {
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
					params.push(`Message.Body.Html.Data=${message}`);
				} else {
					params.push(`Message.Body.Text.Data=${message}`);
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

				try {
					responseData = await awsApiRequestSOAP.call(this, 'email', 'POST', '/?Action=SendEmail&' + params.join('&'));
				} catch(err) {
					throw new Error(err);
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
