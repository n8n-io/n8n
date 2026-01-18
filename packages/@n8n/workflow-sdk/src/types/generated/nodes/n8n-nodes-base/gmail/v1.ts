/**
 * Gmail Node - Version 1
 * Consume the Gmail API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type GmailV1DraftCreateConfig = {
	resource: 'draft';
	operation: 'create';
	subject: string | Expression<string>;
/**
 * Whether the message should also be included as HTML
 * @displayOptions.show { resource: ["draft"], operation: ["create"] }
 * @default false
 */
		includeHtml?: boolean | Expression<boolean>;
/**
 * The HTML message body
 * @displayOptions.show { includeHtml: [true], resource: ["draft"], operation: ["create"] }
 */
		htmlMessage: string | Expression<string>;
/**
 * The message body. If HTML formatted, then you have to add and activate the option "HTML content" in the "Additional Options" section.
 * @displayOptions.show { resource: ["draft"], operation: ["create"] }
 */
		message: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type GmailV1DraftDeleteConfig = {
	resource: 'draft';
	operation: 'delete';
	messageId: string | Expression<string>;
};

export type GmailV1DraftGetConfig = {
	resource: 'draft';
	operation: 'get';
	messageId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type GmailV1DraftGetAllConfig = {
	resource: 'draft';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["draft"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["draft"], returnAll: [false] }
 * @default 10
 */
		limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

export type GmailV1LabelCreateConfig = {
	resource: 'label';
	operation: 'create';
/**
 * Label Name
 * @displayOptions.show { resource: ["label"], operation: ["create"] }
 */
		name: string | Expression<string>;
/**
 * The visibility of the label in the label list in the Gmail web interface
 * @displayOptions.show { resource: ["label"], operation: ["create"] }
 * @default labelShow
 */
		labelListVisibility: 'labelHide' | 'labelShow' | 'labelShowIfUnread' | Expression<string>;
/**
 * The visibility of messages with this label in the message list in the Gmail web interface
 * @displayOptions.show { resource: ["label"], operation: ["create"] }
 * @default show
 */
		messageListVisibility: 'hide' | 'show' | Expression<string>;
};

export type GmailV1LabelDeleteConfig = {
	resource: 'label';
	operation: 'delete';
/**
 * The ID of the label
 * @displayOptions.show { resource: ["label"], operation: ["get", "delete"] }
 */
		labelId: string | Expression<string>;
};

export type GmailV1LabelGetConfig = {
	resource: 'label';
	operation: 'get';
/**
 * The ID of the label
 * @displayOptions.show { resource: ["label"], operation: ["get", "delete"] }
 */
		labelId: string | Expression<string>;
};

export type GmailV1LabelGetAllConfig = {
	resource: 'label';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["label"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["label"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

export type GmailV1MessageDeleteConfig = {
	resource: 'message';
	operation: 'delete';
	messageId: string | Expression<string>;
};

export type GmailV1MessageGetConfig = {
	resource: 'message';
	operation: 'get';
	messageId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type GmailV1MessageGetAllConfig = {
	resource: 'message';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["message"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["message"], returnAll: [false] }
 * @default 10
 */
		limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

export type GmailV1MessageReplyConfig = {
	resource: 'message';
	operation: 'reply';
	threadId: string | Expression<string>;
	messageId: string | Expression<string>;
	subject: string | Expression<string>;
/**
 * Whether the message should also be included as HTML
 * @displayOptions.show { resource: ["message"], operation: ["send", "reply"] }
 * @default false
 */
		includeHtml?: boolean | Expression<boolean>;
/**
 * The HTML message body
 * @displayOptions.show { includeHtml: [true], resource: ["message"], operation: ["reply", "send"] }
 */
		htmlMessage: string | Expression<string>;
/**
 * Plain text message body
 * @displayOptions.show { resource: ["message"], operation: ["reply", "send"] }
 */
		message: string | Expression<string>;
/**
 * The email addresses of the recipients
 * @displayOptions.show { resource: ["message"], operation: ["reply", "send"] }
 * @default []
 */
		toList: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type GmailV1MessageSendConfig = {
	resource: 'message';
	operation: 'send';
	subject: string | Expression<string>;
/**
 * Whether the message should also be included as HTML
 * @displayOptions.show { resource: ["message"], operation: ["send", "reply"] }
 * @default false
 */
		includeHtml?: boolean | Expression<boolean>;
/**
 * The HTML message body
 * @displayOptions.show { includeHtml: [true], resource: ["message"], operation: ["reply", "send"] }
 */
		htmlMessage: string | Expression<string>;
/**
 * Plain text message body
 * @displayOptions.show { resource: ["message"], operation: ["reply", "send"] }
 */
		message: string | Expression<string>;
/**
 * The email addresses of the recipients
 * @displayOptions.show { resource: ["message"], operation: ["reply", "send"] }
 * @default []
 */
		toList: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type GmailV1MessageLabelAddConfig = {
	resource: 'messageLabel';
	operation: 'add';
	messageId: string | Expression<string>;
/**
 * The ID of the label. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["messageLabel"], operation: ["add", "remove"] }
 * @default []
 */
		labelIds: string[];
};

export type GmailV1MessageLabelRemoveConfig = {
	resource: 'messageLabel';
	operation: 'remove';
	messageId: string | Expression<string>;
/**
 * The ID of the label. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["messageLabel"], operation: ["add", "remove"] }
 * @default []
 */
		labelIds: string[];
};

export type GmailV1Params =
	| GmailV1DraftCreateConfig
	| GmailV1DraftDeleteConfig
	| GmailV1DraftGetConfig
	| GmailV1DraftGetAllConfig
	| GmailV1LabelCreateConfig
	| GmailV1LabelDeleteConfig
	| GmailV1LabelGetConfig
	| GmailV1LabelGetAllConfig
	| GmailV1MessageDeleteConfig
	| GmailV1MessageGetConfig
	| GmailV1MessageGetAllConfig
	| GmailV1MessageReplyConfig
	| GmailV1MessageSendConfig
	| GmailV1MessageLabelAddConfig
	| GmailV1MessageLabelRemoveConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GmailV1Credentials {
	googleApi: CredentialReference;
	gmailOAuth2: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type GmailV1Node = {
	type: 'n8n-nodes-base.gmail';
	version: 1;
	config: NodeConfig<GmailV1Params>;
	credentials?: GmailV1Credentials;
};