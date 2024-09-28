import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	IExecuteFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';

import { NodeOperationError, jsonParse } from 'n8n-workflow';

import { NodeApiError } from 'n8n-workflow';

import { createTransport } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

import { updateDisplayOptions } from '@utils/utilities';
import { appendAttributionOption } from '../../../utils/descriptions';

const properties: INodeProperties[] = [
	// TODO: Add choice for text as text or html  (maybe also from name)
	{
		displayName: 'From Email',
		name: 'fromEmail',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'admin@example.com',
		description:
			'Email address of the sender. You can also specify a name: Nathan Doe &lt;nate@n8n.io&gt;.',
	},
	{
		displayName: 'To Email',
		name: 'toEmail',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'info@example.com',
		description:
			'Email address of the recipient. You can also specify a name: Nathan Doe &lt;nate@n8n.io&gt;.',
	},
	{
		displayName: 'Additional Headers',
		name: 'additionalHeaders',
		type: 'boolean',
		default: false,
		noDataExpression: true,
		description: 'Add additional headers',
	},
	{
		displayName: 'Specify Headers',
		name: 'specifyHeaders',
		type: 'options',
		displayOptions: {
			show: {
				additionalHeaders: [true],
			},
		},
		options: [
			{
				name: 'Using Fields Below',
				value: 'keypair',
			},
			{
				name: 'Using JSON',
				value: 'json',
			},
		],
		default: 'keypair',
	},
	{
		displayName: 'Header Parameters',
		name: 'headerParameters',
		type: 'fixedCollection',
		displayOptions: {
			show: {
				additionalHeaders: [true],
				specifyHeaders: ['keypair'],
			},
		},
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Parameter',
		default: {
			parameters: [
				{
					name: '',
					value: '',
				},
			],
		},
		options: [
			{
				name: 'parameters',
				displayName: 'Parameter',
				values: [
					{
						displayName: 'Name',
						name: 'name',
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
		displayName: 'JSON',
		name: 'jsonHeaders',
		type: 'json',
		displayOptions: {
			show: {
				additionalHeaders: [true],
				specifyHeaders: ['json'],
			},
		},
		default: '',
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		default: '',
		placeholder: 'My subject line',
		description: 'Subject line of the email',
	},
	{
		displayName: 'Email Format',
		name: 'emailFormat',
		type: 'options',
		options: [
			{
				name: 'Text',
				value: 'text',
				description: 'Send email as plain text',
			},
			{
				name: 'HTML',
				value: 'html',
				description: 'Send email as HTML',
			},
			{
				name: 'Both',
				value: 'both',
				description: "Send both formats, recipient's client selects version to display",
			},
		],
		default: 'html',
		displayOptions: {
			hide: {
				'@version': [2],
			},
		},
	},
	{
		displayName: 'Email Format',
		name: 'emailFormat',
		type: 'options',
		options: [
			{
				name: 'Text',
				value: 'text',
			},
			{
				name: 'HTML',
				value: 'html',
			},
			{
				name: 'Both',
				value: 'both',
			},
		],
		default: 'text',
		displayOptions: {
			show: {
				'@version': [2],
			},
		},
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: {
			rows: 5,
		},
		default: '',
		description: 'Plain text message of email',
		displayOptions: {
			show: {
				emailFormat: ['text', 'both'],
			},
		},
	},
	{
		displayName: 'HTML',
		name: 'html',
		type: 'string',
		typeOptions: {
			rows: 5,
		},
		default: '',
		description: 'HTML text message of email',
		displayOptions: {
			show: {
				emailFormat: ['html', 'both'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				...appendAttributionOption,
				description:
					'Whether to include the phrase “This email was sent automatically with n8n” to the end of the email',
			},
			{
				displayName: 'Attachments',
				name: 'attachments',
				type: 'string',
				default: '',
				description:
					'Name of the binary properties that contain data to add to email as attachment. Multiple ones can be comma-separated. Reference embedded images or other content within the body of an email message, e.g. &lt;img src="cid:image_1"&gt;',
			},
			{
				displayName: 'CC Email',
				name: 'ccEmail',
				type: 'string',
				default: '',
				placeholder: 'cc@example.com',
				description: 'Email address of CC recipient',
			},
			{
				displayName: 'BCC Email',
				name: 'bccEmail',
				type: 'string',
				default: '',
				placeholder: 'bcc@example.com',
				description: 'Email address of BCC recipient',
			},
			{
				displayName: 'Ignore SSL Issues',
				name: 'allowUnauthorizedCerts',
				type: 'boolean',
				default: false,
				description: 'Whether to connect even if SSL certificate validation is not possible',
			},
			{
				displayName: 'Reply To',
				name: 'replyTo',
				type: 'string',
				default: '',
				placeholder: 'info@example.com',
				description: 'The email address to send the reply to',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['email'],
		operation: ['send'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

type EmailSendOptions = {
	appendAttribution?: boolean;
	allowUnauthorizedCerts?: boolean;
	attachments?: string;
	ccEmail?: string;
	bccEmail?: string;
	replyTo?: string;
};

async function reduceAsync<T, R>(
	arr: T[],
	reducer: (acc: Awaited<Promise<R>>, cur: T) => Promise<R>,
	init: Promise<R> = Promise.resolve({} as R),
): Promise<R> {
	return await arr.reduce(async (promiseAcc, item) => {
		return await reducer(await promiseAcc, item);
	}, init);
}

function configureTransport(credentials: IDataObject, options: EmailSendOptions) {
	const connectionOptions: SMTPTransport.Options = {
		host: credentials.host as string,
		port: credentials.port as number,
		secure: credentials.secure as boolean,
	};

	if (credentials.secure === false) {
		connectionOptions.ignoreTLS = credentials.disableStartTls as boolean;
	}

	if (typeof credentials.hostName === 'string' && credentials.hostName) {
		connectionOptions.name = credentials.hostName;
	}

	if (credentials.user || credentials.password) {
		connectionOptions.auth = {
			user: credentials.user as string,
			pass: credentials.password as string,
		};
	}

	if (options.allowUnauthorizedCerts === true) {
		connectionOptions.tls = {
			rejectUnauthorized: false,
		};
	}

	return createTransport(connectionOptions);
}

export async function smtpConnectionTest(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	const credentials = credential.data!;
	const transporter = configureTransport(credentials, {});
	try {
		await transporter.verify();
		return {
			status: 'OK',
			message: 'Connection successful!',
		};
	} catch (error) {
		return {
			status: 'Error',
			message: error.message,
		};
	} finally {
		transporter.close();
	}
}

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const nodeVersion = this.getNode().typeVersion;
	const instanceId = this.getInstanceId();

	const returnData: INodeExecutionData[] = [];
	let item: INodeExecutionData;

	const parametersToKeyValue = async (
		accumulator: { [key: string]: any },
		cur: { name: string; value: string; parameterType?: string; inputDataFieldName?: string },
	) => {
		accumulator[cur.name] = cur.value;
		return accumulator;
	};

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		try {
			item = items[itemIndex];

			const fromEmail = this.getNodeParameter('fromEmail', itemIndex) as string;
			const toEmail = this.getNodeParameter('toEmail', itemIndex) as string;
			const subject = this.getNodeParameter('subject', itemIndex) as string;
			const emailFormat = this.getNodeParameter('emailFormat', itemIndex) as string;
			const options = this.getNodeParameter('options', itemIndex, {}) as EmailSendOptions;

			const additionalHeaders = this.getNodeParameter(
				'additionalHeaders',
				itemIndex,
				false,
			) as boolean;

			const headerParameters = this.getNodeParameter(
				'headerParameters.parameters',
				itemIndex,
				[],
			) as [{ name: string; value: string }];

			const specifyHeaders = this.getNodeParameter(
				'specifyHeaders',
				itemIndex,
				'keypair',
			) as string;

			const jsonHeadersParameter = this.getNodeParameter('jsonHeaders', itemIndex, '') as string;

			const credentials = await this.getCredentials('smtp');

			const transporter = configureTransport(credentials, options);

			// Get additional headers defined in the UI
			let extraHeaders: IDataObject = {};
			if (additionalHeaders && headerParameters) {
				if (specifyHeaders === 'keypair') {
					extraHeaders = await reduceAsync(
						headerParameters.filter((header) => header.name),
						parametersToKeyValue,
					);
				} else if (specifyHeaders === 'json') {
					// body is specified using JSON
					try {
						JSON.parse(jsonHeadersParameter);
					} catch {
						throw new NodeOperationError(
							this.getNode(),
							'JSON parameter need to be an valid JSON',
							{
								itemIndex,
							},
						);
					}

					extraHeaders = jsonParse(jsonHeadersParameter);
				}
			}

			const mailOptions: IDataObject = {
				from: fromEmail,
				to: toEmail,
				cc: options.ccEmail,
				bcc: options.bccEmail,
				subject,
				replyTo: options.replyTo,
				headers: extraHeaders,
			};

			if (emailFormat === 'text' || emailFormat === 'both') {
				mailOptions.text = this.getNodeParameter('text', itemIndex, '');
			}

			if (emailFormat === 'html' || emailFormat === 'both') {
				mailOptions.html = this.getNodeParameter('html', itemIndex, '');
			}

			let appendAttribution = options.appendAttribution;
			if (appendAttribution === undefined) {
				appendAttribution = nodeVersion >= 2.1;
			}

			if (appendAttribution) {
				const attributionText = 'This email was sent automatically with ';
				const link = `https://n8n.io/?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=${encodeURIComponent(
					'n8n-nodes-base.emailSend',
				)}${instanceId ? '_' + instanceId : ''}`;
				if (emailFormat === 'html' || (emailFormat === 'both' && mailOptions.html)) {
					mailOptions.html = `
					${mailOptions.html}
					<br>
					<br>
					---
					<br>
					<em>${attributionText}<a href="${link}" target="_blank">n8n</a></em>
					`;
				} else {
					mailOptions.text = `${mailOptions.text}\n\n---\n${attributionText}n8n\n${'https://n8n.io'}`;
				}
			}

			if (options.attachments && item.binary) {
				const attachments = [];
				const attachmentProperties: string[] = options.attachments
					.split(',')
					.map((propertyName) => {
						return propertyName.trim();
					});

				for (const propertyName of attachmentProperties) {
					const binaryData = this.helpers.assertBinaryData(itemIndex, propertyName);
					attachments.push({
						filename: binaryData.fileName || 'unknown',
						content: await this.helpers.getBinaryDataBuffer(itemIndex, propertyName),
						cid: propertyName,
					});
				}

				if (attachments.length) {
					mailOptions.attachments = attachments;
				}
			}

			const info = await transporter.sendMail(mailOptions);

			returnData.push({
				json: info as unknown as IDataObject,
				pairedItem: {
					item: itemIndex,
				},
			});
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({
					json: {
						error: error.message,
					},
					pairedItem: {
						item: itemIndex,
					},
				});
				continue;
			}
			delete error.cert;
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}
	}

	return [returnData];
}
