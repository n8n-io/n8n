/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { createTransport, Transporter } from 'nodemailer';
import { ErrorReporterProxy as ErrorReporter, LoggerProxy as Logger } from 'n8n-workflow';
import config from '@/config';
import { MailData, SendEmailResult, UserManagementMailerImplementation } from './Interfaces';

export class NodeMailer implements UserManagementMailerImplementation {
	private transport: Transporter;

	constructor() {
		this.transport = createTransport({
			host: config.getEnv('userManagement.emails.smtp.host'),
			port: config.getEnv('userManagement.emails.smtp.port'),
			secure: config.getEnv('userManagement.emails.smtp.secure'),
			auth: {
				user: config.getEnv('userManagement.emails.smtp.auth.user'),
				pass: config.getEnv('userManagement.emails.smtp.auth.pass'),
			},
		});
	}

	async verifyConnection(): Promise<void> {
		const host = config.getEnv('userManagement.emails.smtp.host');
		const user = config.getEnv('userManagement.emails.smtp.auth.user');
		const pass = config.getEnv('userManagement.emails.smtp.auth.pass');

		try {
			await this.transport.verify();
		} catch (error) {
			const message: string[] = [];
			if (!host) message.push('SMTP host not defined (N8N_SMTP_HOST).');
			if (!user) message.push('SMTP user not defined (N8N_SMTP_USER).');
			if (!pass) message.push('SMTP pass not defined (N8N_SMTP_PASS).');
			throw message.length ? new Error(message.join(' '), { cause: error }) : error;
		}
	}

	async sendMail(mailData: MailData): Promise<SendEmailResult> {
		let sender = config.getEnv('userManagement.emails.smtp.sender');
		const user = config.getEnv('userManagement.emails.smtp.auth.user');

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
			ErrorReporter.error(error);
			Logger.error('Failed to send email', { recipients: mailData.emailRecipients, error });
			return {
				success: false,
				error,
			};
		}

		return { success: true };
	}
}
