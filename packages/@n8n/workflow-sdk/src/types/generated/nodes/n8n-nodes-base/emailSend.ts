/**
 * Send Email Node Types
 *
 * Sends an email using SMTP protocol
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/emailsend/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface EmailSendV21Params {
	resource?: unknown;
	operation?: 'send' | 'sendAndWait' | Expression<string>;
	/**
	 * Email address of the sender. You can also specify a name: Nathan Doe &lt;nate@n8n.io&gt;.
	 */
	fromEmail: string | Expression<string>;
	/**
	 * Email address of the recipient. You can also specify a name: Nathan Doe &lt;nate@n8n.io&gt;.
	 */
	toEmail: string | Expression<string>;
	/**
	 * Subject line of the email
	 */
	subject?: string | Expression<string>;
	emailFormat?: 'text' | 'html' | 'both' | Expression<string>;
	/**
	 * Plain text message of email
	 */
	text?: string | Expression<string>;
	/**
	 * HTML text message of email
	 */
	html?: string | Expression<string>;
	options?: Record<string, unknown>;
	message: string | Expression<string>;
	responseType?: 'approval' | 'freeText' | 'customForm' | Expression<string>;
	defineForm?: 'fields' | 'json' | Expression<string>;
	jsonOutput?: IDataObject | string | Expression<string>;
	formFields?: Record<string, unknown>;
	approvalOptions?: Record<string, unknown>;
}

export interface EmailSendV1Params {
	/**
	 * Email address of the sender optional with name
	 */
	fromEmail: string | Expression<string>;
	/**
	 * Email address of the recipient
	 */
	toEmail: string | Expression<string>;
	/**
	 * Email address of CC recipient
	 */
	ccEmail?: string | Expression<string>;
	/**
	 * Email address of BCC recipient
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
	 * Name of the binary properties that contain data to add to email as attachment. Multiple ones can be comma-separated.
	 */
	attachments?: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface EmailSendV21Credentials {
	smtp: CredentialReference;
}

export interface EmailSendV1Credentials {
	smtp: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type EmailSendV21Node = {
	type: 'n8n-nodes-base.emailSend';
	version: 2 | 2.1;
	config: NodeConfig<EmailSendV21Params>;
	credentials?: EmailSendV21Credentials;
};

export type EmailSendV1Node = {
	type: 'n8n-nodes-base.emailSend';
	version: 1;
	config: NodeConfig<EmailSendV1Params>;
	credentials?: EmailSendV1Credentials;
};

export type EmailSendNode = EmailSendV21Node | EmailSendV1Node;
