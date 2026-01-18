/**
 * Customer.io Node Types
 *
 * Consume Customer.io API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/customerio/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new customer, or update the current one if it already exists (upsert) */
export type CustomerIoV1CustomerUpsertConfig = {
	resource: 'customer';
	operation: 'upsert';
	/**
	 * The unique identifier for the customer
	 */
	id: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	/**
	 * Object of values to set as described &lt;a href="https://github.com/agilecrm/rest-api#1-companys---companies-api"&gt;here&lt;/a&gt;
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
	 */
	id: string | Expression<string>;
};

/** Track a customer event */
export type CustomerIoV1EventTrackConfig = {
	resource: 'event';
	operation: 'track';
	/**
	 * The unique identifier for the customer
	 */
	customerId: string | Expression<string>;
	/**
	 * Name of the event to track
	 */
	eventName?: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	/**
	 * Object of values to set as described &lt;a href="https://customer.io/docs/api-triggered-data-format#basic-data-formatting"&gt;here&lt;/a&gt;
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
	 */
	eventName: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	/**
	 * Object of values to set as described &lt;a href="https://customer.io/docs/api-triggered-data-format#basic-data-formatting"&gt;here&lt;/a&gt;
	 */
	additionalFieldsJson?: IDataObject | string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type CustomerIoV1CampaignGetConfig = {
	resource: 'campaign';
	operation: 'get';
	/**
	 * The unique identifier for the campaign
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
	 * @default 0
	 */
	campaignId: number | Expression<number>;
	/**
	 * Specify metric period
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
	 * @default 0
	 */
	segmentId: number | Expression<number>;
	/**
	 * A list of customer IDs to add to the segment
	 */
	customerIds: string | Expression<string>;
};

export type CustomerIoV1SegmentRemoveConfig = {
	resource: 'segment';
	operation: 'remove';
	/**
	 * The unique identifier of the segment
	 * @default 0
	 */
	segmentId: number | Expression<number>;
	/**
	 * A list of customer IDs to add to the segment
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
	| CustomerIoV1SegmentRemoveConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface CustomerIoV1Credentials {
	customerIoApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type CustomerIoNode = {
	type: 'n8n-nodes-base.customerIo';
	version: 1;
	config: NodeConfig<CustomerIoV1Params>;
	credentials?: CustomerIoV1Credentials;
};
