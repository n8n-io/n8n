/**
 * ConvertKit Node Types
 *
 * Consume ConvertKit API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/convertkit/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a field */
export type ConvertKitV1CustomFieldCreateConfig = {
	resource: 'customField';
	operation: 'create';
	/**
	 * The label of the custom field
	 */
	label: string | Expression<string>;
};

/** Delete a field */
export type ConvertKitV1CustomFieldDeleteConfig = {
	resource: 'customField';
	operation: 'delete';
	/**
	 * The ID of your custom field
	 */
	id: string | Expression<string>;
};

/** Get many fields */
export type ConvertKitV1CustomFieldGetAllConfig = {
	resource: 'customField';
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

/** Update a field */
export type ConvertKitV1CustomFieldUpdateConfig = {
	resource: 'customField';
	operation: 'update';
	/**
	 * The ID of your custom field
	 */
	id: string | Expression<string>;
	/**
	 * The label of the custom field
	 */
	label: string | Expression<string>;
};

/** Add a subscriber */
export type ConvertKitV1FormAddSubscriberConfig = {
	resource: 'form';
	operation: 'addSubscriber';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	id: string | Expression<string>;
	/**
	 * The subscriber's email address
	 */
	email: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get many fields */
export type ConvertKitV1FormGetAllConfig = {
	resource: 'form';
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

/** List subscriptions to a form including subscriber data */
export type ConvertKitV1FormGetSubscriptionsConfig = {
	resource: 'form';
	operation: 'getSubscriptions';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	id: string | Expression<string>;
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
	/**
	 * Receive only active subscribers or cancelled subscribers
	 * @default {}
	 */
	additionalFields?: Record<string, unknown>;
};

/** Add a subscriber */
export type ConvertKitV1SequenceAddSubscriberConfig = {
	resource: 'sequence';
	operation: 'addSubscriber';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	id: string | Expression<string>;
	/**
	 * The subscriber's email address
	 */
	email: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get many fields */
export type ConvertKitV1SequenceGetAllConfig = {
	resource: 'sequence';
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

/** List subscriptions to a form including subscriber data */
export type ConvertKitV1SequenceGetSubscriptionsConfig = {
	resource: 'sequence';
	operation: 'getSubscriptions';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	id: string | Expression<string>;
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
	/**
	 * Receive only active subscribers or cancelled subscribers
	 * @default {}
	 */
	additionalFields?: Record<string, unknown>;
};

/** Create a field */
export type ConvertKitV1TagCreateConfig = {
	resource: 'tag';
	operation: 'create';
	/**
	 * Tag name, multiple can be added separated by comma
	 */
	name: string | Expression<string>;
};

/** Get many fields */
export type ConvertKitV1TagGetAllConfig = {
	resource: 'tag';
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

/** Add a tag to a subscriber */
export type ConvertKitV1TagSubscriberAddConfig = {
	resource: 'tagSubscriber';
	operation: 'add';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	tagId: string | Expression<string>;
	/**
	 * Subscriber email address
	 */
	email: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get many fields */
export type ConvertKitV1TagSubscriberGetAllConfig = {
	resource: 'tagSubscriber';
	operation: 'getAll';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	tagId: string | Expression<string>;
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
	/**
	 * Receive only active subscribers or cancelled subscribers
	 * @default {}
	 */
	additionalFields?: Record<string, unknown>;
};

/** Delete a field */
export type ConvertKitV1TagSubscriberDeleteConfig = {
	resource: 'tagSubscriber';
	operation: 'delete';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	tagId: string | Expression<string>;
	/**
	 * Subscriber email address
	 */
	email: string | Expression<string>;
};

export type ConvertKitV1Params =
	| ConvertKitV1CustomFieldCreateConfig
	| ConvertKitV1CustomFieldDeleteConfig
	| ConvertKitV1CustomFieldGetAllConfig
	| ConvertKitV1CustomFieldUpdateConfig
	| ConvertKitV1FormAddSubscriberConfig
	| ConvertKitV1FormGetAllConfig
	| ConvertKitV1FormGetSubscriptionsConfig
	| ConvertKitV1SequenceAddSubscriberConfig
	| ConvertKitV1SequenceGetAllConfig
	| ConvertKitV1SequenceGetSubscriptionsConfig
	| ConvertKitV1TagCreateConfig
	| ConvertKitV1TagGetAllConfig
	| ConvertKitV1TagSubscriberAddConfig
	| ConvertKitV1TagSubscriberGetAllConfig
	| ConvertKitV1TagSubscriberDeleteConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface ConvertKitV1Credentials {
	convertKitApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type ConvertKitV1Node = {
	type: 'n8n-nodes-base.convertKit';
	version: 1;
	config: NodeConfig<ConvertKitV1Params>;
	credentials?: ConvertKitV1Credentials;
};

export type ConvertKitNode = ConvertKitV1Node;
