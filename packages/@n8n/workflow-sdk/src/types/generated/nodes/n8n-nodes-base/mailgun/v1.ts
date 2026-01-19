/**
 * Mailgun Node - Version 1
 * Sends an email via Mailgun
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface MailgunV1Params {
/**
 * Email address of the sender optional with name
 */
		fromEmail: string | Expression<string>;
/**
 * Email address of the recipient. Multiple ones can be separated by comma.
 */
		toEmail: string | Expression<string>;
/**
 * Cc Email address of the recipient. Multiple ones can be separated by comma.
 */
		ccEmail?: string | Expression<string>;
/**
 * Bcc Email address of the recipient. Multiple ones can be separated by comma.
 */
		bccEmail?: string | Expression<string>;
/**
 * Subject line of the email
 */
		subject?: string | Expression<string>;
/**
 * Plain text message of email
 */
		text?: string | Expression<string>;
/**
 * HTML text message of email
 */
		html?: string | Expression<string>;
/**
 * Name of the binary properties which contain data which should be added to email as attachment. Multiple ones can be comma-separated.
 */
		attachments?: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface MailgunV1Credentials {
	mailgunApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface MailgunV1NodeBase {
	type: 'n8n-nodes-base.mailgun';
	version: 1;
	credentials?: MailgunV1Credentials;
}

export type MailgunV1ParamsNode = MailgunV1NodeBase & {
	config: NodeConfig<MailgunV1Params>;
};

export type MailgunV1Node = MailgunV1ParamsNode;