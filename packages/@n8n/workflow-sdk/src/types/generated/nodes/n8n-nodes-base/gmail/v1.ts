/**
 * Gmail Node - Version 1
 * Consume the Gmail API
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


// ===========================================================================
// Credentials
// ===========================================================================

export interface GmailV1Credentials {
	googleApi: CredentialReference;
	gmailOAuth2: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GmailV1NodeBase {
	type: 'n8n-nodes-base.gmail';
	version: 1;
	credentials?: GmailV1Credentials;
}

export type GmailV1DraftCreateNode = GmailV1NodeBase & {
	config: NodeConfig<GmailV1DraftCreateConfig>;
};

export type GmailV1DraftDeleteNode = GmailV1NodeBase & {
	config: NodeConfig<GmailV1DraftDeleteConfig>;
};

export type GmailV1DraftGetNode = GmailV1NodeBase & {
	config: NodeConfig<GmailV1DraftGetConfig>;
};

export type GmailV1DraftGetAllNode = GmailV1NodeBase & {
	config: NodeConfig<GmailV1DraftGetAllConfig>;
};

export type GmailV1LabelCreateNode = GmailV1NodeBase & {
	config: NodeConfig<GmailV1LabelCreateConfig>;
};

export type GmailV1LabelDeleteNode = GmailV1NodeBase & {
	config: NodeConfig<GmailV1LabelDeleteConfig>;
};

export type GmailV1LabelGetNode = GmailV1NodeBase & {
	config: NodeConfig<GmailV1LabelGetConfig>;
};

export type GmailV1LabelGetAllNode = GmailV1NodeBase & {
	config: NodeConfig<GmailV1LabelGetAllConfig>;
};

export type GmailV1MessageDeleteNode = GmailV1NodeBase & {
	config: NodeConfig<GmailV1MessageDeleteConfig>;
};

export type GmailV1MessageGetNode = GmailV1NodeBase & {
	config: NodeConfig<GmailV1MessageGetConfig>;
};

export type GmailV1MessageGetAllNode = GmailV1NodeBase & {
	config: NodeConfig<GmailV1MessageGetAllConfig>;
};

export type GmailV1MessageReplyNode = GmailV1NodeBase & {
	config: NodeConfig<GmailV1MessageReplyConfig>;
};

export type GmailV1MessageSendNode = GmailV1NodeBase & {
	config: NodeConfig<GmailV1MessageSendConfig>;
};

export type GmailV1MessageLabelAddNode = GmailV1NodeBase & {
	config: NodeConfig<GmailV1MessageLabelAddConfig>;
};

export type GmailV1MessageLabelRemoveNode = GmailV1NodeBase & {
	config: NodeConfig<GmailV1MessageLabelRemoveConfig>;
};

export type GmailV1Node =
	| GmailV1DraftCreateNode
	| GmailV1DraftDeleteNode
	| GmailV1DraftGetNode
	| GmailV1DraftGetAllNode
	| GmailV1LabelCreateNode
	| GmailV1LabelDeleteNode
	| GmailV1LabelGetNode
	| GmailV1LabelGetAllNode
	| GmailV1MessageDeleteNode
	| GmailV1MessageGetNode
	| GmailV1MessageGetAllNode
	| GmailV1MessageReplyNode
	| GmailV1MessageSendNode
	| GmailV1MessageLabelAddNode
	| GmailV1MessageLabelRemoveNode
	;