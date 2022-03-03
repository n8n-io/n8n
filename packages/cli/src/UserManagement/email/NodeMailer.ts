/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { createTransport, Transporter } from 'nodemailer';
import { LoggerProxy as Logger } from 'n8n-workflow';
import config = require('../../../config');
import { MailData, SendEmailResult, UserManagementMailerImplementation } from './Interfaces';

export class NodeMailer implements UserManagementMailerImplementation {
	private transport: Transporter;

	constructor() {
		const host = config.get('userManagement.emails.smtp.host');

		if (!host) {
			throw new Error('No SMTP host specified.');
		}

		this.transport = createTransport({
			host,
			port: config.get('userManagement.emails.smtp.port'),
			secure: config.get('userManagement.emails.smtp.secure'),
			auth: {
				user: config.get('userManagement.emails.smtp.auth.user'),
				pass: config.get('userManagement.emails.smtp.auth.pass'),
			},
		});
	}

	async sendMail(mailData: MailData): Promise<SendEmailResult> {
		let sender = config.get('userManagement.emails.smtp.sender');
		const user = config.get('userManagement.emails.smtp.auth.user') as string;

		if (!sender && user.includes('@')) {
			sender = user;
		}

		try {
			await this.transport.sendMail({
				from: sender,
				to: mailData.emailRecipients,
				subject: mailData.subject,
				text: mailData.textOnly,
				html: mailData.body,
			});
			Logger.verbose(
				`Email sent successfully to the following recipients: ${mailData.emailRecipients.toString()}`,
			);
		} catch (error) {
			Logger.error('Failed to send email', { recipients: mailData.emailRecipients, error });
			return {
				success: false,
				error,
			};
		}

		return { success: true };
	}
}
