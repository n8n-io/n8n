/**
 * Help Scout Node - Version 1
 * Consume Help Scout API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new conversation */
export type HelpScoutV1ConversationCreateConfig = {
	resource: 'conversation';
	operation: 'create';
/**
 * ID of a mailbox where the conversation is being created. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["create"], resource: ["conversation"] }
 */
		mailboxId: string | Expression<string>;
/**
 * Conversation status
 * @displayOptions.show { operation: ["create"], resource: ["conversation"] }
 */
		status: 'active' | 'closed' | 'pending' | Expression<string>;
/**
 * Conversation’s subject
 * @displayOptions.show { operation: ["create"], resource: ["conversation"] }
 */
		subject: string | Expression<string>;
/**
 * Conversation type
 * @displayOptions.show { operation: ["create"], resource: ["conversation"] }
 */
		type: 'chat' | 'email' | 'phone' | Expression<string>;
/**
 * By default the response only contain the ID to resource. If this option gets activated, it will resolve the data automatically.
 * @displayOptions.show { operation: ["create"], resource: ["conversation"] }
 * @default true
 */
		resolveData?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
	threadsUi?: {
		threadsValues?: Array<{
			/** Type
			 */
			type?: 'chat' | 'customer' | 'note' | 'phone' | 'reply' | Expression<string>;
			/** The message text
			 */
			text?: string | Expression<string>;
			/** Email addresses
			 * @displayOptions.show { type: ["customer"] }
			 * @default []
			 */
			bcc?: string | Expression<string>;
			/** Email addresses
			 * @displayOptions.show { type: ["customer"] }
			 * @default []
			 */
			cc?: string | Expression<string>;
			/** Whether true, a draft reply is created
			 * @displayOptions.show { type: ["reply"] }
			 * @default false
			 */
			draft?: boolean | Expression<boolean>;
		}>;
	};
};

/** Delete a conversation */
export type HelpScoutV1ConversationDeleteConfig = {
	resource: 'conversation';
	operation: 'delete';
	conversationId: string | Expression<string>;
};

/** Get a conversation */
export type HelpScoutV1ConversationGetConfig = {
	resource: 'conversation';
	operation: 'get';
	conversationId: string | Expression<string>;
};

