/**
 * Autopilot Node Types
 *
 * Consume Autopilot API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/autopilot/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new contact, or update the current one if it already exists (upsert) */
export type AutopilotV1ContactUpsertConfig = {
	resource: 'contact';
	operation: 'upsert';
	/**
	 * Email address of the contact
	 */
	email: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a contact */
export type AutopilotV1ContactDeleteConfig = {
	resource: 'contact';
	operation: 'delete';
	/**
	 * Can be ID or email
	 */
	contactId: string | Expression<string>;
};

/** Get a contact */
export type AutopilotV1ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
	/**
	 * Can be ID or email
	 */
	contactId: string | Expression<string>;
};

/** Get many contacts */
export type AutopilotV1ContactGetAllConfig = {
	resource: 'contact';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
};

/** Add contact to list */
export type AutopilotV1ContactJourneyAddConfig = {
	resource: 'contactJourney';
	operation: 'add';
	/**
	 * List ID. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	triggerId: string | Expression<string>;
	/**
	 * Can be ID or email
	 */
	contactId: string | Expression<string>;
};

/** Add contact to list */
export type AutopilotV1ContactListAddConfig = {
	resource: 'contactList';
	operation: 'add';
	/**
	 * ID of the list to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	listId: string | Expression<string>;
	/**
	 * Can be ID or email
	 */
	contactId: string | Expression<string>;
};

/** Check if contact is on list */
export type AutopilotV1ContactListExistConfig = {
	resource: 'contactList';
	operation: 'exist';
	/**
	 * ID of the list to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	listId: string | Expression<string>;
	/**
	 * Can be ID or email
	 */
	contactId: string | Expression<string>;
};

/** Get many contacts */
export type AutopilotV1ContactListGetAllConfig = {
	resource: 'contactList';
	operation: 'getAll';
	/**
	 * ID of the list to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	listId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
};

/** Remove a contact from a list */
export type AutopilotV1ContactListRemoveConfig = {
	resource: 'contactList';
	operation: 'remove';
	/**
	 * ID of the list to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	listId: string | Expression<string>;
	/**
	 * Can be ID or email
	 */
	contactId: string | Expression<string>;
};

/** Create a list */
export type AutopilotV1ListCreateConfig = {
	resource: 'list';
	operation: 'create';
	/**
	 * Name of the list to create
	 */
	name: string | Expression<string>;
};

/** Get many contacts */
export type AutopilotV1ListGetAllConfig = {
	resource: 'list';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
};

export type AutopilotV1Params =
	| AutopilotV1ContactUpsertConfig
	| AutopilotV1ContactDeleteConfig
	| AutopilotV1ContactGetConfig
	| AutopilotV1ContactGetAllConfig
	| AutopilotV1ContactJourneyAddConfig
	| AutopilotV1ContactListAddConfig
	| AutopilotV1ContactListExistConfig
	| AutopilotV1ContactListGetAllConfig
	| AutopilotV1ContactListRemoveConfig
	| AutopilotV1ListCreateConfig
	| AutopilotV1ListGetAllConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface AutopilotV1Credentials {
	autopilotApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type AutopilotV1Node = {
	type: 'n8n-nodes-base.autopilot';
	version: 1;
	config: NodeConfig<AutopilotV1Params>;
	credentials?: AutopilotV1Credentials;
};

export type AutopilotNode = AutopilotV1Node;
