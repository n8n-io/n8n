/**
 * Send Email Node - Version 1
 * Sends an Email
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

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

export interface EmailSendV1Credentials {
	smtp: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface EmailSendV1NodeBase {
	type: 'n8n-nodes-base.emailSend';
	version: 1;
	credentials?: EmailSendV1Credentials;
}

export type EmailSendV1ParamsNode = EmailSendV1NodeBase & {
	config: NodeConfig<EmailSendV1Params>;
};

export type EmailSendV1Node = EmailSendV1ParamsNode;