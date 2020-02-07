import { IExecuteFunctions, LoadNodeParameterOptions } from 'n8n-core';
import {
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
	IDataObject
} from 'n8n-workflow';

import {  awsApiRequestSOAP } from './GenericFunctions';

function setParameter(params: string[], base: string, values: string[]) {
	for (let i = 0; i < values.length; i++) {
		params.push(`${base}.${i+1}=${values[i]}`)
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
				description: 'Weather the body is html or not',
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
				options: [],
				default: '',
				description: 'The message to be sent.',
				required: true,
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
				displayName: 'Source',
				name: 'source',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'sendEmail',
						],
					},
				},
				required: true,
				description: 'The email address that is sending the email.',
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
						operation: [
							'sendEmail',
						],
					},
				},
				options: [
					{
						displayName: 'Configuration Set Name',
						name: 'configurationSetName',
						type: 'string',
						description: 'The name of the configuration set to use when you send an email using SendEmail.',
						default: '',
					},
					{
						displayName: 'Return Path',
						name: 'returnPath',
						type: 'string',
						description: 'The email address that bounces and complaints will be forwarded to when feedback forwarding is enabled',
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
					{
						displayName: 'Reply To Addresses',
						name: 'replyToAddressesUI',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						placeholder: 'Add Reply Address',
						description: 'The reply-to email address(es) for the message.',
						default: {},
						options: [
							{
								displayName: 'Reply Address',
								name: 'replyToAddressesValues',
								values: [
									{
										displayName: 'Address',
										name: 'address',
										type: 'string',
										default: '',
									},
								],
							},
						],
					},
					{
						displayName: 'Cc Addresses',
						name: 'ccAddressesUi',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						placeholder: 'Add Cc Address',
						description: 'The recipients to place on the CC: line of the message.',
						default: {},
						options: [
							{
								displayName: 'Cc Address',
								name: 'ccAddressesValues',
								values: [
									{
										displayName: 'Address',
										name: 'address',
										type: 'string',
										default: '',
									},
								],
							},
						],
					},
					{
						displayName: 'Bcc Addresses',
						name: 'bccAddressesUi',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						placeholder: 'Add CC Address',
						description: 'The recipients to place on the BCC: line of the message.',
						default: {},
						options: [
							{
								displayName: 'Bcc Address',
								name: 'bccAddressesValues',
								values: [
									{
										displayName: 'Address',
										name: 'address',
										type: 'string',
										default: '',
									},
								],
							},
						],
					},
				],
			},
			{
				displayName: 'To Addresses',
				name: 'toAddressesUi',
				type: 'fixedCollection',
				description: 'The recipients to place on the To: line of the message.',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						operation: [
							'sendEmail',
						],
					},
				},
				placeholder: 'Add Address',
				default: {},
				options: [
					{
						displayName: 'Address',
						name: 'toAddressesValues',
						values: [
							{
								displayName: 'Address',
								name: 'address',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		let responseData;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			if (operation === 'sendEmail') {
				let toAddresses = (this.getNodeParameter('toAddressesUi', i) as IDataObject).toAddressesValues as string[];
				const message = this.getNodeParameter('body', i) as string;
				const subject = this.getNodeParameter('subject', i) as string;
				const source = this.getNodeParameter('source', i) as string;
				const isBodyHtml = this.getNodeParameter('isBodyHtml', i) as boolean;
				const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
				const params = [
					`Message.Subject.Data=${subject}`,
					`Source=${source}`,
				];
				if (isBodyHtml) {
					params.push(`Message.Body.Html.Data=${message}`);
				} else {
					params.push(`Message.Body.Text.Data=${message}`);
				}
				if (toAddresses) {
					//@ts-ignore
					toAddresses = toAddresses.map(o => o.address);
					setParameter(params, 'Destination.ToAddresses.member', toAddresses);
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
				if (additionalFields.replyToAddressesUI) {
					let replyToAddresses = (additionalFields.replyToAddressesUI as IDataObject).replyToAddressesValues as string[];
					//@ts-ignore
					replyToAddresses = replyToAddresses.map(o => o.address);
					if (replyToAddresses) {
						setParameter(params, 'ReplyToAddresses.member', replyToAddresses);
					}
				}
				if (additionalFields.bccAddressesUi) {
					let bccAddresses = (additionalFields.bccAddressesUi as IDataObject).bccAddressesValues as string[];
					//@ts-ignore
					bccAddresses = bccAddresses.map(o => o.address);
					if (bccAddresses) {
						setParameter(params, 'Destination.BccAddresses.member', bccAddresses);
					}
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
