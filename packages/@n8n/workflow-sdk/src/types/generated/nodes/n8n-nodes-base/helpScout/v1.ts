/**
 * Help Scout Node - Version 1
 * Consume Help Scout API
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
// Output Types
// ===========================================================================

export type HelpScoutV1ConversationCreateOutput = {
	_links?: {
		closedBy?: {
			href?: string;
		};
		createdByUser?: {
			href?: string;
		};
		mailbox?: {
			href?: string;
		};
		primaryCustomer?: {
			href?: string;
		};
		self?: {
			href?: string;
		};
		threads?: {
			href?: string;
		};
		web?: {
			href?: string;
		};
	};
	closedBy?: number;
	closedByUser?: {
		email?: string;
		first?: string;
		id?: number;
		last?: string;
		type?: string;
	};
	createdAt?: string;
	createdBy?: {
		email?: string;
		first?: string;
		id?: number;
		last?: string;
		photoUrl?: string;
		type?: string;
	};
	customerWaitingSince?: {
		friendly?: string;
		time?: string;
	};
	folderId?: number;
	mailboxId?: number;
	number?: number;
	primaryCustomer?: {
		email?: string;
		first?: string;
		id?: number;
		last?: string;
		photoUrl?: string;
		type?: string;
	};
	source?: {
		type?: string;
		via?: string;
	};
	state?: string;
	status?: string;
	subject?: string;
	tags?: Array<{
		color?: string;
		id?: number;
		tag?: string;
	}>;
	threads?: number;
	type?: string;
	userUpdatedAt?: string;
};

export type HelpScoutV1ConversationGetOutput = {
	_links?: {
		assignee?: {
			href?: string;
		};
		closedBy?: {
			href?: string;
		};
		createdByUser?: {
			href?: string;
		};
		mailbox?: {
			href?: string;
		};
		primaryCustomer?: {
			href?: string;
		};
		self?: {
			href?: string;
		};
		threads?: {
			href?: string;
		};
		web?: {
			href?: string;
		};
	};
	assignee?: {
		email?: string;
		first?: string;
		id?: number;
		last?: string;
		type?: string;
	};
	cc?: Array<string>;
	closedBy?: number;
	closedByUser?: {
		email?: string;
		first?: string;
		id?: number;
		last?: string;
		type?: string;
	};
	createdAt?: string;
	createdBy?: {
		email?: string;
		first?: string;
		id?: number;
		last?: string;
		type?: string;
	};
	customerWaitingSince?: {
		friendly?: string;
		time?: string;
	};
	customFields?: Array<{
		id?: number;
		name?: string;
		text?: string;
		value?: string;
	}>;
	folderId?: number;
	id?: number;
	mailboxId?: number;
	number?: number;
	preview?: string;
	primaryCustomer?: {
		email?: string;
		first?: string;
		id?: number;
		last?: string;
		photoUrl?: string;
		type?: string;
	};
	source?: {
		type?: string;
		via?: string;
	};
	state?: string;
	status?: string;
	subject?: string;
	tags?: Array<{
		color?: string;
		id?: number;
		tag?: string;
	}>;
	threads?: number;
	type?: string;
	userUpdatedAt?: string;
};

export type HelpScoutV1ConversationGetAllOutput = {
	_embedded?: {
		threads?: Array<{
			_embedded?: {
				attachments?: Array<{
					_links?: {
						data?: {
							href?: string;
						};
						self?: {
							href?: string;
						};
						web?: {
							href?: string;
						};
					};
					filename?: string;
					height?: number;
					id?: number;
					mimeType?: string;
					size?: number;
					state?: string;
					width?: number;
				}>;
			};
			_links?: {
				assignedTo?: {
					href?: string;
				};
				createdByCustomer?: {
					href?: string;
				};
				createdByUser?: {
					href?: string;
				};
				customer?: {
					href?: string;
				};
			};
			action?: {
				associatedEntities?: {
					user?: number;
				};
				text?: string;
				type?: string;
			};
			assignedTo?: {
				email?: string;
				first?: string;
				id?: number;
				last?: string;
				photoUrl?: string;
				type?: string;
			};
			body?: string;
			createdAt?: string;
			createdBy?: {
				email?: string;
				first?: string;
				id?: number;
				last?: string;
				photoUrl?: string;
				type?: string;
			};
			customer?: {
				email?: string;
				first?: string;
				id?: number;
				last?: string;
				photoUrl?: string;
			};
			id?: number;
			openedAt?: string;
			savedReplyId?: number;
			source?: {
				type?: string;
				via?: string;
			};
			state?: string;
			status?: string;
			to?: Array<string>;
			type?: string;
		}>;
	};
	_links?: {
		closedBy?: {
			href?: string;
		};
		createdByCustomer?: {
			href?: string;
		};
		mailbox?: {
			href?: string;
		};
		primaryCustomer?: {
			href?: string;
		};
		self?: {
			href?: string;
		};
		threads?: {
			href?: string;
		};
		web?: {
			href?: string;
		};
	};
	bcc?: Array<string>;
	cc?: Array<string>;
	closedBy?: number;
	closedByUser?: {
		email?: string;
		first?: string;
		id?: number;
		last?: string;
		type?: string;
	};
	createdAt?: string;
	createdBy?: {
		email?: string;
		first?: string;
		id?: number;
		last?: string;
		photoUrl?: string;
		type?: string;
	};
	customerWaitingSince?: {
		friendly?: string;
		time?: string;
	};
	customFields?: Array<{
		id?: number;
		name?: string;
		text?: string;
		value?: string;
	}>;
	folderId?: number;
	id?: number;
	mailboxId?: number;
	number?: number;
	preview?: string;
	primaryCustomer?: {
		email?: string;
		first?: string;
		id?: number;
		last?: string;
		photoUrl?: string;
		type?: string;
	};
	source?: {
		type?: string;
		via?: string;
	};
	state?: string;
	status?: string;
	subject?: string;
	tags?: Array<{
		color?: string;
		id?: number;
		tag?: string;
	}>;
	threads?: number;
	type?: string;
	userUpdatedAt?: string;
};

export type HelpScoutV1MailboxGetOutput = {
	_links?: {
		fields?: {
			href?: string;
		};
		folders?: {
			href?: string;
		};
		self?: {
			href?: string;
		};
	};
	createdAt?: string;
	email?: string;
	id?: number;
	name?: string;
	slug?: string;
	updatedAt?: string;
};

export type HelpScoutV1MailboxGetAllOutput = {
	_links?: {
		fields?: {
			href?: string;
		};
		folders?: {
			href?: string;
		};
		self?: {
			href?: string;
		};
	};
	createdAt?: string;
	email?: string;
	id?: number;
	name?: string;
	slug?: string;
	updatedAt?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface HelpScoutV1Credentials {
	helpScoutOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface HelpScoutV1NodeBase {
	type: 'n8n-nodes-base.helpScout';
	version: 1;
	credentials?: HelpScoutV1Credentials;
}

export type HelpScoutV1ConversationCreateNode = HelpScoutV1NodeBase & {
	config: NodeConfig<HelpScoutV1ConversationCreateConfig>;
	output?: HelpScoutV1ConversationCreateOutput;
};

export type HelpScoutV1ConversationDeleteNode = HelpScoutV1NodeBase & {
	config: NodeConfig<HelpScoutV1ConversationDeleteConfig>;
};

export type HelpScoutV1ConversationGetNode = HelpScoutV1NodeBase & {
	config: NodeConfig<HelpScoutV1ConversationGetConfig>;
	output?: HelpScoutV1ConversationGetOutput;
};

export type HelpScoutV1ConversationGetAllNode = HelpScoutV1NodeBase & {
	config: NodeConfig<HelpScoutV1ConversationGetAllConfig>;
	output?: HelpScoutV1ConversationGetAllOutput;
};

export type HelpScoutV1CustomerCreateNode = HelpScoutV1NodeBase & {
	config: NodeConfig<HelpScoutV1CustomerCreateConfig>;
};

export type HelpScoutV1CustomerGetNode = HelpScoutV1NodeBase & {
	config: NodeConfig<HelpScoutV1CustomerGetConfig>;
};

export type HelpScoutV1CustomerGetAllNode = HelpScoutV1NodeBase & {
	config: NodeConfig<HelpScoutV1CustomerGetAllConfig>;
};

export type HelpScoutV1CustomerPropertiesNode = HelpScoutV1NodeBase & {
	config: NodeConfig<HelpScoutV1CustomerPropertiesConfig>;
};

export type HelpScoutV1CustomerUpdateNode = HelpScoutV1NodeBase & {
	config: NodeConfig<HelpScoutV1CustomerUpdateConfig>;
};

export type HelpScoutV1MailboxGetNode = HelpScoutV1NodeBase & {
	config: NodeConfig<HelpScoutV1MailboxGetConfig>;
	output?: HelpScoutV1MailboxGetOutput;
};

export type HelpScoutV1MailboxGetAllNode = HelpScoutV1NodeBase & {
	config: NodeConfig<HelpScoutV1MailboxGetAllConfig>;
	output?: HelpScoutV1MailboxGetAllOutput;
};

export type HelpScoutV1ThreadCreateNode = HelpScoutV1NodeBase & {
	config: NodeConfig<HelpScoutV1ThreadCreateConfig>;
};

export type HelpScoutV1ThreadGetAllNode = HelpScoutV1NodeBase & {
	config: NodeConfig<HelpScoutV1ThreadGetAllConfig>;
};

export type HelpScoutV1Node =
	| HelpScoutV1ConversationCreateNode
	| HelpScoutV1ConversationDeleteNode
	| HelpScoutV1ConversationGetNode
	| HelpScoutV1ConversationGetAllNode
	| HelpScoutV1CustomerCreateNode
	| HelpScoutV1CustomerGetNode
	| HelpScoutV1CustomerGetAllNode
	| HelpScoutV1CustomerPropertiesNode
	| HelpScoutV1CustomerUpdateNode
	| HelpScoutV1MailboxGetNode
	| HelpScoutV1MailboxGetAllNode
	| HelpScoutV1ThreadCreateNode
	| HelpScoutV1ThreadGetAllNode
	;