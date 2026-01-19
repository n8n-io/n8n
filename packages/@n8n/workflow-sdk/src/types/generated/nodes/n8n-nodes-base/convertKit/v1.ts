/**
 * ConvertKit Node - Version 1
 * Consume ConvertKit API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a field */
export type ConvertKitV1CustomFieldCreateConfig = {
	resource: 'customField';
	operation: 'create';
/**
 * The label of the custom field
 * @displayOptions.show { resource: ["customField"], operation: ["update", "create"] }
 */
		label: string | Expression<string>;
};

/** Delete a field */
export type ConvertKitV1CustomFieldDeleteConfig = {
	resource: 'customField';
	operation: 'delete';
/**
 * The ID of your custom field
 * @displayOptions.show { resource: ["customField"], operation: ["update", "delete"] }
 */
		id: string | Expression<string>;
};

/** Get many fields */
export type ConvertKitV1CustomFieldGetAllConfig = {
	resource: 'customField';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["customField"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["customField"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["customField"], operation: ["update", "delete"] }
 */
		id: string | Expression<string>;
/**
 * The label of the custom field
 * @displayOptions.show { resource: ["customField"], operation: ["update", "create"] }
 */
		label: string | Expression<string>;
};

/** Add a subscriber */
export type ConvertKitV1FormAddSubscriberConfig = {
	resource: 'form';
	operation: 'addSubscriber';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["form"], operation: ["addSubscriber", "getSubscriptions"] }
 */
		id: string | Expression<string>;
/**
 * The subscriber's email address
 * @displayOptions.show { resource: ["form"], operation: ["addSubscriber"] }
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
 * @displayOptions.show { operation: ["getAll", "getSubscriptions"], resource: ["form"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll", "getSubscriptions"], resource: ["form"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["form"], operation: ["addSubscriber", "getSubscriptions"] }
 */
		id: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll", "getSubscriptions"], resource: ["form"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll", "getSubscriptions"], resource: ["form"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * Receive only active subscribers or cancelled subscribers
 * @displayOptions.show { resource: ["form"], operation: ["getSubscriptions"] }
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
 * @displayOptions.show { resource: ["sequence"], operation: ["addSubscriber", "getSubscriptions"] }
 */
		id: string | Expression<string>;
/**
 * The subscriber's email address
 * @displayOptions.show { resource: ["sequence"], operation: ["addSubscriber"] }
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
 * @displayOptions.show { operation: ["getAll", "getSubscriptions"], resource: ["sequence"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll", "getSubscriptions"], resource: ["sequence"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["sequence"], operation: ["addSubscriber", "getSubscriptions"] }
 */
		id: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll", "getSubscriptions"], resource: ["sequence"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll", "getSubscriptions"], resource: ["sequence"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * Receive only active subscribers or cancelled subscribers
 * @displayOptions.show { resource: ["sequence"], operation: ["getSubscriptions"] }
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
 * @displayOptions.show { resource: ["tag"], operation: ["create"] }
 */
		name: string | Expression<string>;
};

