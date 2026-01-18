/**
 * Beeminder Node Types
 *
 * Consume Beeminder API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/beeminder/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a charge */
export type BeeminderV1ChargeCreateConfig = {
	resource: 'charge';
	operation: 'create';
	/**
	 * Charge amount in USD
	 * @displayOptions.show { resource: ["charge"], operation: ["create"] }
	 * @default 0
	 */
	amount: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Create a charge */
export type BeeminderV1DatapointCreateConfig = {
	resource: 'datapoint';
	operation: 'create';
	/**
	 * The name of the goal. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["datapoint"] }
	 */
	goalName: string | Expression<string>;
	/**
	 * Datapoint value to send
	 * @displayOptions.show { resource: ["datapoint"], operation: ["create"] }
	 * @default 1
	 */
	value: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Create multiple datapoints at once */
export type BeeminderV1DatapointCreateAllConfig = {
	resource: 'datapoint';
	operation: 'createAll';
	/**
	 * The name of the goal. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["datapoint"] }
	 */
	goalName: string | Expression<string>;
	/**
	 * Array of datapoint objects to create. Each object should contain value and optionally timestamp, comment, etc.
	 * @displayOptions.show { resource: ["datapoint"], operation: ["createAll"] }
	 * @default []
	 */
	datapoints: IDataObject | string | Expression<string>;
};

/** Delete a datapoint */
export type BeeminderV1DatapointDeleteConfig = {
	resource: 'datapoint';
	operation: 'delete';
	/**
	 * The name of the goal. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["datapoint"] }
	 */
	goalName: string | Expression<string>;
	datapointId: string | Expression<string>;
};

/** Get a single datapoint */
export type BeeminderV1DatapointGetConfig = {
	resource: 'datapoint';
	operation: 'get';
	/**
	 * The name of the goal. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["datapoint"] }
	 */
	goalName: string | Expression<string>;
	datapointId: string | Expression<string>;
};

/** Get many datapoints for a goal */
export type BeeminderV1DatapointGetAllConfig = {
	resource: 'datapoint';
	operation: 'getAll';
	/**
	 * The name of the goal. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["datapoint"] }
	 */
	goalName: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { operation: ["getAll"], resource: ["datapoint"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { operation: ["getAll"], resource: ["datapoint"], returnAll: [false] }
	 * @default 30
	 */
	limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update a datapoint */
export type BeeminderV1DatapointUpdateConfig = {
	resource: 'datapoint';
	operation: 'update';
	/**
	 * The name of the goal. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["datapoint"] }
	 */
	goalName: string | Expression<string>;
	datapointId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a charge */
export type BeeminderV1GoalCreateConfig = {
	resource: 'goal';
	operation: 'create';
	/**
	 * Unique identifier for the goal
	 * @displayOptions.show { resource: ["goal"], operation: ["create"] }
	 */
	slug: string | Expression<string>;
	/**
	 * Human-readable title for the goal
	 * @displayOptions.show { resource: ["goal"], operation: ["create"] }
	 */
	title: string | Expression<string>;
	/**
	 * Type of goal. &lt;a href="https://api.beeminder.com/#attributes-2"&gt;More info here.&lt;/a&gt;.
	 * @displayOptions.show { resource: ["goal"], operation: ["create"] }
	 * @default hustler
	 */
	goal_type:
		| 'hustler'
		| 'biker'
		| 'fatloser'
		| 'gainer'
		| 'inboxer'
		| 'drinker'
		| 'custom'
		| Expression<string>;
	/**
	 * Units for the goal (e.g., "hours", "pages", "pounds")
	 * @displayOptions.show { resource: ["goal"], operation: ["create"] }
	 */
	gunits: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get a single datapoint */
export type BeeminderV1GoalGetConfig = {
	resource: 'goal';
	operation: 'get';
	/**
	 * The name of the goal. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["goal"], operation: ["get", "update", "refresh", "shortCircuit", "stepDown", "cancelStepDown"] }
	 */
	goalName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get many datapoints for a goal */
export type BeeminderV1GoalGetAllConfig = {
	resource: 'goal';
	operation: 'getAll';
	additionalFields?: Record<string, unknown>;
};

/** Get archived goals */
export type BeeminderV1GoalGetArchivedConfig = {
	resource: 'goal';
	operation: 'getArchived';
	additionalFields?: Record<string, unknown>;
};

/** Update a datapoint */
export type BeeminderV1GoalUpdateConfig = {
	resource: 'goal';
	operation: 'update';
	/**
	 * The name of the goal. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["goal"], operation: ["get", "update", "refresh", "shortCircuit", "stepDown", "cancelStepDown"] }
	 */
	goalName: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Refresh goal data */
export type BeeminderV1GoalRefreshConfig = {
	resource: 'goal';
	operation: 'refresh';
	/**
	 * The name of the goal. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["goal"], operation: ["get", "update", "refresh", "shortCircuit", "stepDown", "cancelStepDown"] }
	 */
	goalName: string | Expression<string>;
};

/** Short circuit pledge */
export type BeeminderV1GoalShortCircuitConfig = {
	resource: 'goal';
	operation: 'shortCircuit';
	/**
	 * The name of the goal. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["goal"], operation: ["get", "update", "refresh", "shortCircuit", "stepDown", "cancelStepDown"] }
	 */
	goalName: string | Expression<string>;
};

/** Step down pledge */
export type BeeminderV1GoalStepDownConfig = {
	resource: 'goal';
	operation: 'stepDown';
	/**
	 * The name of the goal. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["goal"], operation: ["get", "update", "refresh", "shortCircuit", "stepDown", "cancelStepDown"] }
	 */
	goalName: string | Expression<string>;
};

export type BeeminderV1GoalCancelStepDownConfig = {
	resource: 'goal';
	operation: 'cancelStepDown';
	/**
	 * The name of the goal. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["goal"], operation: ["get", "update", "refresh", "shortCircuit", "stepDown", "cancelStepDown"] }
	 */
	goalName: string | Expression<string>;
};

/** Derail a goal and charge the pledge amount */
export type BeeminderV1GoalUncleConfig = {
	resource: 'goal';
	operation: 'uncle';
	/**
	 * The name of the goal to derail. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["goal"], operation: ["uncle"] }
	 */
	goalName: string | Expression<string>;
};

/** Get a single datapoint */
export type BeeminderV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
	additionalFields?: Record<string, unknown>;
};

export type BeeminderV1Params =
	| BeeminderV1ChargeCreateConfig
	| BeeminderV1DatapointCreateConfig
	| BeeminderV1DatapointCreateAllConfig
	| BeeminderV1DatapointDeleteConfig
	| BeeminderV1DatapointGetConfig
	| BeeminderV1DatapointGetAllConfig
	| BeeminderV1DatapointUpdateConfig
	| BeeminderV1GoalCreateConfig
	| BeeminderV1GoalGetConfig
	| BeeminderV1GoalGetAllConfig
	| BeeminderV1GoalGetArchivedConfig
	| BeeminderV1GoalUpdateConfig
	| BeeminderV1GoalRefreshConfig
	| BeeminderV1GoalShortCircuitConfig
	| BeeminderV1GoalStepDownConfig
	| BeeminderV1GoalCancelStepDownConfig
	| BeeminderV1GoalUncleConfig
	| BeeminderV1UserGetConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface BeeminderV1Credentials {
	beeminderApi: CredentialReference;
	beeminderOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type BeeminderV1Node = {
	type: 'n8n-nodes-base.beeminder';
	version: 1;
	config: NodeConfig<BeeminderV1Params>;
	credentials?: BeeminderV1Credentials;
};

export type BeeminderNode = BeeminderV1Node;
