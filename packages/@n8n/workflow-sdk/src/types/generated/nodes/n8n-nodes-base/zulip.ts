/**
 * Zulip Node Types
 *
 * Consume Zulip API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/zulip/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Delete a message */
export type ZulipV1MessageDeleteConfig = {
	resource: 'message';
	operation: 'delete';
	/**
	 * Unique identifier for the message
	 * @displayOptions.show { resource: ["message"], operation: ["delete"] }
	 */
	messageId: string | Expression<string>;
};

/** Get a message */
export type ZulipV1MessageGetConfig = {
	resource: 'message';
	operation: 'get';
	/**
	 * Unique identifier for the message
	 * @displayOptions.show { resource: ["message"], operation: ["get"] }
	 */
	messageId: string | Expression<string>;
};

/** Send a private message */
export type ZulipV1MessageSendPrivateConfig = {
	resource: 'message';
	operation: 'sendPrivate';
	/**
	 * The destination stream, or a comma-separated list containing the usernames (emails) of the recipients. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["message"], operation: ["sendPrivate"] }
	 * @default []
	 */
	to: string[];
	/**
	 * The content of the message
	 * @displayOptions.show { resource: ["message"], operation: ["sendPrivate"] }
	 */
	content: string | Expression<string>;
};

/** Send a message to stream */
export type ZulipV1MessageSendStreamConfig = {
	resource: 'message';
	operation: 'sendStream';
	/**
	 * The destination stream, or a comma-separated list containing the usernames (emails) of the recipients. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["message"], operation: ["sendStream"] }
	 */
	stream: string | Expression<string>;
	/**
	 * The topic of the message. Only required if type is stream, ignored otherwise. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["message"], operation: ["sendStream"] }
	 */
	topic: string | Expression<string>;
	/**
	 * The content of the message
	 * @displayOptions.show { resource: ["message"], operation: ["sendStream"] }
	 */
	content: string | Expression<string>;
};

/** Update a message */
export type ZulipV1MessageUpdateConfig = {
	resource: 'message';
	operation: 'update';
	/**
	 * Unique identifier for the message
	 * @displayOptions.show { resource: ["message"], operation: ["update"] }
	 */
	messageId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type ZulipV1MessageUpdateFileConfig = {
	resource: 'message';
	operation: 'updateFile';
	dataBinaryProperty: string | Expression<string>;
};

/** Create a stream */
export type ZulipV1StreamCreateConfig = {
	resource: 'stream';
	operation: 'create';
	jsonParameters?: boolean | Expression<boolean>;
	/**
	 * JSON format parameters for stream creation
	 * @displayOptions.show { resource: ["stream"], operation: ["create"], jsonParameters: [true] }
	 */
	additionalFieldsJson?: IDataObject | string | Expression<string>;
	/**
	 * A list of dictionaries containing the the key name and value specifying the name of the stream to subscribe. If the stream does not exist a new stream is created.
	 * @displayOptions.show { resource: ["stream"], operation: ["create"], jsonParameters: [false] }
	 * @default {}
	 */
	subscriptions: {
		properties?: Array<{
			/** Name of Subscription
			 */
			name?: string | Expression<string>;
			/** Description of Subscription
			 */
			description?: string | Expression<string>;
		}>;
	};
	additionalFields?: Record<string, unknown>;
};

/** Delete a message */
export type ZulipV1StreamDeleteConfig = {
	resource: 'stream';
	operation: 'delete';
	/**
	 * ID of stream to delete
	 * @displayOptions.show { resource: ["stream"], operation: ["delete"] }
	 */
	streamId: string | Expression<string>;
};

/** Get many streams */
export type ZulipV1StreamGetAllConfig = {
	resource: 'stream';
	operation: 'getAll';
	additionalFields?: Record<string, unknown>;
};

/** Get subscribed streams */
export type ZulipV1StreamGetSubscribedConfig = {
	resource: 'stream';
	operation: 'getSubscribed';
	additionalFields?: Record<string, unknown>;
};

/** Update a message */
export type ZulipV1StreamUpdateConfig = {
	resource: 'stream';
	operation: 'update';
	/**
	 * ID of stream to update
	 * @displayOptions.show { resource: ["stream"], operation: ["update"] }
	 */
	streamId: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	/**
	 * JSON format parameters for stream creation
	 * @displayOptions.show { resource: ["stream"], operation: ["update"], jsonParameters: [true] }
	 */
	additionalFieldsJson?: IDataObject | string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Create a stream */
export type ZulipV1UserCreateConfig = {
	resource: 'user';
	operation: 'create';
	/**
	 * The email address of the new user
	 * @displayOptions.show { resource: ["user"], operation: ["create"] }
	 */
	email: string | Expression<string>;
	/**
	 * The full name of the new user
	 * @displayOptions.show { resource: ["user"], operation: ["create"] }
	 */
	fullName: string | Expression<string>;
	/**
	 * The password of the new user
	 * @displayOptions.show { resource: ["user"], operation: ["create"] }
	 */
	password: string | Expression<string>;
	/**
	 * The short name of the new user. Not user-visible.
	 * @displayOptions.show { resource: ["user"], operation: ["create"] }
	 */
	shortName: string | Expression<string>;
};

/** Deactivate a user */
export type ZulipV1UserDeactivateConfig = {
	resource: 'user';
	operation: 'deactivate';
	/**
	 * The ID of user to deactivate
	 * @displayOptions.show { resource: ["user"], operation: ["deactivate"] }
	 */
	userId: string | Expression<string>;
};

/** Get a message */
export type ZulipV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
	/**
	 * The ID of user to get
	 * @displayOptions.show { resource: ["user"], operation: ["get"] }
	 */
	userId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get many streams */
export type ZulipV1UserGetAllConfig = {
	resource: 'user';
	operation: 'getAll';
	additionalFields?: Record<string, unknown>;
};

/** Update a message */
export type ZulipV1UserUpdateConfig = {
	resource: 'user';
	operation: 'update';
	/**
	 * The ID of user to update
	 * @displayOptions.show { resource: ["user"], operation: ["update"] }
	 */
	userId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type ZulipV1Params =
	| ZulipV1MessageDeleteConfig
	| ZulipV1MessageGetConfig
	| ZulipV1MessageSendPrivateConfig
	| ZulipV1MessageSendStreamConfig
	| ZulipV1MessageUpdateConfig
	| ZulipV1MessageUpdateFileConfig
	| ZulipV1StreamCreateConfig
	| ZulipV1StreamDeleteConfig
	| ZulipV1StreamGetAllConfig
	| ZulipV1StreamGetSubscribedConfig
	| ZulipV1StreamUpdateConfig
	| ZulipV1UserCreateConfig
	| ZulipV1UserDeactivateConfig
	| ZulipV1UserGetConfig
	| ZulipV1UserGetAllConfig
	| ZulipV1UserUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface ZulipV1Credentials {
	zulipApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type ZulipV1Node = {
	type: 'n8n-nodes-base.zulip';
	version: 1;
	config: NodeConfig<ZulipV1Params>;
	credentials?: ZulipV1Credentials;
};

export type ZulipNode = ZulipV1Node;
