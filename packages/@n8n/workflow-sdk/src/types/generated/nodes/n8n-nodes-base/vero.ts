/**
 * Vero Node Types
 *
 * Consume Vero API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/vero/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create, update and manage the subscription status of your users */
export type VeroV1UserAddTagsConfig = {
	resource: 'user';
	operation: 'addTags';
	/**
	 * The unique identifier of the user
	 */
	id: string | Expression<string>;
	/**
	 * Tags to add separated by ","
	 */
	tags: string | Expression<string>;
};

/** Create, update and manage the subscription status of your users */
export type VeroV1UserAliasConfig = {
	resource: 'user';
	operation: 'alias';
	/**
	 * The old unique identifier of the user
	 */
	id: string | Expression<string>;
	/**
	 * The new unique identifier of the user
	 */
	newId: string | Expression<string>;
};

/** Create, update and manage the subscription status of your users */
export type VeroV1UserCreateConfig = {
	resource: 'user';
	operation: 'create';
	/**
	 * The unique identifier of the customer
	 */
	id: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
	/**
	 * Key value pairs that represent the custom user properties you want to update
	 * @default {}
	 */
	dataAttributesUi?: {
		dataAttributesValues?: Array<{
			key?: string | Expression<string>;
			value?: string | Expression<string>;
		}>;
	};
	/**
	 * Key value pairs that represent the custom user properties you want to update
	 */
	dataAttributesJson?: IDataObject | string | Expression<string>;
};

/** Create, update and manage the subscription status of your users */
export type VeroV1UserDeleteConfig = {
	resource: 'user';
	operation: 'delete';
	/**
	 * The unique identifier of the user
	 */
	id: string | Expression<string>;
};

/** Create, update and manage the subscription status of your users */
export type VeroV1UserResubscribeConfig = {
	resource: 'user';
	operation: 'resubscribe';
	/**
	 * The unique identifier of the user
	 */
	id: string | Expression<string>;
};

/** Create, update and manage the subscription status of your users */
export type VeroV1UserRemoveTagsConfig = {
	resource: 'user';
	operation: 'removeTags';
	/**
	 * The unique identifier of the user
	 */
	id: string | Expression<string>;
	/**
	 * Tags to remove separated by ","
	 */
	tags: string | Expression<string>;
};

/** Create, update and manage the subscription status of your users */
export type VeroV1UserUnsubscribeConfig = {
	resource: 'user';
	operation: 'unsubscribe';
	/**
	 * The unique identifier of the user
	 */
	id: string | Expression<string>;
};

/** Track events based on actions your customers take in real time */
export type VeroV1EventTrackConfig = {
	resource: 'event';
	operation: 'track';
	/**
	 * The unique identifier of the customer
	 */
	id: string | Expression<string>;
	email: string | Expression<string>;
	/**
	 * The name of the event tracked
	 */
	eventName: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	/**
	 * Key value pairs that represent any properties you want to track with this event
	 * @default {}
	 */
	dataAttributesUi?: {
		dataAttributesValues?: Array<{
			key?: string | Expression<string>;
			value?: string | Expression<string>;
		}>;
	};
	/**
	 * Key value pairs that represent reserved, Vero-specific operators. Refer to the note on “deduplication” below.
	 * @default {}
	 */
	extraAttributesUi?: {
		extraAttributesValues?: Array<{
			key?: string | Expression<string>;
			value?: string | Expression<string>;
		}>;
	};
	/**
	 * Key value pairs that represent the custom user properties you want to update
	 */
	dataAttributesJson?: IDataObject | string | Expression<string>;
	/**
	 * Key value pairs that represent reserved, Vero-specific operators. Refer to the note on “deduplication” below.
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
	| VeroV1EventTrackConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface VeroV1Credentials {
	veroApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type VeroV1Node = {
	type: 'n8n-nodes-base.vero';
	version: 1;
	config: NodeConfig<VeroV1Params>;
	credentials?: VeroV1Credentials;
};

export type VeroNode = VeroV1Node;
