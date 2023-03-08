import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { createTransport } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

import { updateDisplayOptions } from '../../../utils/utilities';

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
			},
			{
				name: 'HTML',
				value: 'html',
			},
		],
		default: 'text',
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
				emailFormat: ['text'],
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
				emailFormat: ['html'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Attachments',
				name: 'attachments',
				type: 'string',
				default: '',
				description:
					'Name of the binary properties that contain data to add to email as attachment. Multiple ones can be comma-separated.',
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
	allowUnauthorizedCerts?: boolean;
	attachments?: string;
	ccEmail?: string;
	bccEmail?: string;
	replyTo?: string;
};

function configureTransport(credentials: IDataObject, options: EmailSendOptions) {
	const connectionOptions: SMTPTransport.Options = {
		host: credentials.host as string,
		port: credentials.port as number,
		secure: credentials.secure as boolean,
	};

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

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();

	const returnData: INodeExecutionData[] = [];
	let item: INodeExecutionData;

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		try {
			item = items[itemIndex];

			const fromEmail = this.getNodeParameter('fromEmail', itemIndex) as string;
			const toEmail = this.getNodeParameter('toEmail', itemIndex) as string;
			const subject = this.getNodeParameter('subject', itemIndex) as string;
			const emailFormat = this.getNodeParameter('emailFormat', itemIndex) as string;
			const options = this.getNodeParameter('options', itemIndex, {}) as EmailSendOptions;

			const credentials = await this.getCredentials('smtp');

			const transporter = configureTransport(credentials, options);

			const mailOptions: IDataObject = {
				from: fromEmail,
				to: toEmail,
				cc: options.ccEmail,
				bcc: options.bccEmail,
				subject,
				replyTo: options.replyTo,
			};

			if (emailFormat === 'text') {
				mailOptions.text = this.getNodeParameter('text', itemIndex, '');
			}

			if (emailFormat === 'html') {
				mailOptions.html = this.getNodeParameter('html', itemIndex, '');
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
			throw error;
		}
	}

	return this.prepareOutputData(returnData);
}
