/**
 * HighLevel Node - Version 1
 * Consume HighLevel API v1
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type HighLevelV1ContactCreateConfig = {
	resource: 'contact';
	operation: 'create';
/**
 * Email or Phone are required to create contact
 * @displayOptions.show { resource: ["contact"], operation: ["create"] }
 */
		email?: string | Expression<string>;
/**
 * Phone or Email are required to create contact. Phone number has to start with a valid &lt;a href="https://en.wikipedia.org/wiki/List_of_country_calling_codes"&gt;country code&lt;/a&gt; leading with + sign.
 * @displayOptions.show { resource: ["contact"], operation: ["create"] }
 */
		phone?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV1ContactDeleteConfig = {
	resource: 'contact';
	operation: 'delete';
	contactId?: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV1ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
	contactId: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV1ContactGetAllConfig = {
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
	filters?: Record<string, unknown>;
	options?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV1ContactLookupConfig = {
	resource: 'contact';
	operation: 'lookup';
/**
 * Lookup Contact by Email. If Email is not found it will try to find a contact by phone.
 * @displayOptions.show { resource: ["contact"], operation: ["lookup"] }
 */
		email?: string | Expression<string>;
/**
 * Lookup Contact by Phone. It will first try to find a contact by Email and than by Phone.
 * @displayOptions.show { resource: ["contact"], operation: ["lookup"] }
 */
		phone?: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV1ContactUpdateConfig = {
	resource: 'contact';
	operation: 'update';
	contactId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV1OpportunityCreateConfig = {
	resource: 'opportunity';
	operation: 'create';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["opportunity"], operation: ["create", "delete", "get", "getAll", "update"] }
 */
		pipelineId?: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["opportunity"], operation: ["create"] }
 */
		stageId: string | Expression<string>;
/**
 * Either Email, Phone or Contact ID
 * @hint There can only be one opportunity for each contact.
 * @displayOptions.show { resource: ["opportunity"], operation: ["create"] }
 */
		contactIdentifier: string | Expression<string>;
	title: string | Expression<string>;
	status: 'open' | 'won' | 'lost' | 'abandoned' | Expression<string>;
	additionalFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV1OpportunityDeleteConfig = {
	resource: 'opportunity';
	operation: 'delete';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["opportunity"], operation: ["create", "delete", "get", "getAll", "update"] }
 */
		pipelineId?: string | Expression<string>;
	opportunityId: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV1OpportunityGetConfig = {
	resource: 'opportunity';
	operation: 'get';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["opportunity"], operation: ["create", "delete", "get", "getAll", "update"] }
 */
		pipelineId?: string | Expression<string>;
	opportunityId: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV1OpportunityGetAllConfig = {
	resource: 'opportunity';
	operation: 'getAll';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["opportunity"], operation: ["create", "delete", "get", "getAll", "update"] }
 */
		pipelineId?: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["opportunity"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["opportunity"], operation: ["getAll"], returnAll: [false] }
 * @default 20
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV1OpportunityUpdateConfig = {
	resource: 'opportunity';
	operation: 'update';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["opportunity"], operation: ["create", "delete", "get", "getAll", "update"] }
 */
		pipelineId?: string | Expression<string>;
	opportunityId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV1TaskCreateConfig = {
	resource: 'task';
	operation: 'create';
/**
 * Contact the task belongs to
 * @displayOptions.show { resource: ["task"], operation: ["create"] }
 */
		contactId: string | Expression<string>;
	title: string | Expression<string>;
	dueDate: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV1TaskDeleteConfig = {
	resource: 'task';
	operation: 'delete';
/**
 * Contact the task belongs to
 * @displayOptions.show { resource: ["task"], operation: ["delete"] }
 */
		contactId: string | Expression<string>;
	taskId: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV1TaskGetConfig = {
	resource: 'task';
	operation: 'get';
/**
 * Contact the task belongs to
 * @displayOptions.show { resource: ["task"], operation: ["get"] }
 */
		contactId: string | Expression<string>;
	taskId: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV1TaskGetAllConfig = {
	resource: 'task';
	operation: 'getAll';
/**
 * Contact the task belongs to
 * @displayOptions.show { resource: ["task"], operation: ["getAll"] }
 */
		contactId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["task"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["task"], operation: ["getAll"], returnAll: [false] }
 * @default 20
 */
		limit?: number | Expression<number>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV1TaskUpdateConfig = {
	resource: 'task';
	operation: 'update';
/**
 * Contact the task belongs to
 * @displayOptions.show { resource: ["task"], operation: ["update"] }
 */
		contactId: string | Expression<string>;
	taskId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV1Params =
	| HighLevelV1ContactCreateConfig
	| HighLevelV1ContactDeleteConfig
	| HighLevelV1ContactGetConfig
	| HighLevelV1ContactGetAllConfig
	| HighLevelV1ContactLookupConfig
	| HighLevelV1ContactUpdateConfig
	| HighLevelV1OpportunityCreateConfig
	| HighLevelV1OpportunityDeleteConfig
	| HighLevelV1OpportunityGetConfig
	| HighLevelV1OpportunityGetAllConfig
	| HighLevelV1OpportunityUpdateConfig
	| HighLevelV1TaskCreateConfig
	| HighLevelV1TaskDeleteConfig
	| HighLevelV1TaskGetConfig
	| HighLevelV1TaskGetAllConfig
	| HighLevelV1TaskUpdateConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type HighLevelV1ContactLookupOutput = {
	address1?: string;
	assignedTo?: string;
	city?: string;
	country?: string;
	customField?: Array<{
		id?: string;
	}>;
	dateAdded?: string;
	email?: string;
	emailLowerCase?: string;
	fingerprint?: string;
	firstName?: string;
	firstNameLowerCase?: string;
	fullNameLowerCase?: string;
	id?: string;
	lastName?: string;
	lastNameLowerCase?: string;
	locationId?: string;
	phone?: string;
	postalCode?: string;
	source?: string;
	state?: string;
	tags?: Array<string>;
	timezone?: string;
	type?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface HighLevelV1Credentials {
	highLevelApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface HighLevelV1NodeBase {
	type: 'n8n-nodes-base.highLevel';
	version: 1;
	credentials?: HighLevelV1Credentials;
}

export type HighLevelV1ContactCreateNode = HighLevelV1NodeBase & {
	config: NodeConfig<HighLevelV1ContactCreateConfig>;
};

export type HighLevelV1ContactDeleteNode = HighLevelV1NodeBase & {
	config: NodeConfig<HighLevelV1ContactDeleteConfig>;
};

export type HighLevelV1ContactGetNode = HighLevelV1NodeBase & {
	config: NodeConfig<HighLevelV1ContactGetConfig>;
};

export type HighLevelV1ContactGetAllNode = HighLevelV1NodeBase & {
	config: NodeConfig<HighLevelV1ContactGetAllConfig>;
};

export type HighLevelV1ContactLookupNode = HighLevelV1NodeBase & {
	config: NodeConfig<HighLevelV1ContactLookupConfig>;
	output?: HighLevelV1ContactLookupOutput;
};

export type HighLevelV1ContactUpdateNode = HighLevelV1NodeBase & {
	config: NodeConfig<HighLevelV1ContactUpdateConfig>;
};

export type HighLevelV1OpportunityCreateNode = HighLevelV1NodeBase & {
	config: NodeConfig<HighLevelV1OpportunityCreateConfig>;
};

export type HighLevelV1OpportunityDeleteNode = HighLevelV1NodeBase & {
	config: NodeConfig<HighLevelV1OpportunityDeleteConfig>;
};

export type HighLevelV1OpportunityGetNode = HighLevelV1NodeBase & {
	config: NodeConfig<HighLevelV1OpportunityGetConfig>;
};

export type HighLevelV1OpportunityGetAllNode = HighLevelV1NodeBase & {
	config: NodeConfig<HighLevelV1OpportunityGetAllConfig>;
};

export type HighLevelV1OpportunityUpdateNode = HighLevelV1NodeBase & {
	config: NodeConfig<HighLevelV1OpportunityUpdateConfig>;
};

export type HighLevelV1TaskCreateNode = HighLevelV1NodeBase & {
	config: NodeConfig<HighLevelV1TaskCreateConfig>;
};

export type HighLevelV1TaskDeleteNode = HighLevelV1NodeBase & {
	config: NodeConfig<HighLevelV1TaskDeleteConfig>;
};

export type HighLevelV1TaskGetNode = HighLevelV1NodeBase & {
	config: NodeConfig<HighLevelV1TaskGetConfig>;
};

export type HighLevelV1TaskGetAllNode = HighLevelV1NodeBase & {
	config: NodeConfig<HighLevelV1TaskGetAllConfig>;
};

export type HighLevelV1TaskUpdateNode = HighLevelV1NodeBase & {
	config: NodeConfig<HighLevelV1TaskUpdateConfig>;
};

export type HighLevelV1Node =
	| HighLevelV1ContactCreateNode
	| HighLevelV1ContactDeleteNode
	| HighLevelV1ContactGetNode
	| HighLevelV1ContactGetAllNode
	| HighLevelV1ContactLookupNode
	| HighLevelV1ContactUpdateNode
	| HighLevelV1OpportunityCreateNode
	| HighLevelV1OpportunityDeleteNode
	| HighLevelV1OpportunityGetNode
	| HighLevelV1OpportunityGetAllNode
	| HighLevelV1OpportunityUpdateNode
	| HighLevelV1TaskCreateNode
	| HighLevelV1TaskDeleteNode
	| HighLevelV1TaskGetNode
	| HighLevelV1TaskGetAllNode
	| HighLevelV1TaskUpdateNode
	;