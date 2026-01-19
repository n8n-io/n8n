/**
 * Autopilot Node - Version 1
 * Consume Autopilot API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new contact, or update the current one if it already exists (upsert) */
export type AutopilotV1ContactUpsertConfig = {
	resource: 'contact';
	operation: 'upsert';
/**
 * Email address of the contact
 * @displayOptions.show { operation: ["upsert"], resource: ["contact"] }
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
 * @displayOptions.show { operation: ["delete"], resource: ["contact"] }
 */
		contactId: string | Expression<string>;
};

/** Get a contact */
export type AutopilotV1ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
/**
 * Can be ID or email
 * @displayOptions.show { operation: ["get"], resource: ["contact"] }
 */
		contactId: string | Expression<string>;
};

/** Get many contacts */
export type AutopilotV1ContactGetAllConfig = {
	resource: 'contact';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["contact"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["contact"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["add"], resource: ["contactJourney"] }
 */
		triggerId: string | Expression<string>;
/**
 * Can be ID or email
 * @displayOptions.show { operation: ["add"], resource: ["contactJourney"] }
 */
		contactId: string | Expression<string>;
};

/** Add contact to list */
export type AutopilotV1ContactListAddConfig = {
	resource: 'contactList';
	operation: 'add';
/**
 * ID of the list to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["add", "remove", "exist", "getAll"], resource: ["contactList"] }
 */
		listId: string | Expression<string>;
/**
 * Can be ID or email
 * @displayOptions.show { operation: ["add", "remove", "exist"], resource: ["contactList"] }
 */
		contactId: string | Expression<string>;
};

/** Check if contact is on list */
export type AutopilotV1ContactListExistConfig = {
	resource: 'contactList';
	operation: 'exist';
/**
 * ID of the list to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["add", "remove", "exist", "getAll"], resource: ["contactList"] }
 */
		listId: string | Expression<string>;
/**
 * Can be ID or email
 * @displayOptions.show { operation: ["add", "remove", "exist"], resource: ["contactList"] }
 */
		contactId: string | Expression<string>;
};

/** Get many contacts */
export type AutopilotV1ContactListGetAllConfig = {
	resource: 'contactList';
	operation: 'getAll';
/**
 * ID of the list to operate on. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["add", "remove", "exist", "getAll"], resource: ["contactList"] }
 */
		listId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["contactList"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["contactList"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["add", "remove", "exist", "getAll"], resource: ["contactList"] }
 */
		listId: string | Expression<string>;
/**
 * Can be ID or email
 * @displayOptions.show { operation: ["add", "remove", "exist"], resource: ["contactList"] }
 */
		contactId: string | Expression<string>;
};

/** Create a list */
export type AutopilotV1ListCreateConfig = {
	resource: 'list';
	operation: 'create';
/**
 * Name of the list to create
 * @displayOptions.show { operation: ["create"], resource: ["list"] }
 */
		name: string | Expression<string>;
};

/** Get many contacts */
export type AutopilotV1ListGetAllConfig = {
	resource: 'list';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["list"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["list"], returnAll: [false] }
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
	| AutopilotV1ListGetAllConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface AutopilotV1Credentials {
	autopilotApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface AutopilotV1NodeBase {
	type: 'n8n-nodes-base.autopilot';
	version: 1;
	credentials?: AutopilotV1Credentials;
}

export type AutopilotV1ContactUpsertNode = AutopilotV1NodeBase & {
	config: NodeConfig<AutopilotV1ContactUpsertConfig>;
};

export type AutopilotV1ContactDeleteNode = AutopilotV1NodeBase & {
	config: NodeConfig<AutopilotV1ContactDeleteConfig>;
};

export type AutopilotV1ContactGetNode = AutopilotV1NodeBase & {
	config: NodeConfig<AutopilotV1ContactGetConfig>;
};

export type AutopilotV1ContactGetAllNode = AutopilotV1NodeBase & {
	config: NodeConfig<AutopilotV1ContactGetAllConfig>;
};

export type AutopilotV1ContactJourneyAddNode = AutopilotV1NodeBase & {
	config: NodeConfig<AutopilotV1ContactJourneyAddConfig>;
};

export type AutopilotV1ContactListAddNode = AutopilotV1NodeBase & {
	config: NodeConfig<AutopilotV1ContactListAddConfig>;
};

export type AutopilotV1ContactListExistNode = AutopilotV1NodeBase & {
	config: NodeConfig<AutopilotV1ContactListExistConfig>;
};

export type AutopilotV1ContactListGetAllNode = AutopilotV1NodeBase & {
	config: NodeConfig<AutopilotV1ContactListGetAllConfig>;
};

export type AutopilotV1ContactListRemoveNode = AutopilotV1NodeBase & {
	config: NodeConfig<AutopilotV1ContactListRemoveConfig>;
};

export type AutopilotV1ListCreateNode = AutopilotV1NodeBase & {
	config: NodeConfig<AutopilotV1ListCreateConfig>;
};

export type AutopilotV1ListGetAllNode = AutopilotV1NodeBase & {
	config: NodeConfig<AutopilotV1ListGetAllConfig>;
};

export type AutopilotV1Node =
	| AutopilotV1ContactUpsertNode
	| AutopilotV1ContactDeleteNode
	| AutopilotV1ContactGetNode
	| AutopilotV1ContactGetAllNode
	| AutopilotV1ContactJourneyAddNode
	| AutopilotV1ContactListAddNode
	| AutopilotV1ContactListExistNode
	| AutopilotV1ContactListGetAllNode
	| AutopilotV1ContactListRemoveNode
	| AutopilotV1ListCreateNode
	| AutopilotV1ListGetAllNode
	;