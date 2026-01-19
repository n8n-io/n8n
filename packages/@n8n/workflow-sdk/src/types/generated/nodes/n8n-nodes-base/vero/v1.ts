/**
 * Vero Node - Version 1
 * Consume Vero API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create, update and manage the subscription status of your users */
export type VeroV1UserAddTagsConfig = {
	resource: 'user';
	operation: 'addTags';
/**
 * The unique identifier of the user
 * @displayOptions.show { resource: ["user"], operation: ["addTags"] }
 */
		id: string | Expression<string>;
/**
 * Tags to add separated by ","
 * @displayOptions.show { resource: ["user"], operation: ["addTags"] }
 */
		tags: string | Expression<string>;
};

/** Create, update and manage the subscription status of your users */
export type VeroV1UserAliasConfig = {
	resource: 'user';
	operation: 'alias';
/**
 * The old unique identifier of the user
 * @displayOptions.show { resource: ["user"], operation: ["alias"] }
 */
		id: string | Expression<string>;
/**
 * The new unique identifier of the user
 * @displayOptions.show { resource: ["user"], operation: ["alias"] }
 */
		newId: string | Expression<string>;
};

/** Create, update and manage the subscription status of your users */
export type VeroV1UserCreateConfig = {
	resource: 'user';
	operation: 'create';
/**
 * The unique identifier of the customer
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
 */
		id: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
/**
 * Key value pairs that represent the custom user properties you want to update
 * @displayOptions.show { resource: ["user"], operation: ["create"], jsonParameters: [false] }
 * @default {}
 */
		dataAttributesUi?: {
		dataAttributesValues?: Array<{
			/** Name of the property to set
			 */
			key?: string | Expression<string>;
			/** Value of the property to set
			 */
			value?: string | Expression<string>;
		}>;
	};
/**
 * Key value pairs that represent the custom user properties you want to update
 * @displayOptions.show { resource: ["user"], operation: ["create"], jsonParameters: [true] }
 */
		dataAttributesJson?: IDataObject | string | Expression<string>;
};

/** Create, update and manage the subscription status of your users */
export type VeroV1UserDeleteConfig = {
	resource: 'user';
	operation: 'delete';
/**
 * The unique identifier of the user
 * @displayOptions.show { resource: ["user"], operation: ["delete"] }
 */
		id: string | Expression<string>;
};

/** Create, update and manage the subscription status of your users */
export type VeroV1UserResubscribeConfig = {
	resource: 'user';
	operation: 'resubscribe';
/**
 * The unique identifier of the user
 * @displayOptions.show { resource: ["user"], operation: ["resubscribe"] }
 */
		id: string | Expression<string>;
};

/** Create, update and manage the subscription status of your users */
export type VeroV1UserRemoveTagsConfig = {
	resource: 'user';
	operation: 'removeTags';
/**
 * The unique identifier of the user
 * @displayOptions.show { resource: ["user"], operation: ["removeTags"] }
 */
		id: string | Expression<string>;
/**
 * Tags to remove separated by ","
 * @displayOptions.show { resource: ["user"], operation: ["removeTags"] }
 */
		tags: string | Expression<string>;
};

/** Create, update and manage the subscription status of your users */
export type VeroV1UserUnsubscribeConfig = {
	resource: 'user';
	operation: 'unsubscribe';
/**
 * The unique identifier of the user
 * @displayOptions.show { resource: ["user"], operation: ["unsubscribe"] }
 */
		id: string | Expression<string>;
};

/** Track events based on actions your customers take in real time */
export type VeroV1EventTrackConfig = {
	resource: 'event';
	operation: 'track';
/**
 * The unique identifier of the customer
 * @displayOptions.show { resource: ["event"], operation: ["track"] }
 */
		id: string | Expression<string>;
	email: string | Expression<string>;
/**
 * The name of the event tracked
 * @displayOptions.show { resource: ["event"], operation: ["track"] }
 */
		eventName: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
/**
 * Key value pairs that represent any properties you want to track with this event
 * @displayOptions.show { resource: ["event"], operation: ["track"], jsonParameters: [false] }
 * @default {}
 */
		dataAttributesUi?: {
		dataAttributesValues?: Array<{
			/** Name of the property to set
			 */
			key?: string | Expression<string>;
			/** Value of the property to set
			 */
			value?: string | Expression<string>;
		}>;
	};
/**
 * Key value pairs that represent reserved, Vero-specific operators. Refer to the note on “deduplication” below.
 * @displayOptions.show { resource: ["event"], operation: ["track"], jsonParameters: [false] }
 * @default {}
 */
		extraAttributesUi?: {
		extraAttributesValues?: Array<{
			/** Name of the property to set
			 */
			key?: string | Expression<string>;
			/** Value of the property to set
			 */
			value?: string | Expression<string>;
		}>;
	};
/**
 * Key value pairs that represent the custom user properties you want to update
 * @displayOptions.show { resource: ["event"], operation: ["track"], jsonParameters: [true] }
 */
		dataAttributesJson?: IDataObject | string | Expression<string>;
/**
 * Key value pairs that represent reserved, Vero-specific operators. Refer to the note on “deduplication” below.
 * @displayOptions.show { resource: ["event"], operation: ["track"], jsonParameters: [true] }
 */
		extraAttributesJson?: IDataObject | string | Expression<string>;
};

export type VeroV1Params =
	| VeroV1UserAddTagsConfig
	| VeroV1UserAliasConfig
	| VeroV1UserCreateConfig
	| VeroV1UserDeleteConfig
	| VeroV1UserResubscribeConfig
	| VeroV1UserRemoveTagsConfig
	| VeroV1UserUnsubscribeConfig
	| VeroV1EventTrackConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface VeroV1Credentials {
	veroApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface VeroV1NodeBase {
	type: 'n8n-nodes-base.vero';
	version: 1;
	credentials?: VeroV1Credentials;
}

export type VeroV1UserAddTagsNode = VeroV1NodeBase & {
	config: NodeConfig<VeroV1UserAddTagsConfig>;
};

export type VeroV1UserAliasNode = VeroV1NodeBase & {
	config: NodeConfig<VeroV1UserAliasConfig>;
};

export type VeroV1UserCreateNode = VeroV1NodeBase & {
	config: NodeConfig<VeroV1UserCreateConfig>;
};

export type VeroV1UserDeleteNode = VeroV1NodeBase & {
	config: NodeConfig<VeroV1UserDeleteConfig>;
};

export type VeroV1UserResubscribeNode = VeroV1NodeBase & {
	config: NodeConfig<VeroV1UserResubscribeConfig>;
};

export type VeroV1UserRemoveTagsNode = VeroV1NodeBase & {
	config: NodeConfig<VeroV1UserRemoveTagsConfig>;
};

export type VeroV1UserUnsubscribeNode = VeroV1NodeBase & {
	config: NodeConfig<VeroV1UserUnsubscribeConfig>;
};

export type VeroV1EventTrackNode = VeroV1NodeBase & {
	config: NodeConfig<VeroV1EventTrackConfig>;
};

export type VeroV1Node =
	| VeroV1UserAddTagsNode
	| VeroV1UserAliasNode
	| VeroV1UserCreateNode
	| VeroV1UserDeleteNode
	| VeroV1UserResubscribeNode
	| VeroV1UserRemoveTagsNode
	| VeroV1UserUnsubscribeNode
	| VeroV1EventTrackNode
	;