/**
 * GetResponse Node - Version 1
 * Consume GetResponse API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new contact */
export type GetResponseV1ContactCreateConfig = {
	resource: 'contact';
	operation: 'create';
	email?: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["contact"], operation: ["create"] }
 */
		campaignId?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a contact */
export type GetResponseV1ContactDeleteConfig = {
	resource: 'contact';
	operation: 'delete';
/**
 * ID of contact to delete
 * @displayOptions.show { resource: ["contact"], operation: ["delete"] }
 */
		contactId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get a contact */
export type GetResponseV1ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
/**
 * Unique identifier for a particular contact
 * @displayOptions.show { resource: ["contact"], operation: ["get"] }
 */
		contactId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get many contacts */
export type GetResponseV1ContactGetAllConfig = {
	resource: 'contact';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["contact"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["contact"], operation: ["getAll"], returnAll: [false] }
 * @default 20
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update contact properties */
export type GetResponseV1ContactUpdateConfig = {
	resource: 'contact';
	operation: 'update';
/**
 * Unique identifier for a particular contact
 * @displayOptions.show { resource: ["contact"], operation: ["update"] }
 */
		contactId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};


// ===========================================================================
// Output Types
// ===========================================================================

export type GetResponseV1ContactGetOutput = {
	activities?: string;
	campaign?: {
		campaignId?: string;
		href?: string;
		name?: string;
	};
	changedOn?: string;
	contactId?: string;
	createdOn?: string;
	customFieldValues?: Array<{
		customFieldId?: string;
		fieldType?: string;
		name?: string;
		type?: string;
		value?: Array<string>;
		values?: Array<string>;
		valueType?: string;
	}>;
	dayOfCycle?: null;
	email?: string;
	geolocation?: {
		continentCode?: string;
		countryCode?: string;
		dmaCode?: null;
	};
	href?: string;
	ipAddress?: string;
	note?: null;
	origin?: string;
	tags?: Array<{
		color?: string;
		href?: string;
		name?: string;
		tagId?: string;
	}>;
	timeZone?: string;
};

export type GetResponseV1ContactGetAllOutput = {
	activities?: string;
	campaign?: {
		campaignId?: string;
		href?: string;
		name?: string;
	};
	changedOn?: string;
	contactId?: string;
	createdOn?: string;
	email?: string;
	href?: string;
	ipAddress?: string;
	note?: null;
	origin?: string;
	timeZone?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface GetResponseV1Credentials {
	getResponseApi: CredentialReference;
	getResponseOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GetResponseV1NodeBase {
	type: 'n8n-nodes-base.getResponse';
	version: 1;
	credentials?: GetResponseV1Credentials;
}

export type GetResponseV1ContactCreateNode = GetResponseV1NodeBase & {
	config: NodeConfig<GetResponseV1ContactCreateConfig>;
};

export type GetResponseV1ContactDeleteNode = GetResponseV1NodeBase & {
	config: NodeConfig<GetResponseV1ContactDeleteConfig>;
};

export type GetResponseV1ContactGetNode = GetResponseV1NodeBase & {
	config: NodeConfig<GetResponseV1ContactGetConfig>;
	output?: GetResponseV1ContactGetOutput;
};

export type GetResponseV1ContactGetAllNode = GetResponseV1NodeBase & {
	config: NodeConfig<GetResponseV1ContactGetAllConfig>;
	output?: GetResponseV1ContactGetAllOutput;
};

export type GetResponseV1ContactUpdateNode = GetResponseV1NodeBase & {
	config: NodeConfig<GetResponseV1ContactUpdateConfig>;
};

export type GetResponseV1Node =
	| GetResponseV1ContactCreateNode
	| GetResponseV1ContactDeleteNode
	| GetResponseV1ContactGetNode
	| GetResponseV1ContactGetAllNode
	| GetResponseV1ContactUpdateNode
	;