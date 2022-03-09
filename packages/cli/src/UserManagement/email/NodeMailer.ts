/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { createTransport, Transporter } from 'nodemailer';
import { LoggerProxy as Logger } from 'n8n-workflow';
import config = require('../../../config');
import { MailData, SendEmailResult, UserManagementMailerImplementation } from './Interfaces';

export class NodeMailer implements UserManagementMailerImplementation {
	private transport: Transporter;

	constructor() {
		this.transport = createTransport({
			host: config.get('userManagement.emails.smtp.host'),
			port: config.get('userManagement.emails.smtp.port'),
			secure: config.get('userManagement.emails.smtp.secure'),
			auth: {
				user: config.get('userManagement.emails.smtp.auth.user'),
				pass: config.get('userManagement.emails.smtp.auth.pass'),
			},
		});
	}

	async verifyConnection(): Promise<void> {
		const host = config.get('userManagement.emails.smtp.host') as string;
		const user = config.get('userManagement.emails.smtp.auth.user') as string;
		const pass = config.get('userManagement.emails.smtp.auth.pass') as string;

		return new Promise((resolve, reject) => {
			this.transport.verify((error: Error) => {
				if (!error) {
					resolve();
					return;
				}

				const message = [];

				if (!host) message.push('SMTP host not defined (N8N_SMTP_HOST).');
				if (!user) message.push('SMTP user not defined (N8N_SMTP_USER).');
				if (!pass) message.push('SMTP pass not defined (N8N_SMTP_PASS).');

				reject(new Error(message.length ? message.join(' ') : error.message));
			});
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
