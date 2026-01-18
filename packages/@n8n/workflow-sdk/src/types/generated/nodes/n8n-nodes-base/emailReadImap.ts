/**
 * Email Trigger (IMAP) Node Types
 *
 * Triggers the workflow when a new email is received
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/emailreadimap/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface EmailReadImapV21Params {
	mailbox?: string | Expression<string>;
	/**
	 * What to do after the email has been received. If "nothing" gets selected it will be processed multiple times.
	 * @default read
	 */
	postProcessAction?: 'read' | 'nothing' | Expression<string>;
	/**
	 * Whether attachments of emails should be downloaded. Only set if needed as it increases processing.
	 * @displayOptions.show { format: ["simple"] }
	 * @default false
	 */
	downloadAttachments?: boolean | Expression<boolean>;
	/**
	 * The format to return the message in
	 * @default simple
	 */
	format?: 'raw' | 'resolved' | 'simple' | Expression<string>;
	/**
	 * Prefix for name of the binary property to which to write the attachments. An index starting with 0 will be added. So if name is "attachment_" the first attachment is saved to "attachment_0"
	 * @displayOptions.show { format: ["resolved"] }
	 * @default attachment_
	 */
	dataPropertyAttachmentsPrefixName?: string | Expression<string>;
	options?: Record<string, unknown>;
}

export interface EmailReadImapV1Params {
	mailbox?: string | Expression<string>;
	/**
	 * What to do after the email has been received. If "nothing" gets selected it will be processed multiple times.
	 * @default read
	 */
	postProcessAction?: 'read' | 'nothing' | Expression<string>;
	/**
	 * Whether attachments of emails should be downloaded. Only set if needed as it increases processing.
	 * @displayOptions.show { format: ["simple"] }
	 * @default false
	 */
	downloadAttachments?: boolean | Expression<boolean>;
	/**
	 * The format to return the message in
	 * @default simple
	 */
	format?: 'raw' | 'resolved' | 'simple' | Expression<string>;
	/**
	 * Prefix for name of the binary property to which to write the attachments. An index starting with 0 will be added. So if name is "attachment_" the first attachment is saved to "attachment_0"
	 * @displayOptions.show { format: ["resolved"] }
	 * @default attachment_
	 */
	dataPropertyAttachmentsPrefixName?: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface EmailReadImapV21Credentials {
	imap: CredentialReference;
}

export interface EmailReadImapV1Credentials {
	imap: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type EmailReadImapV21Node = {
	type: 'n8n-nodes-base.emailReadImap';
	version: 2 | 2.1;
	config: NodeConfig<EmailReadImapV21Params>;
	credentials?: EmailReadImapV21Credentials;
	isTrigger: true;
};

export type EmailReadImapV1Node = {
	type: 'n8n-nodes-base.emailReadImap';
	version: 1;
	config: NodeConfig<EmailReadImapV1Params>;
	credentials?: EmailReadImapV1Credentials;
	isTrigger: true;
};

export type EmailReadImapNode = EmailReadImapV21Node | EmailReadImapV1Node;
