/**
 * Demio Node - Version 1
 * Consume the Demio API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get an event */
export type DemioV1EventGetConfig = {
	resource: 'event';
	operation: 'get';
	eventId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get many events */
export type DemioV1EventGetAllConfig = {
	resource: 'event';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["event"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["event"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Register someone to an event */
export type DemioV1EventRegisterConfig = {
	resource: 'event';
	operation: 'register';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["event"], operation: ["register"] }
 */
		eventId?: string | Expression<string>;
/**
 * The registrant's first name
 * @displayOptions.show { resource: ["event"], operation: ["register"] }
 */
		firstName: string | Expression<string>;
/**
 * The registrant's email address
 * @displayOptions.show { resource: ["event"], operation: ["register"] }
 */
		email: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get an event */
export type DemioV1ReportGetConfig = {
	resource: 'report';
	operation: 'get';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["report"], operation: ["get"] }
 */
		eventId?: string | Expression<string>;
/**
 * ID of the session. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["report"], operation: ["get"] }
 */
		dateId: string | Expression<string>;
	filters?: Record<string, unknown>;
};

export type DemioV1Params =
	| DemioV1EventGetConfig
	| DemioV1EventGetAllConfig
	| DemioV1EventRegisterConfig
	| DemioV1ReportGetConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface DemioV1Credentials {
	demioApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type DemioV1Node = {
	type: 'n8n-nodes-base.demio';
	version: 1;
	config: NodeConfig<DemioV1Params>;
	credentials?: DemioV1Credentials;
};