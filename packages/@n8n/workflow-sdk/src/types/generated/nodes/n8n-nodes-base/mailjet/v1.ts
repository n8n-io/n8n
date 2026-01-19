/**
 * Mailjet Node - Version 1
 * Consume Mailjet API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Send a email */
export type MailjetV1EmailSendConfig = {
	resource: 'email';
	operation: 'send';
/**
 * The title for the email
 * @displayOptions.show { resource: ["email"], operation: ["send"] }
 */
		fromEmail: string | Expression<string>;
/**
 * Email address of the recipient. Multiple ones can be separated by comma.
 * @displayOptions.show { resource: ["email"], operation: ["send"] }
 */
		toEmail: string | Expression<string>;
/**
 * Subject line of the email
 */
		subject?: string | Expression<string>;
/**
 * Plain text message of email
 * @displayOptions.show { resource: ["email"], operation: ["send"] }
 */
		text?: string | Expression<string>;
/**
 * HTML text message of email
 * @displayOptions.show { resource: ["email"], operation: ["send"] }
 */
		html?: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
/**
 * HTML text message of email
 * @displayOptions.show { resource: ["email"], operation: ["send"], jsonParameters: [true] }
 */
		variablesJson?: string | Expression<string>;
	variablesUi?: {
		variablesValues?: Array<{
			/** Name
			 */
			name?: string | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
		}>;
	};
};

/** Send a email template */
export type MailjetV1EmailSendTemplateConfig = {
	resource: 'email';
	operation: 'sendTemplate';
/**
 * Subject line of the email
 */
		subject?: string | Expression<string>;
/**
 * The title for the email
 * @displayOptions.show { resource: ["email"], operation: ["sendTemplate"] }
 */
		fromEmail: string | Expression<string>;
/**
 * Email address of the recipient. Multiple ones can be separated by comma.
 * @displayOptions.show { resource: ["email"], operation: ["sendTemplate"] }
 */
		toEmail: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["email"], operation: ["sendTemplate"] }
 */
		templateId: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
	variablesUi?: {
		variablesValues?: Array<{
			/** Name
			 */
			name?: string | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
		}>;
	};
/**
 * HTML text message of email
 * @displayOptions.show { resource: ["email"], operation: ["sendTemplate"], jsonParameters: [true] }
 */
		variablesJson?: string | Expression<string>;
};

/** Send a email */
export type MailjetV1SmsSendConfig = {
	resource: 'sms';
	operation: 'send';
/**
 * Subject line of the email
 */
		subject?: string | Expression<string>;
/**
 * Customizable sender name. Should be between 3 and 11 characters in length, only alphanumeric characters are allowed.
 * @displayOptions.show { resource: ["sms"], operation: ["send"] }
 */
		from: string | Expression<string>;
/**
 * Message recipient. Should be between 3 and 15 characters in length. The number always starts with a plus sign followed by a country code, followed by the number. Phone numbers are expected to comply with the E.164 format.
 * @displayOptions.show { resource: ["sms"], operation: ["send"] }
 */
		to: string | Expression<string>;
	text: string | Expression<string>;
};


// ===========================================================================
// Output Types
// ===========================================================================

export type MailjetV1EmailSendOutput = {
	Bcc?: Array<{
		Email?: string;
		MessageHref?: string;
		MessageID?: number;
		MessageUUID?: string;
	}>;
	Cc?: Array<{
		Email?: string;
		MessageHref?: string;
		MessageID?: number;
		MessageUUID?: string;
	}>;
	CustomID?: string;
	Status?: string;
	To?: Array<{
		Email?: string;
		MessageHref?: string;
		MessageID?: number;
		MessageUUID?: string;
	}>;
};

export type MailjetV1EmailSendTemplateOutput = {
	Bcc?: Array<{
		Email?: string;
		MessageHref?: string;
		MessageID?: number;
		MessageUUID?: string;
	}>;
	Cc?: Array<{
		Email?: string;
		MessageHref?: string;
		MessageID?: number;
		MessageUUID?: string;
	}>;
	CustomID?: string;
	Status?: string;
	To?: Array<{
		Email?: string;
		MessageHref?: string;
		MessageID?: number;
		MessageUUID?: string;
	}>;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface MailjetV1Credentials {
	mailjetEmailApi: CredentialReference;
	mailjetSmsApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface MailjetV1NodeBase {
	type: 'n8n-nodes-base.mailjet';
	version: 1;
	credentials?: MailjetV1Credentials;
}

export type MailjetV1EmailSendNode = MailjetV1NodeBase & {
	config: NodeConfig<MailjetV1EmailSendConfig>;
	output?: MailjetV1EmailSendOutput;
};

export type MailjetV1EmailSendTemplateNode = MailjetV1NodeBase & {
	config: NodeConfig<MailjetV1EmailSendTemplateConfig>;
	output?: MailjetV1EmailSendTemplateOutput;
};

export type MailjetV1SmsSendNode = MailjetV1NodeBase & {
	config: NodeConfig<MailjetV1SmsSendConfig>;
};

export type MailjetV1Node =
	| MailjetV1EmailSendNode
	| MailjetV1EmailSendTemplateNode
	| MailjetV1SmsSendNode
	;