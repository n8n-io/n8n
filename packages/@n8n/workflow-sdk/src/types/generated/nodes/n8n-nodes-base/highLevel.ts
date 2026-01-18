/**
 * HighLevel Node Types
 *
 * Consume HighLevel API v2
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/highlevel/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type HighLevelV2ContactCreateConfig = {
	resource: 'contact';
	operation: 'create';
	/**
	 * Email or Phone are required to create contact
	 */
	email?: string | Expression<string>;
	/**
	 * Phone or Email are required to create contact. Phone number has to start with a valid &lt;a href="https://en.wikipedia.org/wiki/List_of_country_calling_codes"&gt;country code&lt;/a&gt; leading with + sign.
	 */
	phone?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2ContactDeleteConfig = {
	resource: 'contact';
	operation: 'delete';
	contactId: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
	contactId: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2ContactGetAllConfig = {
	resource: 'contact';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
	options?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2ContactUpdateConfig = {
	resource: 'contact';
	operation: 'update';
	contactId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2OpportunityCreateConfig = {
	resource: 'opportunity';
	operation: 'create';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	pipelineId?: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	contactId: string | Expression<string>;
	name: string | Expression<string>;
	status: 'open' | 'won' | 'lost' | 'abandoned' | Expression<string>;
	additionalFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2OpportunityDeleteConfig = {
	resource: 'opportunity';
	operation: 'delete';
	opportunityId: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2OpportunityGetConfig = {
	resource: 'opportunity';
	operation: 'get';
	opportunityId: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2OpportunityGetAllConfig = {
	resource: 'opportunity';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 20
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2OpportunityUpdateConfig = {
	resource: 'opportunity';
	operation: 'update';
	opportunityId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2TaskCreateConfig = {
	resource: 'task';
	operation: 'create';
	/**
	 * Contact the task belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	contactId: string | Expression<string>;
	title: string | Expression<string>;
	dueDate: string | Expression<string>;
	completed: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2TaskDeleteConfig = {
	resource: 'task';
	operation: 'delete';
	/**
	 * Contact the task belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	contactId: string | Expression<string>;
	taskId: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2TaskGetConfig = {
	resource: 'task';
	operation: 'get';
	/**
	 * Contact the task belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	contactId: string | Expression<string>;
	taskId: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2TaskGetAllConfig = {
	resource: 'task';
	operation: 'getAll';
	/**
	 * Contact the task belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	contactId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 20
	 */
	limit?: number | Expression<number>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2TaskUpdateConfig = {
	resource: 'task';
	operation: 'update';
	/**
	 * Contact the task belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	contactId: string | Expression<string>;
	taskId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2CalendarBookAppointmentConfig = {
	resource: 'calendar';
	operation: 'bookAppointment';
	calendarId: string | Expression<string>;
	locationId: string | Expression<string>;
	contactId: string | Expression<string>;
	/**
	 * Example: 2021-06-23T03:30:00+05:30
	 */
	startTime: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2CalendarGetFreeSlotsConfig = {
	resource: 'calendar';
	operation: 'getFreeSlots';
	calendarId: string | Expression<string>;
	/**
	 * The start date for fetching free calendar slots. Example: 1548898600000.
	 */
	startDate: number | Expression<number>;
	/**
	 * The end date for fetching free calendar slots. Example: 1601490599999.
	 */
	endDate: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2Params =
	| HighLevelV2ContactCreateConfig
	| HighLevelV2ContactDeleteConfig
	| HighLevelV2ContactGetConfig
	| HighLevelV2ContactGetAllConfig
	| HighLevelV2ContactUpdateConfig
	| HighLevelV2OpportunityCreateConfig
	| HighLevelV2OpportunityDeleteConfig
	| HighLevelV2OpportunityGetConfig
	| HighLevelV2OpportunityGetAllConfig
	| HighLevelV2OpportunityUpdateConfig
	| HighLevelV2TaskCreateConfig
	| HighLevelV2TaskDeleteConfig
	| HighLevelV2TaskGetConfig
	| HighLevelV2TaskGetAllConfig
	| HighLevelV2TaskUpdateConfig
	| HighLevelV2CalendarBookAppointmentConfig
	| HighLevelV2CalendarGetFreeSlotsConfig;

export type HighLevelV1ContactCreateConfig = {
	resource: 'contact';
	operation: 'create';
	/**
	 * Email or Phone are required to create contact
	 */
	email?: string | Expression<string>;
	/**
	 * Phone or Email are required to create contact. Phone number has to start with a valid &lt;a href="https://en.wikipedia.org/wiki/List_of_country_calling_codes"&gt;country code&lt;/a&gt; leading with + sign.
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	email?: string | Expression<string>;
	/**
	 * Lookup Contact by Phone. It will first try to find a contact by Email and than by Phone.
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
	 */
	pipelineId?: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	stageId: string | Expression<string>;
	/**
	 * Either Email, Phone or Contact ID
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
	 */
	pipelineId?: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	contactId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	| HighLevelV1TaskUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface HighLevelV2Credentials {
	highLevelOAuth2Api: CredentialReference;
}

export interface HighLevelV1Credentials {
	highLevelApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type HighLevelV2Node = {
	type: 'n8n-nodes-base.highLevel';
	version: 2;
	config: NodeConfig<HighLevelV2Params>;
	credentials?: HighLevelV2Credentials;
};

export type HighLevelV1Node = {
	type: 'n8n-nodes-base.highLevel';
	version: 1;
	config: NodeConfig<HighLevelV1Params>;
	credentials?: HighLevelV1Credentials;
};

export type HighLevelNode = HighLevelV2Node | HighLevelV1Node;
