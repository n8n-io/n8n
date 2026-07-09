import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import pick from 'lodash/pick';
import { ErrorReporter } from 'n8n-core';
import path from 'node:path';
import type { Transporter } from 'nodemailer';
import { createTransport } from 'nodemailer';
import type SMTPConnection from 'nodemailer/lib/smtp-connection';

import type { MailData, SendEmailResult } from './interfaces';

@Service()
export class NodeMailer {
	readonly sender: string;

	private transport: Transporter;

	constructor(
		globalConfig: GlobalConfig,
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
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
			const plainText =
				mailData.textOnly ??
				(typeof mailData.body === 'string' ? this.htmlToPlainText(mailData.body) : undefined);

			await this.transport.sendMail({
				from: this.sender,
				to: mailData.emailRecipients,
				subject: mailData.subject,
				text: plainText,
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
			this.errorReporter.error(error);
			this.logger.error('Failed to send email', {
				recipients: mailData.emailRecipients,
				error: error as Error,
			});
			throw error;
		}

		return { emailSent: true };
	}

	private htmlToPlainText(html: string): string {
		return (
			html
				// Remove non-visible content
				.replace(/<head[\s\S]*?<\/head>/gi, '')
				.replace(/<script[\s\S]*?<\/script>/gi, '')
				.replace(/<style[\s\S]*?<\/style>/gi, '')
				// Convert links and buttons to "text (url)" format
				.replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
				.replace(/<mj-button\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/mj-button>/gi, '$2 ($1)')
				// Replace <br> and block-level closing tags with newlines
				.replace(/<br\s*\/?>/gi, '\n')
				.replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
				// Strip remaining HTML tags
				.replace(/<[^>]+>/g, '')
				// Decode common HTML entities
				.replace(/&amp;/g, '&')
				.replace(/&lt;/g, '<')
				.replace(/&gt;/g, '>')
				.replace(/&quot;/g, '"')
				.replace(/&#039;/g, "'")
				.replace(/&nbsp;/g, ' ')
				// Trim leading whitespace from each line
				.replace(/^[\t ]+/gm, '')
				// Collapse multiple blank lines
				.replace(/\n{3,}/g, '\n\n')
				.trim()
		);
	}
}
