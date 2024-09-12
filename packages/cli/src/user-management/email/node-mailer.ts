import { GlobalConfig } from '@n8n/config';
import { pick } from 'lodash';
import { ErrorReporterProxy as ErrorReporter } from 'n8n-workflow';
import path from 'node:path';
import type { Transporter } from 'nodemailer';
import { createTransport } from 'nodemailer';
import type SMTPConnection from 'nodemailer/lib/smtp-connection';
import { Service } from 'typedi';

import { Logger } from '@/logger';

import type { MailData, SendEmailResult } from './interfaces';

@Service()
export class NodeMailer {
	readonly sender: string;

	private transport: Transporter;

	constructor(
		globalConfig: GlobalConfig,
		private readonly logger: Logger,
	) {
		const smtpConfig = globalConfig.userManagement.emails.smtp;
		const transportConfig: SMTPConnection.Options = pick(smtpConfig, ['host', 'port', 'secure']);
		transportConfig.ignoreTLS = !smtpConfig.startTLS;

		const { auth } = smtpConfig;
		if (auth.user && auth.pass) {
			transportConfig.auth = pick(auth, ['user', 'pass']);
		}
		if (auth.serviceClient && auth.privateKey) {
			transportConfig.auth = {
				type: 'OAuth2',
				user: auth.user,
				serviceClient: auth.serviceClient,
				privateKey: auth.privateKey.replace(/\\n/g, '\n'),
			};
		}
		this.transport = createTransport(transportConfig);

		this.sender = smtpConfig.sender;
		if (!this.sender && auth.user.includes('@')) {
			this.sender = auth.user;
		}
	}

	async sendMail(mailData: MailData): Promise<SendEmailResult> {
		try {
			await this.transport.sendMail({
				from: this.sender,
				to: mailData.emailRecipients,
				subject: mailData.subject,
				text: mailData.textOnly,
				html: mailData.body,
				attachments: [
					{
						cid: 'n8n-logo',
						filename: 'n8n-logo.png',
						path: path.resolve(__dirname, 'templates/n8n-logo.png'),
						contentDisposition: 'inline',
					},
				],
			});
			this.logger.debug(
				`Email sent successfully to the following recipients: ${mailData.emailRecipients.toString()}`,
			);
		} catch (error) {
			ErrorReporter.error(error);
			this.logger.error('Failed to send email', {
				recipients: mailData.emailRecipients,
				error: error as Error,
			});
			throw error;
		}

		return { emailSent: true };
	}
}
