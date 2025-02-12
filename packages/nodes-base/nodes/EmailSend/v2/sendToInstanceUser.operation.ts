import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { createUtmCampaignLink, updateDisplayOptions } from '@utils/utilities';

import { configureTransport, type EmailSendOptions } from './utils';
import { appendAttributionOption } from '../../../utils/descriptions';

const properties: INodeProperties[] = [
	{
		displayName: 'SMTP Status' /* eslint-disable-line */,
		name: 'smtpServerEnabled',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getSmtpServerStatus',
		},
		default: 'ServerDisabled',
		description: '' /* eslint-disable-line */,
	},
	{
		displayName:
			"No SMTP server configured. To enable this operation, you'll need to set up an email server first by following the setup guide.",
		name: 'notice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				smtpServerEnabled: [false], // Notice appears when SMTP server is disabled
			},
		},
	},
	{
		// TODO: Why is this eslint rule needed here?
		displayName: 'To Email' /* eslint-disable-line */,
		name: 'toEmail',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getUsers',
		},
		default: [],
		noDataExpression: true,
		description /* eslint-disable-line */:
			'Email address of the recipient from the list of users on this instance',
		displayOptions: {
			show: {
				smtpServerEnabled: [true], // This appears when SMTP server is enabled
			},
		},
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		default: '',
		placeholder: 'My subject line',
		description: 'Subject line of the email',
		displayOptions: {
			show: {
				smtpServerEnabled: [true], // This appears when SMTP server is enabled
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
			show: {
				smtpServerEnabled: [true], // This appears when SMTP server is enabled
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
				smtpServerEnabled: [true], // This appears when SMTP server is enabled
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
				smtpServerEnabled: [true], // This appears when SMTP server is enabled
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
				smtpServerEnabled: [true], // This appears when SMTP server is enabled
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
				displayName: 'Ignore SSL Issues (Insecure)',
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
		displayOptions: {
			show: {
				smtpServerEnabled: [true], // This appears when SMTP server is enabled
			},
		},
	},
];

const displayOptions = {
	show: {
		resource: ['email'],
		operation: ['sendToInstanceUser'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

const instanceSmtpCredentials = {
	host: process.env.N8N_SMTP_HOST as string,
	port: process.env.N8N_SMTP_PORT as unknown as number,
	secure: process.env.N8N_SMTP_SSL === 'true',
};

const DEFAULT_INSTANCE_SMTP_SENDER = 'no-reply@local.n8n';

// TODO: This should be abstracted into a utility function to share with the send operation
export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const nodeVersion = this.getNode().typeVersion;
	const instanceId = this.getInstanceId();

	const returnData: INodeExecutionData[] = [];
	let item: INodeExecutionData;

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		try {
			item = items[itemIndex];

			const fromEmail = process.env.N8N_SMTP_SENDER ?? DEFAULT_INSTANCE_SMTP_SENDER;
			const toEmail = this.getNodeParameter('toEmail', itemIndex) as string;
			const subject = this.getNodeParameter('subject', itemIndex) as string;
			const emailFormat = this.getNodeParameter('emailFormat', itemIndex) as string;
			const options = this.getNodeParameter('options', itemIndex, {}) as EmailSendOptions;

			const transporter = configureTransport(instanceSmtpCredentials, options);

			const mailOptions: IDataObject = {
				from: fromEmail,
				to: toEmail,
				subject,
				replyTo: options.replyTo,
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
				const link = createUtmCampaignLink('n8n-nodes-base.emailSend', instanceId);
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
