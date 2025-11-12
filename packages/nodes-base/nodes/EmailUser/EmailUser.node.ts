import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { Container } from '@n8n/di';
import { GlobalConfig } from '@n8n/config';
import { UserRepository } from '@n8n/db';
import { createTransport } from 'nodemailer';
import type { Transporter } from 'nodemailer';

export class EmailUser implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Email User',
		name: 'emailUser',
		icon: 'fa:envelope',
		group: ['output'],
		version: 1,
		description:
			'Send an email to any user in this n8n instance using the configured SMTP settings',
		defaults: {
			name: 'Email User',
			color: '#00bb88',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName:
					'This node requires SMTP settings to be configured in your n8n environment variables. <a href="https://docs.n8n.io/hosting/configuration/environment-variables/user-management-smtp-2fa/" target="_blank">Learn more</a>',
				name: 'smtpRequirementNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Recipient',
				name: 'recipient',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				required: true,
				description: 'The user to send the email to',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. Important notification',
				description: 'The subject line of the email',
			},
			{
				displayName: 'Email Format',
				name: 'emailFormat',
				type: 'options',
				options: [
					{
						name: 'Text',
						value: 'text',
						description: 'Send as plain text',
					},
					{
						name: 'HTML',
						value: 'html',
						description: 'Send as HTML',
					},
					{
						name: 'Both',
						value: 'both',
						description: 'Send both plain text and HTML versions',
					},
				],
				default: 'html',
				description: 'The format of the email to send',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				default: '',
				required: true,
				description: 'Plain text message',
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
				required: true,
				description: 'HTML message',
				displayOptions: {
					show: {
						emailFormat: ['html', 'both'],
					},
				},
			},
		],
	};

	methods = {
		loadOptions: {
			async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				try {
					const userRepository = Container.get(UserRepository);

					// Get all users with their IDs and emails
					const users = await userRepository.find({
						select: ['id', 'email', 'firstName', 'lastName'],
						where: {
							disabled: false,
						},
					});

					// Map to options format
					return users
						.filter((user) => user.email) // Only include users with email addresses
						.map((user) => {
							const displayName =
								user.firstName && user.lastName
									? `${user.firstName} ${user.lastName} (${user.email})`
									: user.email;

							return {
								name: displayName,
								value: user.id,
							};
						});
				} catch (error) {
					throw new NodeOperationError(this.getNode(), 'Failed to load users from the instance', {
						description: error.message,
					});
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Check if SMTP is configured
		const globalConfig = Container.get(GlobalConfig);
		const smtpConfig = globalConfig.userManagement.emails.smtp;

		const isEmailSetUp =
			globalConfig.userManagement.emails.mode === 'smtp' && smtpConfig.host !== '';

		if (!isEmailSetUp) {
			throw new NodeOperationError(this.getNode(), 'SMTP is not configured for this n8n instance', {
				description:
					'Please configure the SMTP settings in your environment variables. See https://docs.n8n.io/hosting/configuration/environment-variables/user-management-smtp-2fa/',
			});
		}

		// Create nodemailer transporter
		const transporter: Transporter = createTransport({
			host: smtpConfig.host,
			port: smtpConfig.port,
			secure: smtpConfig.secure,
			auth: smtpConfig.auth.user
				? {
						user: smtpConfig.auth.user,
						pass: smtpConfig.auth.pass,
					}
				: undefined,
		});

		const userRepository = Container.get(UserRepository);

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const recipientId = this.getNodeParameter('recipient', itemIndex) as string;
				const subject = this.getNodeParameter('subject', itemIndex) as string;
				const emailFormat = this.getNodeParameter('emailFormat', itemIndex) as string;

				// Get the recipient user
				const recipient = await userRepository.findOne({
					where: { id: recipientId },
					select: ['id', 'email', 'firstName', 'lastName'],
				});

				if (!recipient || !recipient.email) {
					throw new NodeOperationError(
						this.getNode(),
						`User with ID ${recipientId} not found or has no email address`,
						{ itemIndex },
					);
				}

				let htmlContent = '';
				let textContent = '';

				if (emailFormat === 'html' || emailFormat === 'both') {
					htmlContent = this.getNodeParameter('html', itemIndex) as string;
				}

				if (emailFormat === 'text' || emailFormat === 'both') {
					textContent = this.getNodeParameter('text', itemIndex) as string;
				}

				// Prepare email options
				const mailOptions: any = {
					from: smtpConfig.sender || smtpConfig.auth.user,
					to: recipient.email,
					subject,
				};

				if (emailFormat === 'html') {
					mailOptions.html = htmlContent;
				} else if (emailFormat === 'text') {
					mailOptions.text = textContent;
				} else if (emailFormat === 'both') {
					mailOptions.html = htmlContent;
					mailOptions.text = textContent;
				}

				// Send the email
				const result = await transporter.sendMail(mailOptions);

				returnData.push({
					json: {
						success: true,
						messageId: result.messageId,
						recipient: recipient.email,
						recipientName:
							recipient.firstName && recipient.lastName
								? `${recipient.firstName} ${recipient.lastName}`
								: recipient.email,
						subject,
						response: result.response,
					},
					pairedItem: itemIndex,
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: this.getInputData(itemIndex)[0].json,
						error,
						pairedItem: itemIndex,
					});
					continue;
				}

				if (error.context) {
					error.context.itemIndex = itemIndex;
					throw error;
				}

				throw new NodeOperationError(this.getNode(), error, {
					itemIndex,
				});
			}
		}

		return [returnData];
	}
}
