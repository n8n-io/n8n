/**
 * Iterable Node Types
 *
 * Consume Iterable API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/iterable/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Record the actions a user perform */
export type IterableV1EventTrackConfig = {
	resource: 'event';
	operation: 'track';
	/**
	 * The name of the event to track
	 */
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Create a new user, or update the current one if it already exists (upsert) */
export type IterableV1UserUpsertConfig = {
	resource: 'user';
	operation: 'upsert';
	/**
	 * Identifier to be used
	 */
	identifier: 'email' | 'userId' | Expression<string>;
	value: string | Expression<string>;
	/**
	 * Whether to create a new user if the idetifier does not exist
	 * @default true
	 */
	preferUserId: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a user */
export type IterableV1UserDeleteConfig = {
	resource: 'user';
	operation: 'delete';
	/**
	 * Identifier to be used
	 * @default email
	 */
	by: 'email' | 'userId' | Expression<string>;
	/**
	 * Unique identifier for a particular user
	 */
	userId: string | Expression<string>;
	/**
	 * Email for a particular user
	 */
	email: string | Expression<string>;
};

/** Get a user */
export type IterableV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
	/**
	 * Identifier to be used
	 * @default email
	 */
	by: 'email' | 'userId' | Expression<string>;
	/**
	 * Unique identifier for a particular user
	 */
	userId: string | Expression<string>;
	/**
	 * Email for a particular user
	 */
	email: string | Expression<string>;
};

/** Add user to list */
export type IterableV1UserListAddConfig = {
	resource: 'userList';
	operation: 'add';
	/**
	 * Identifier to be used. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	listId: string | Expression<string>;
	/**
	 * Identifier to be used
	 */
	identifier: 'email' | 'userId' | Expression<string>;
	value: string | Expression<string>;
};

/** Remove a user from a list */
export type IterableV1UserListRemoveConfig = {
	resource: 'userList';
	operation: 'remove';
	/**
	 * Identifier to be used. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	listId: string | Expression<string>;
	/**
	 * Identifier to be used
	 */
	identifier: 'email' | 'userId' | Expression<string>;
	value: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type IterableV1Params =
	| IterableV1EventTrackConfig
	| IterableV1UserUpsertConfig
	| IterableV1UserDeleteConfig
	| IterableV1UserGetConfig
	| IterableV1UserListAddConfig
	| IterableV1UserListRemoveConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface IterableV1Credentials {
	iterableApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type IterableV1Node = {
	type: 'n8n-nodes-base.iterable';
	version: 1;
	config: NodeConfig<IterableV1Params>;
	credentials?: IterableV1Credentials;
};

export type IterableNode = IterableV1Node;
