import { Logger } from '@n8n/backend-common';
import { OutboundHttp, type CustomFetch } from '@n8n/backend-network';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { MailData, SendEmailResult } from './interfaces';

const LOGIN_HOST = 'https://login.microsoftonline.com';
const GRAPH_HOST = 'https://graph.microsoft.com/v1.0';
// Refresh the token this many ms before it actually expires.
const TOKEN_EXPIRY_SKEW_MS = 60_000;

/**
 * Sends transactional email through the Microsoft Graph API using the
 * OAuth2 client-credentials (app-only) flow. Mirrors NodeMailer's public
 * surface so UserManagementMailer can use either interchangeably.
 */
@Service()
export class GraphMailer {
	readonly sender: string;

	private readonly config: GlobalConfig['userManagement']['emails']['microsoftGraph'];

	private accessToken?: { value: string; expiresAt: number };

	private logoAttachment?: Record<string, unknown>;

	// Proxy-aware (HTTP(S)_PROXY / NO_PROXY) fetch routed through the single
	// outbound transport, so token + Graph calls honor instance proxy settings.
	// SSRF stays disabled: targets are fixed Microsoft hosts.
	private readonly fetch: CustomFetch;

	constructor(
		globalConfig: GlobalConfig,
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		outboundHttp: OutboundHttp,
	) {
		this.config = globalConfig.userManagement.emails.microsoftGraph;
		this.sender = this.config.sender;
		this.fetch = outboundHttp.transport({ proxy: 'env', ssrf: 'disabled' }).asCustomFetch();
	}

	async sendMail(mailData: MailData): Promise<SendEmailResult> {
		try {
			const token = await this.getAccessToken();
			const recipients = (
				Array.isArray(mailData.emailRecipients)
					? mailData.emailRecipients
					: [mailData.emailRecipients]
			).map((address) => ({ emailAddress: { address } }));

			const body =
				typeof mailData.body === 'string' ? mailData.body : mailData.body.toString('utf-8');

			const response = await this.fetch(
				`${GRAPH_HOST}/users/${encodeURIComponent(this.sender)}/sendMail`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						message: {
							subject: mailData.subject,
							body: { contentType: 'HTML', content: body },
							toRecipients: recipients,
							attachments: [this.getLogoAttachment()],
						},
						saveToSentItems: false,
					}),
				},
			);

			if (!response.ok) {
				const detail = await response.text();
				throw new Error(`Microsoft Graph sendMail failed (${response.status}): ${detail}`);
			}

			this.logger.debug(
				`Email sent successfully to the following recipients: ${mailData.emailRecipients.toString()}`,
			);
		} catch (error) {
			this.errorReporter.error(error);
			this.logger.error('Failed to send email via Microsoft Graph', {
				recipients: mailData.emailRecipients,
				error: error as Error,
			});
			throw error;
		}

		return { emailSent: true };
	}

	private async getAccessToken(): Promise<string> {
		const now = Date.now();
		if (this.accessToken && this.accessToken.expiresAt - TOKEN_EXPIRY_SKEW_MS > now) {
			return this.accessToken.value;
		}

		const response = await this.fetch(`${LOGIN_HOST}/${this.config.tenantId}/oauth2/v2.0/token`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				client_id: this.config.clientId,
				client_secret: this.config.clientSecret,
				scope: 'https://graph.microsoft.com/.default',
				grant_type: 'client_credentials',
			}),
		});

		if (!response.ok) {
			throw new Error(
				`Microsoft Graph token request failed (${response.status}): ${await response.text()}`,
			);
		}

		const token = (await response.json()) as { access_token: string; expires_in: number };
		this.accessToken = {
			value: token.access_token,
			expiresAt: now + token.expires_in * 1000,
		};
		return this.accessToken.value;
	}

	// Inline logo so templates' `cid:n8n-logo` references render. Read once.
	private getLogoAttachment(): Record<string, unknown> {
		if (!this.logoAttachment) {
			const logo = readFileSync(path.resolve(__dirname, 'templates/n8n-logo.png'));
			this.logoAttachment = {
				'@odata.type': '#microsoft.graph.fileAttachment',
				name: 'n8n-logo.png',
				contentId: 'n8n-logo',
				isInline: true,
				contentType: 'image/png',
				contentBytes: logo.toString('base64'),
			};
		}
		return this.logoAttachment;
	}
}