/** Get many conversations */
export type HelpScoutV1ConversationGetAllConfig = {
	resource: 'conversation';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["conversation"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["conversation"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Create a new conversation */
export type HelpScoutV1CustomerCreateConfig = {
	resource: 'customer';
	operation: 'create';
/**
 * By default the response only contain the ID to resource. If this option gets activated, it will resolve the data automatically.
 * @displayOptions.show { operation: ["create"], resource: ["customer"] }
 * @default true
 */
		resolveData?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
	addressUi?: {
		addressValue?: {
			/** Line 1
			 */
			line1?: string | Expression<string>;
			/** Line 2
			 */
			line2?: string | Expression<string>;
			/** City
			 */
			city?: string | Expression<string>;
			/** State
			 */
			state?: string | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			country?: string | Expression<string>;
			/** Postal Code
			 */
			postalCode?: string | Expression<string>;
		};
	};
	chatsUi?: {
		chatsValues?: Array<{
			/** Chat type
			 */
			type?: 'aim' | 'gtalk' | 'icq' | 'msn' | 'other' | 'qq' | 'skype' | 'xmpp' | 'yahoo' | Expression<string>;
			/** Chat handle
			 */
			value?: string | Expression<string>;
		}>;
	};
	emailsUi?: {
		emailsValues?: Array<{
			/** Location for this email address
			 */
			type?: 'home' | 'other' | 'work' | Expression<string>;
			/** Email
			 */
			value?: string | Expression<string>;
		}>;
	};
	phonesUi?: {
		phonesValues?: Array<{
			/** Location for this phone
			 */
			type?: 'fax' | 'home' | 'other' | 'pager' | 'work' | Expression<string>;
			/** Phone
			 */
			value?: string | Expression<string>;
		}>;
	};
	socialProfilesUi?: {
		socialProfilesValues?: Array<{
			/** Type of social profile
			 */
			type?: 'aboutMe' | 'facebook' | 'flickr' | 'forsquare' | 'google' | 'googleplus' | 'linkedin' | 'other' | 'quora' | 'tungleme' | 'twitter' | 'youtube' | Expression<string>;
			/** Social Profile handle (URL for example)
			 */
			value?: string | Expression<string>;
		}>;
	};
	websitesUi?: {
		websitesValues?: Array<{
			/** Website URL
			 */
			value?: string | Expression<string>;
		}>;
	};
};

/** Get a conversation */
export type HelpScoutV1CustomerGetConfig = {
	resource: 'customer';
	operation: 'get';
	customerId: string | Expression<string>;
};

/** Get many conversations */
export type HelpScoutV1CustomerGetAllConfig = {
	resource: 'customer';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["customer"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["customer"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Get customer property definitions */
export type HelpScoutV1CustomerPropertiesConfig = {
	resource: 'customer';
	operation: 'properties';
};

/** Update a customer */
export type HelpScoutV1CustomerUpdateConfig = {
	resource: 'customer';
	operation: 'update';
	customerId?: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Get a conversation */
export type HelpScoutV1MailboxGetConfig = {
	resource: 'mailbox';
	operation: 'get';
	mailboxId: string | Expression<string>;
};

/** Get many conversations */
export type HelpScoutV1MailboxGetAllConfig = {
	resource: 'mailbox';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["mailbox"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["mailbox"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Create a new conversation */
export type HelpScoutV1ThreadCreateConfig = {
	resource: 'thread';
	operation: 'create';
	conversationId: string | Expression<string>;
	type: 'chat' | 'customer' | 'note' | 'phone' | 'reply' | Expression<string>;
/**
 * The chat text
 * @displayOptions.show { resource: ["thread"], operation: ["create"] }
 */
		text: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
/**
 * Array of supported attachments to add to the message
 * @displayOptions.show { operation: ["create"], resource: ["thread"] }
 * @default {}
 */
		attachmentsUi?: {
		attachmentsValues?: Array<{
			/** Attachment’s file name
			 */
			fileName?: string | Expression<string>;
			/** Attachment’s mime type
			 */
			mimeType?: string | Expression<string>;
			/** Base64-encoded stream of data
			 */
			data?: string | Expression<string>;
		}>;
		attachmentsBinary?: Array<{
			/** Name of the binary properties which contain data which should be added to email as attachment
			 * @default data
			 */
			property?: string | Expression<string>;
		}>;
	};
};

/** Get many conversations */
export type HelpScoutV1ThreadGetAllConfig = {
	resource: 'thread';
	operation: 'getAll';
	conversationId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["thread"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["thread"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

export type HelpScoutV1Params =
	| HelpScoutV1ConversationCreateConfig
	| HelpScoutV1ConversationDeleteConfig
	| HelpScoutV1ConversationGetConfig
	| HelpScoutV1ConversationGetAllConfig
	| HelpScoutV1CustomerCreateConfig
	| HelpScoutV1CustomerGetConfig
	| HelpScoutV1CustomerGetAllConfig
	| HelpScoutV1CustomerPropertiesConfig
	| HelpScoutV1CustomerUpdateConfig
	| HelpScoutV1MailboxGetConfig
	| HelpScoutV1MailboxGetAllConfig
	| HelpScoutV1ThreadCreateConfig
	| HelpScoutV1ThreadGetAllConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface HelpScoutV1Credentials {
	helpScoutOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type HelpScoutV1Node = {
	type: 'n8n-nodes-base.helpScout';
	version: 1;
	config: NodeConfig<HelpScoutV1Params>;
	credentials?: HelpScoutV1Credentials;
};