/**
 * Google Chat Node - Version 1
 * Consume Google Chat API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get a membership */
export type GoogleChatV1MemberGetConfig = {
	resource: 'member';
	operation: 'get';
/**
 * Member to be retrieved in the form "spaces/*\/members/*"
 * @displayOptions.show { resource: ["member"], operation: ["get"] }
 */
		memberId: string | Expression<string>;
};

/** Get many memberships in a space */
export type GoogleChatV1MemberGetAllConfig = {
	resource: 'member';
	operation: 'getAll';
/**
 * The name of the space for which to retrieve members, in the form "spaces/*". Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["member"], operation: ["getAll"] }
 * @default []
 */
		spaceId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["member"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["member"], operation: ["getAll"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
};

/** Create a message */
export type GoogleChatV1MessageCreateConfig = {
	resource: 'message';
	operation: 'create';
/**
 * Space resource name, in the form "spaces/*". Example: spaces/AAAAMpdlehY. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["message"], operation: ["create"] }
 */
		spaceId: string | Expression<string>;
/**
 * Whether to pass the message object as JSON
 * @displayOptions.show { resource: ["message"], operation: ["create"] }
 * @default false
 */
		jsonParameters?: boolean | Expression<boolean>;
	messageUi: Record<string, unknown>;
/**
 * Message input as JSON Object or JSON String
 * @displayOptions.show { resource: ["message"], operation: ["create"], jsonParameters: [true] }
 */
		messageJson: IDataObject | string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a message */
export type GoogleChatV1MessageDeleteConfig = {
	resource: 'message';
	operation: 'delete';
/**
 * Resource name of the message to be deleted, in the form "spaces//messages/"
 * @displayOptions.show { resource: ["message"], operation: ["delete"] }
 */
		messageId: string | Expression<string>;
};

/** Get a membership */
export type GoogleChatV1MessageGetConfig = {
	resource: 'message';
	operation: 'get';
/**
 * Resource name of the message to be retrieved, in the form "spaces//messages/"
 * @displayOptions.show { resource: ["message"], operation: ["get"] }
 */
		messageId: string | Expression<string>;
};

/** Send a message and wait for response */
export type GoogleChatV1MessageSendAndWaitConfig = {
	resource: 'message';
	operation: 'sendAndWait';
/**
 * Space resource name, in the form "spaces/*". Example: spaces/AAAAMpdlehY. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["message"], operation: ["sendAndWait"] }
 */
		spaceId: string | Expression<string>;
	message: string | Expression<string>;
	responseType?: 'approval' | 'freeText' | 'customForm' | Expression<string>;
	defineForm?: 'fields' | 'json' | Expression<string>;
	jsonOutput?: IDataObject | string | Expression<string>;
	approvalOptions?: {
		values?: {
			/** Type of Approval
			 * @default single
			 */
			approvalType?: 'single' | 'double' | Expression<string>;
			/** Approve Button Label
			 * @displayOptions.show { approvalType: ["single", "double"] }
			 * @default ✅ Approve
			 */
			approveLabel?: string | Expression<string>;
			/** Disapprove Button Label
			 * @displayOptions.show { approvalType: ["double"] }
			 * @default ❌ Decline
			 */
			disapproveLabel?: string | Expression<string>;
		};
	};
	options?: Record<string, unknown>;
};

/** Update a message */
export type GoogleChatV1MessageUpdateConfig = {
	resource: 'message';
	operation: 'update';
/**
 * Resource name of the message to be updated, in the form "spaces//messages/"
 * @displayOptions.show { resource: ["message"], operation: ["update"] }
 */
		messageId: string | Expression<string>;
/**
 * Whether to pass the update fields object as JSON
 * @displayOptions.show { resource: ["message"], operation: ["update"] }
 * @default false
 */
		jsonParameters?: boolean | Expression<boolean>;
	updateFieldsUi: Record<string, unknown>;
/**
 * Message input as JSON Object or JSON String
 * @displayOptions.show { resource: ["message"], operation: ["update"], jsonParameters: [true] }
 */
		updateFieldsJson: IDataObject | string | Expression<string>;
};

/** Get a membership */
export type GoogleChatV1SpaceGetConfig = {
	resource: 'space';
	operation: 'get';
/**
 * Resource name of the space, in the form "spaces/*"
 * @displayOptions.show { resource: ["space"], operation: ["get"] }
 */
		spaceId: string | Expression<string>;
};

/** Get many memberships in a space */
export type GoogleChatV1SpaceGetAllConfig = {
	resource: 'space';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["space"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["space"], operation: ["getAll"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
};

export type GoogleChatV1Params =
	| GoogleChatV1MemberGetConfig
	| GoogleChatV1MemberGetAllConfig
	| GoogleChatV1MessageCreateConfig
	| GoogleChatV1MessageDeleteConfig
	| GoogleChatV1MessageGetConfig
	| GoogleChatV1MessageSendAndWaitConfig
	| GoogleChatV1MessageUpdateConfig
	| GoogleChatV1SpaceGetConfig
	| GoogleChatV1SpaceGetAllConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleChatV1Credentials {
	googleApi: CredentialReference;
	googleChatOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GoogleChatV1NodeBase {
	type: 'n8n-nodes-base.googleChat';
	version: 1;
	credentials?: GoogleChatV1Credentials;
}

export type GoogleChatV1MemberGetNode = GoogleChatV1NodeBase & {
	config: NodeConfig<GoogleChatV1MemberGetConfig>;
};

export type GoogleChatV1MemberGetAllNode = GoogleChatV1NodeBase & {
	config: NodeConfig<GoogleChatV1MemberGetAllConfig>;
};

export type GoogleChatV1MessageCreateNode = GoogleChatV1NodeBase & {
	config: NodeConfig<GoogleChatV1MessageCreateConfig>;
};

export type GoogleChatV1MessageDeleteNode = GoogleChatV1NodeBase & {
	config: NodeConfig<GoogleChatV1MessageDeleteConfig>;
};

export type GoogleChatV1MessageGetNode = GoogleChatV1NodeBase & {
	config: NodeConfig<GoogleChatV1MessageGetConfig>;
};

export type GoogleChatV1MessageSendAndWaitNode = GoogleChatV1NodeBase & {
	config: NodeConfig<GoogleChatV1MessageSendAndWaitConfig>;
};

export type GoogleChatV1MessageUpdateNode = GoogleChatV1NodeBase & {
	config: NodeConfig<GoogleChatV1MessageUpdateConfig>;
};

export type GoogleChatV1SpaceGetNode = GoogleChatV1NodeBase & {
	config: NodeConfig<GoogleChatV1SpaceGetConfig>;
};

export type GoogleChatV1SpaceGetAllNode = GoogleChatV1NodeBase & {
	config: NodeConfig<GoogleChatV1SpaceGetAllConfig>;
};

export type GoogleChatV1Node =
	| GoogleChatV1MemberGetNode
	| GoogleChatV1MemberGetAllNode
	| GoogleChatV1MessageCreateNode
	| GoogleChatV1MessageDeleteNode
	| GoogleChatV1MessageGetNode
	| GoogleChatV1MessageSendAndWaitNode
	| GoogleChatV1MessageUpdateNode
	| GoogleChatV1SpaceGetNode
	| GoogleChatV1SpaceGetAllNode
	;