/** Get many fields */
export type ConvertKitV1TagGetAllConfig = {
	resource: 'tag';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["tag"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["tag"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["tagSubscriber"], operation: ["add", "getAll", "delete"] }
 */
		tagId: string | Expression<string>;
/**
 * Subscriber email address
 * @displayOptions.show { resource: ["tagSubscriber"], operation: ["add", "delete"] }
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
 * @displayOptions.show { resource: ["tagSubscriber"], operation: ["add", "getAll", "delete"] }
 */
		tagId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["tagSubscriber"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["tagSubscriber"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * Receive only active subscribers or cancelled subscribers
 * @displayOptions.show { resource: ["tagSubscriber"], operation: ["getAll"] }
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
 * @displayOptions.show { resource: ["tagSubscriber"], operation: ["add", "getAll", "delete"] }
 */
		tagId: string | Expression<string>;
/**
 * Subscriber email address
 * @displayOptions.show { resource: ["tagSubscriber"], operation: ["add", "delete"] }
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
	| ConvertKitV1TagSubscriberDeleteConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type ConvertKitV1FormAddSubscriberOutput = {
	created_at?: string;
	id?: number;
	referrer?: null;
	state?: string;
	subscribable_id?: number;
	subscribable_type?: string;
	subscriber?: {
		created_at?: string;
		email_address?: string;
		id?: number;
		state?: string;
	};
};

export type ConvertKitV1TagSubscriberAddOutput = {
	created_at?: string;
	id?: number;
	referrer?: null;
	source?: string | null;
	state?: string;
	subscribable_id?: number;
	subscribable_type?: string;
	subscriber?: {
		created_at?: string;
		email_address?: string;
		id?: number;
		state?: string;
	};
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface ConvertKitV1Credentials {
	convertKitApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface ConvertKitV1NodeBase {
	type: 'n8n-nodes-base.convertKit';
	version: 1;
	credentials?: ConvertKitV1Credentials;
}

export type ConvertKitV1CustomFieldCreateNode = ConvertKitV1NodeBase & {
	config: NodeConfig<ConvertKitV1CustomFieldCreateConfig>;
};

export type ConvertKitV1CustomFieldDeleteNode = ConvertKitV1NodeBase & {
	config: NodeConfig<ConvertKitV1CustomFieldDeleteConfig>;
};

export type ConvertKitV1CustomFieldGetAllNode = ConvertKitV1NodeBase & {
	config: NodeConfig<ConvertKitV1CustomFieldGetAllConfig>;
};

export type ConvertKitV1CustomFieldUpdateNode = ConvertKitV1NodeBase & {
	config: NodeConfig<ConvertKitV1CustomFieldUpdateConfig>;
};

export type ConvertKitV1FormAddSubscriberNode = ConvertKitV1NodeBase & {
	config: NodeConfig<ConvertKitV1FormAddSubscriberConfig>;
	output?: ConvertKitV1FormAddSubscriberOutput;
};

export type ConvertKitV1FormGetAllNode = ConvertKitV1NodeBase & {
	config: NodeConfig<ConvertKitV1FormGetAllConfig>;
};

export type ConvertKitV1FormGetSubscriptionsNode = ConvertKitV1NodeBase & {
	config: NodeConfig<ConvertKitV1FormGetSubscriptionsConfig>;
};

export type ConvertKitV1SequenceAddSubscriberNode = ConvertKitV1NodeBase & {
	config: NodeConfig<ConvertKitV1SequenceAddSubscriberConfig>;
};

export type ConvertKitV1SequenceGetAllNode = ConvertKitV1NodeBase & {
	config: NodeConfig<ConvertKitV1SequenceGetAllConfig>;
};

export type ConvertKitV1SequenceGetSubscriptionsNode = ConvertKitV1NodeBase & {
	config: NodeConfig<ConvertKitV1SequenceGetSubscriptionsConfig>;
};

export type ConvertKitV1TagCreateNode = ConvertKitV1NodeBase & {
	config: NodeConfig<ConvertKitV1TagCreateConfig>;
};

export type ConvertKitV1TagGetAllNode = ConvertKitV1NodeBase & {
	config: NodeConfig<ConvertKitV1TagGetAllConfig>;
};

export type ConvertKitV1TagSubscriberAddNode = ConvertKitV1NodeBase & {
	config: NodeConfig<ConvertKitV1TagSubscriberAddConfig>;
	output?: ConvertKitV1TagSubscriberAddOutput;
};

export type ConvertKitV1TagSubscriberGetAllNode = ConvertKitV1NodeBase & {
	config: NodeConfig<ConvertKitV1TagSubscriberGetAllConfig>;
};

export type ConvertKitV1TagSubscriberDeleteNode = ConvertKitV1NodeBase & {
	config: NodeConfig<ConvertKitV1TagSubscriberDeleteConfig>;
};

export type ConvertKitV1Node =
	| ConvertKitV1CustomFieldCreateNode
	| ConvertKitV1CustomFieldDeleteNode
	| ConvertKitV1CustomFieldGetAllNode
	| ConvertKitV1CustomFieldUpdateNode
	| ConvertKitV1FormAddSubscriberNode
	| ConvertKitV1FormGetAllNode
	| ConvertKitV1FormGetSubscriptionsNode
	| ConvertKitV1SequenceAddSubscriberNode
	| ConvertKitV1SequenceGetAllNode
	| ConvertKitV1SequenceGetSubscriptionsNode
	| ConvertKitV1TagCreateNode
	| ConvertKitV1TagGetAllNode
	| ConvertKitV1TagSubscriberAddNode
	| ConvertKitV1TagSubscriberGetAllNode
	| ConvertKitV1TagSubscriberDeleteNode
	;