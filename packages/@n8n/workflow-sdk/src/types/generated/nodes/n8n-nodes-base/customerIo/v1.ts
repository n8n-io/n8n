/**
 * Customer.io Node - Version 1
 * Consume Customer.io API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new customer, or update the current one if it already exists (upsert) */
export type CustomerIoV1CustomerUpsertConfig = {
	resource: 'customer';
	operation: 'upsert';
/**
 * The unique identifier for the customer
 * @displayOptions.show { resource: ["customer"], operation: ["upsert"] }
 */
		id: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
/**
 * Object of values to set as described &lt;a href="https://github.com/agilecrm/rest-api#1-companys---companies-api"&gt;here&lt;/a&gt;
 * @displayOptions.show { resource: ["customer"], operation: ["upsert"], jsonParameters: [true] }
 */
		additionalFieldsJson?: IDataObject | string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a customer */
export type CustomerIoV1CustomerDeleteConfig = {
	resource: 'customer';
	operation: 'delete';
/**
 * The unique identifier for the customer
 * @displayOptions.show { resource: ["customer"], operation: ["delete"] }
 */
		id: string | Expression<string>;
};

/** Track a customer event */
export type CustomerIoV1EventTrackConfig = {
	resource: 'event';
	operation: 'track';
/**
 * The unique identifier for the customer
 * @displayOptions.show { resource: ["event"], operation: ["track"] }
 */
		customerId: string | Expression<string>;
/**
 * Name of the event to track
 * @displayOptions.show { resource: ["event"], operation: ["track"] }
 */
		eventName?: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
/**
 * Object of values to set as described &lt;a href="https://customer.io/docs/api-triggered-data-format#basic-data-formatting"&gt;here&lt;/a&gt;
 * @displayOptions.show { resource: ["event"], operation: ["track"], jsonParameters: [true] }
 */
		additionalFieldsJson?: IDataObject | string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Track an anonymous event */
export type CustomerIoV1EventTrackAnonymousConfig = {
	resource: 'event';
	operation: 'trackAnonymous';
/**
 * The unique identifier for the customer
 * @displayOptions.show { resource: ["event"], operation: ["trackAnonymous"] }
 */
		eventName: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
/**
 * Object of values to set as described &lt;a href="https://customer.io/docs/api-triggered-data-format#basic-data-formatting"&gt;here&lt;/a&gt;
 * @displayOptions.show { resource: ["event"], operation: ["trackAnonymous"], jsonParameters: [true] }
 */
		additionalFieldsJson?: IDataObject | string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type CustomerIoV1CampaignGetConfig = {
	resource: 'campaign';
	operation: 'get';
/**
 * The unique identifier for the campaign
 * @displayOptions.show { resource: ["campaign"], operation: ["get"] }
 * @default 0
 */
		campaignId: number | Expression<number>;
};

export type CustomerIoV1CampaignGetAllConfig = {
	resource: 'campaign';
	operation: 'getAll';
};

export type CustomerIoV1CampaignGetMetricsConfig = {
	resource: 'campaign';
	operation: 'getMetrics';
/**
 * The unique identifier for the campaign
 * @displayOptions.show { resource: ["campaign"], operation: ["getMetrics"] }
 * @default 0
 */
		campaignId: number | Expression<number>;
/**
 * Specify metric period
 * @displayOptions.show { resource: ["campaign"], operation: ["getMetrics"] }
 * @default days
 */
		period?: 'hours' | 'days' | 'weeks' | 'months' | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
};

export type CustomerIoV1SegmentAddConfig = {
	resource: 'segment';
	operation: 'add';
/**
 * The unique identifier of the segment
 * @displayOptions.show { resource: ["segment"], operation: ["add", "remove"] }
 * @default 0
 */
		segmentId: number | Expression<number>;
/**
 * A list of customer IDs to add to the segment
 * @displayOptions.show { resource: ["segment"], operation: ["add", "remove"] }
 */
		customerIds: string | Expression<string>;
};

export type CustomerIoV1SegmentRemoveConfig = {
	resource: 'segment';
	operation: 'remove';
/**
 * The unique identifier of the segment
 * @displayOptions.show { resource: ["segment"], operation: ["add", "remove"] }
 * @default 0
 */
		segmentId: number | Expression<number>;
/**
 * A list of customer IDs to add to the segment
 * @displayOptions.show { resource: ["segment"], operation: ["add", "remove"] }
 */
		customerIds: string | Expression<string>;
};

export type CustomerIoV1Params =
	| CustomerIoV1CustomerUpsertConfig
	| CustomerIoV1CustomerDeleteConfig
	| CustomerIoV1EventTrackConfig
	| CustomerIoV1EventTrackAnonymousConfig
	| CustomerIoV1CampaignGetConfig
	| CustomerIoV1CampaignGetAllConfig
	| CustomerIoV1CampaignGetMetricsConfig
	| CustomerIoV1SegmentAddConfig
	| CustomerIoV1SegmentRemoveConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type CustomerIoV1CustomerUpsertOutput = {
	email?: string;
};

export type CustomerIoV1EventTrackOutput = {
	success?: boolean;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface CustomerIoV1Credentials {
	customerIoApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface CustomerIoV1NodeBase {
	type: 'n8n-nodes-base.customerIo';
	version: 1;
	credentials?: CustomerIoV1Credentials;
}

export type CustomerIoV1CustomerUpsertNode = CustomerIoV1NodeBase & {
	config: NodeConfig<CustomerIoV1CustomerUpsertConfig>;
	output?: CustomerIoV1CustomerUpsertOutput;
};

export type CustomerIoV1CustomerDeleteNode = CustomerIoV1NodeBase & {
	config: NodeConfig<CustomerIoV1CustomerDeleteConfig>;
};

export type CustomerIoV1EventTrackNode = CustomerIoV1NodeBase & {
	config: NodeConfig<CustomerIoV1EventTrackConfig>;
	output?: CustomerIoV1EventTrackOutput;
};

export type CustomerIoV1EventTrackAnonymousNode = CustomerIoV1NodeBase & {
	config: NodeConfig<CustomerIoV1EventTrackAnonymousConfig>;
};

export type CustomerIoV1CampaignGetNode = CustomerIoV1NodeBase & {
	config: NodeConfig<CustomerIoV1CampaignGetConfig>;
};

export type CustomerIoV1CampaignGetAllNode = CustomerIoV1NodeBase & {
	config: NodeConfig<CustomerIoV1CampaignGetAllConfig>;
};

export type CustomerIoV1CampaignGetMetricsNode = CustomerIoV1NodeBase & {
	config: NodeConfig<CustomerIoV1CampaignGetMetricsConfig>;
};

export type CustomerIoV1SegmentAddNode = CustomerIoV1NodeBase & {
	config: NodeConfig<CustomerIoV1SegmentAddConfig>;
};

export type CustomerIoV1SegmentRemoveNode = CustomerIoV1NodeBase & {
	config: NodeConfig<CustomerIoV1SegmentRemoveConfig>;
};

export type CustomerIoV1Node =
	| CustomerIoV1CustomerUpsertNode
	| CustomerIoV1CustomerDeleteNode
	| CustomerIoV1EventTrackNode
	| CustomerIoV1EventTrackAnonymousNode
	| CustomerIoV1CampaignGetNode
	| CustomerIoV1CampaignGetAllNode
	| CustomerIoV1CampaignGetMetricsNode
	| CustomerIoV1SegmentAddNode
	| CustomerIoV1SegmentRemoveNode
	;