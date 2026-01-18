/**
 * Mailjet Node Types
 *
 * Consume Mailjet API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/mailjet/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

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

export type MailjetV1Params =
	| MailjetV1EmailSendConfig
	| MailjetV1EmailSendTemplateConfig
	| MailjetV1SmsSendConfig;

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

export type MailjetV1Node = {
	type: 'n8n-nodes-base.mailjet';
	version: 1;
	config: NodeConfig<MailjetV1Params>;
	credentials?: MailjetV1Credentials;
};

export type MailjetNode = MailjetV1Node;
