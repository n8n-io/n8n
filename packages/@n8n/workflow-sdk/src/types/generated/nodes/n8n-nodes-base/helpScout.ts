/**
 * Help Scout Node Types
 *
 * Consume Help Scout API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/helpscout/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new conversation */
export type HelpScoutV1ConversationCreateConfig = {
	resource: 'conversation';
	operation: 'create';
	/**
	 * ID of a mailbox where the conversation is being created. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	mailboxId: string | Expression<string>;
	/**
	 * Conversation status
	 */
	status: 'active' | 'closed' | 'pending' | Expression<string>;
	/**
	 * Conversation’s subject
	 */
	subject: string | Expression<string>;
	/**
	 * Conversation type
	 */
	type: 'chat' | 'email' | 'phone' | Expression<string>;
	/**
	 * By default the response only contain the ID to resource. If this option gets activated, it will resolve the data automatically.
	 * @default true
	 */
	resolveData?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
	threadsUi?: {
		threadsValues?: Array<{
			type?: 'chat' | 'customer' | 'note' | 'phone' | 'reply' | Expression<string>;
			text?: string | Expression<string>;
			bcc?: string | Expression<string>;
			cc?: string | Expression<string>;
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 * @default true
	 */
	resolveData?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
	addressUi?: {
		addressValue?: {
			line1?: string | Expression<string>;
			line2?: string | Expression<string>;
			city?: string | Expression<string>;
			state?: string | Expression<string>;
			country?: string | Expression<string>;
			postalCode?: string | Expression<string>;
		};
	};
	chatsUi?: {
		chatsValues?: Array<{
			type?:
				| 'aim'
				| 'gtalk'
				| 'icq'
				| 'msn'
				| 'other'
				| 'qq'
				| 'skype'
				| 'xmpp'
				| 'yahoo'
				| Expression<string>;
			value?: string | Expression<string>;
		}>;
	};
	emailsUi?: {
		emailsValues?: Array<{
			type?: 'home' | 'other' | 'work' | Expression<string>;
			value?: string | Expression<string>;
		}>;
	};
	phonesUi?: {
		phonesValues?: Array<{
			type?: 'fax' | 'home' | 'other' | 'pager' | 'work' | Expression<string>;
			value?: string | Expression<string>;
		}>;
	};
	socialProfilesUi?: {
		socialProfilesValues?: Array<{
			type?:
				| 'aboutMe'
				| 'facebook'
				| 'flickr'
				| 'forsquare'
				| 'google'
				| 'googleplus'
				| 'linkedin'
				| 'other'
				| 'quora'
				| 'tungleme'
				| 'twitter'
				| 'youtube'
				| Expression<string>;
			value?: string | Expression<string>;
		}>;
	};
	websitesUi?: { websitesValues?: Array<{ value?: string | Expression<string> }> };
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	text: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	/**
	 * Array of supported attachments to add to the message
	 * @default {}
	 */
	attachmentsUi?: {
		attachmentsValues?: Array<{
			fileName?: string | Expression<string>;
			mimeType?: string | Expression<string>;
			data?: string | Expression<string>;
		}>;
		attachmentsBinary?: Array<{ property?: string | Expression<string> }>;
	};
};

/** Get many conversations */
export type HelpScoutV1ThreadGetAllConfig = {
	resource: 'thread';
	operation: 'getAll';
	conversationId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	| HelpScoutV1ThreadGetAllConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface HelpScoutV1Credentials {
	helpScoutOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type HelpScoutV1Node = {
	type: 'n8n-nodes-base.helpScout';
	version: 1;
	config: NodeConfig<HelpScoutV1Params>;
	credentials?: HelpScoutV1Credentials;
};

export type HelpScoutNode = HelpScoutV1Node;
