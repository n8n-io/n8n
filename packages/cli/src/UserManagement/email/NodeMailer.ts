/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { createTransport, Transporter } from 'nodemailer';
import { LoggerProxy } from 'n8n-workflow';

import config = require('../../../config');
import { MailData, SendEmailResult, UserManagementMailerImplementation } from './Interfaces';
import { getLogger } from '../../Logger';

LoggerProxy.init(getLogger());

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

	async sendMail(mailData: MailData): Promise<SendEmailResult> {
		try {
			await this.transport.sendMail({
				from: config.get('userManagement.emails.smtp.sender'),
				to: mailData.emailRecipients,
				subject: mailData.subject,
				text: mailData.textOnly,
				html: mailData.body,
			});
			LoggerProxy.verbose('Email sent successfully', { mailData });
		} catch (error) {
			LoggerProxy.verbose('Failed to send email', { mailData, error });
			return {
				success: false,
				error,
			};
		}

		return { success: true };
	}
}
