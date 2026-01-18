/**
 * Mailgun Node Types
 *
 * Sends an email via Mailgun
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/mailgun/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

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

export type MailgunV1Node = {
	type: 'n8n-nodes-base.mailgun';
	version: 1;
	config: NodeConfig<MailgunV1Params>;
	credentials?: MailgunV1Credentials;
};

export type MailgunNode = MailgunV1Node;
