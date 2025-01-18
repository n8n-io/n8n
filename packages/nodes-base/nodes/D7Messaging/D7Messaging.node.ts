import type {
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
	IExecuteFunctions,
	NodeConnectionType,
} from 'n8n-workflow';

type TextContent = {
	message_type: 'TEXT';
	text: {
		preview_url: boolean;
		body: string;
	};
};

type MediaContent = {
	message_type: 'ATTACHMENT';
	attachment: {
		type: string;
		url: string;
		caption: string;
	};
};

type TemplateContent = {
	message_type: 'TEMPLATE';
	template: {
		template_id: string;
		language: string;
		body_parameter_values: { [key: string]: string };
		media?: {
			media_type: string;
			media_url: string;
		};
	};
};

type WhatsAppContent = TextContent | MediaContent | TemplateContent;

export class D7Messaging implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'D7 Messaging',
		name: 'd7Messaging',
		icon: 'file:d7.svg',
		group: ['transform'],
		version: 1,
		description: 'Send messages using D7 APIs (SMS & WhatsApp)',
		defaults: {
			name: 'D7 Messaging',
		},
		inputs: ['main' as NodeConnectionType],
		outputs: ['main' as NodeConnectionType],
		credentials: [
			{
				name: 'd7Api',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Channel',
				name: 'channel',
				type: 'options',
				options: [
					{ name: 'SMS', value: 'sms' },
					{ name: 'WhatsApp', value: 'whatsapp' },
				],
				default: 'sms',
				required: true,
			},
			{
				displayName: 'Message Content',
				name: 'content',
				type: 'string',
				default: '',
				description: 'The content of the SMS message',
				displayOptions: {
					show: {
						channel: ['sms'],
					},
				},
			},
			{
				displayName: 'Message Type',
				name: 'messageType',
				type: 'options',
				displayOptions: {
					show: {
						channel: ['whatsapp'],
					},
				},
				options: [
					{ name: 'WhatsApp Marketing Media', value: 'marketingMedia' },
					{ name: 'WhatsApp Marketing Text', value: 'marketingText' },
					{ name: 'WhatsApp Service Media', value: 'serviceMedia' },
					{ name: 'WhatsApp Service Text', value: 'serviceText' },
					{ name: 'WhatsApp Utility Media', value: 'utilityMedia' },
					{ name: 'WhatsApp Utility Text', value: 'utilityText' },
				],
				default: 'utilityText',
			},
			{
				displayName: 'Originator',
				name: 'originator',
				type: 'string',
				default: '',
				description: 'WhatsApp number registered with D7 Networks',
				displayOptions: {
					show: {
						channel: ['whatsapp'],
					},
				},
				required: true,
			},
			{
				displayName: 'Template ID',
				name: 'templateId',
				type: 'string',
				default: '',
				description: 'Template ID from D7 portal',
				displayOptions: {
					show: {
						channel: ['whatsapp'],
						messageType: ['utilityText', 'utilityMedia', 'marketingText', 'marketingMedia'],
					},
				},
				required: true,
			},
			{
				displayName: 'Whether to Preview URL',
				name: 'previewUrl',
				type: 'boolean',
				default: true,
				description: 'Whether to enable URL preview in message',
				displayOptions: {
					show: {
						channel: ['whatsapp'],
						messageType: ['serviceText'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = await this.getCredentials('d7Api');
		const apiKey = credentials.apiKey as string;

		const channel = this.getNodeParameter('channel', 0) as string;
		const recipients = this.getNodeParameter('recipients', 0) as string;

		if (channel === 'sms') {
			const content = this.getNodeParameter('content', 0) as string;

			const messageData = {
				messages: [
					{
						channel: 'sms',
						recipients: recipients.split(','),
						content,
						msg_type: 'text',
						data_coding: 'text',
					},
				],
				message_globals: {
					originator: 'SignOTP',
				},
			};

			const response = await this.helpers.request('https://api.d7networks.com/messages/v1/send', {
				method: 'POST',
				body: JSON.stringify(messageData),
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${apiKey}`,
				},
			});

			return [[{ json: response }]];
		} else {
			const messageType = this.getNodeParameter('messageType', 0) as string;
			const originator = this.getNodeParameter('originator', 0) as string;

			const recipientsList = recipients.split(',').map((recipient) => ({
				recipient: recipient.trim(),
				recipient_type: 'individual',
			}));

			let content: WhatsAppContent;

			if (messageType === 'serviceText') {
				const messageBody = this.getNodeParameter('messageBody', 0) as string;
				const previewUrl = this.getNodeParameter('previewUrl', 0) as boolean;

				content = {
					message_type: 'TEXT',
					text: {
						preview_url: previewUrl,
						body: messageBody,
					},
				};
			} else if (messageType === 'serviceMedia') {
				const mediaUrl = this.getNodeParameter('mediaUrl', 0) as string;
				const mediaType = this.getNodeParameter('mediaType', 0) as string;
				const mediaCaption = this.getNodeParameter('mediaCaption', 0) as string;

				content = {
					message_type: 'ATTACHMENT',
					attachment: {
						type: mediaType,
						url: mediaUrl,
						caption: mediaCaption,
					},
				};
			} else {
				const templateId = this.getNodeParameter('templateId', 0) as string;
				const language = this.getNodeParameter('language', 0) as string;
				const bodyParametersData = this.getNodeParameter('bodyParameters', 0) as {
					parameters: Array<{ key: string; value: string }>;
				};

				const bodyParameterValues: { [key: string]: string } = {};
				if (bodyParametersData.parameters) {
					bodyParametersData.parameters.forEach((param) => {
						bodyParameterValues[param.key] = param.value;
					});
				}

				content = {
					message_type: 'TEMPLATE',
					template: {
						template_id: templateId,
						language,
						body_parameter_values: bodyParameterValues,
					},
				};

				if (messageType.includes('Media')) {
					const mediaUrl = this.getNodeParameter('mediaUrl', 0) as string;
					const mediaType = this.getNodeParameter('mediaType', 0) as string;
					content.template.media = {
						media_type: mediaType,
						media_url: mediaUrl,
					};
				}
			}

			const messageData = {
				messages: [
					{
						originator,
						content,
						recipients: recipientsList,
					},
				],
			};

			const response = await this.helpers.request('https://api.d7networks.com/whatsapp/v2/send', {
				method: 'POST',
				body: JSON.stringify(messageData),
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${apiKey}`,
				},
			});

			return [[{ json: response }]];
		}
	}
}
