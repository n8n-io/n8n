/**
 * PagerDuty Node Types
 *
 * Consume PagerDuty API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/pagerduty/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create an incident */
export type PagerDutyV1IncidentCreateConfig = {
	resource: 'incident';
	operation: 'create';
	/**
	 * A succinct description of the nature, symptoms, cause, or effect of the incident
	 */
	title: string | Expression<string>;
	/**
	 * The incident will be created on this service. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	serviceId: string | Expression<string>;
	/**
	 * The email address of a valid user associated with the account making the request
	 */
	email: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	conferenceBridgeUi?: Record<string, unknown>;
};

/** Get an incident */
export type PagerDutyV1IncidentGetConfig = {
	resource: 'incident';
	operation: 'get';
	/**
	 * Unique identifier for the incident
	 */
	incidentId: string | Expression<string>;
};

/** Get many incidents */
export type PagerDutyV1IncidentGetAllConfig = {
	resource: 'incident';
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
	options?: Record<string, unknown>;
};

/** Update an incident */
export type PagerDutyV1IncidentUpdateConfig = {
	resource: 'incident';
	operation: 'update';
	/**
	 * Unique identifier for the incident
	 */
	incidentId: string | Expression<string>;
	/**
	 * The email address of a valid user associated with the account making the request
	 */
	email: string | Expression<string>;
	updateFields?: Record<string, unknown>;
	conferenceBridgeUi?: Record<string, unknown>;
};

/** Create an incident */
export type PagerDutyV1IncidentNoteCreateConfig = {
	resource: 'incidentNote';
	operation: 'create';
	/**
	 * Unique identifier for the incident
	 */
	incidentId: string | Expression<string>;
	/**
	 * The note content
	 */
	content: string | Expression<string>;
	/**
	 * The email address of a valid user associated with the account making the request
	 */
	email: string | Expression<string>;
};

/** Get many incidents */
export type PagerDutyV1IncidentNoteGetAllConfig = {
	resource: 'incidentNote';
	operation: 'getAll';
	/**
	 * Unique identifier for the incident
	 */
	incidentId: string | Expression<string>;
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

/** Get an incident */
export type PagerDutyV1LogEntryGetConfig = {
	resource: 'logEntry';
	operation: 'get';
	/**
	 * Unique identifier for the log entry
	 */
	logEntryId: string | Expression<string>;
};

/** Get many incidents */
export type PagerDutyV1LogEntryGetAllConfig = {
	resource: 'logEntry';
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
	options?: Record<string, unknown>;
};

/** Get an incident */
export type PagerDutyV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
	/**
	 * Unique identifier for the user
	 */
	userId: string | Expression<string>;
};

export type PagerDutyV1Params =
	| PagerDutyV1IncidentCreateConfig
	| PagerDutyV1IncidentGetConfig
	| PagerDutyV1IncidentGetAllConfig
	| PagerDutyV1IncidentUpdateConfig
	| PagerDutyV1IncidentNoteCreateConfig
	| PagerDutyV1IncidentNoteGetAllConfig
	| PagerDutyV1LogEntryGetConfig
	| PagerDutyV1LogEntryGetAllConfig
	| PagerDutyV1UserGetConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface PagerDutyV1Credentials {
	pagerDutyApi: CredentialReference;
	pagerDutyOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type PagerDutyV1Node = {
	type: 'n8n-nodes-base.pagerDuty';
	version: 1;
	config: NodeConfig<PagerDutyV1Params>;
	credentials?: PagerDutyV1Credentials;
};

export type PagerDutyNode = PagerDutyV1Node;
