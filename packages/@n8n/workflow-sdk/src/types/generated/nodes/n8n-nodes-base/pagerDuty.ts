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
	 * @displayOptions.show { resource: ["incident"], operation: ["create"] }
	 */
	title: string | Expression<string>;
	/**
	 * The incident will be created on this service. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["incident"], operation: ["create"] }
	 */
	serviceId: string | Expression<string>;
	/**
	 * The email address of a valid user associated with the account making the request
	 * @displayOptions.show { resource: ["incident"], operation: ["create"] }
	 */
	email: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	conferenceBridgeUi?: {
		conferenceBridgeValues?: {
			/** Phone numbers should be formatted like +1 415-555-1212,,,,1234#, where a comma (,) represents a one-second wait and pound (#) completes access code input
			 */
			conferenceNumber?: string | Expression<string>;
			/** An URL for the conference bridge. This could be a link to a web conference or Slack channel.
			 */
			conferenceUrl?: string | Expression<string>;
		};
	};
};

/** Get an incident */
export type PagerDutyV1IncidentGetConfig = {
	resource: 'incident';
	operation: 'get';
	/**
	 * Unique identifier for the incident
	 * @displayOptions.show { resource: ["incident"], operation: ["get"] }
	 */
	incidentId: string | Expression<string>;
};

/** Get many incidents */
export type PagerDutyV1IncidentGetAllConfig = {
	resource: 'incident';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { operation: ["getAll"], resource: ["incident"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { operation: ["getAll"], resource: ["incident"], returnAll: [false] }
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
	 * @displayOptions.show { resource: ["incident"], operation: ["update"] }
	 */
	incidentId: string | Expression<string>;
	/**
	 * The email address of a valid user associated with the account making the request
	 * @displayOptions.show { resource: ["incident"], operation: ["update"] }
	 */
	email: string | Expression<string>;
	updateFields?: Record<string, unknown>;
	conferenceBridgeUi?: {
		conferenceBridgeValues?: {
			/** Phone numbers should be formatted like +1 415-555-1212,,,,1234#, where a comma (,) represents a one-second wait and pound (#) completes access code input
			 */
			conferenceNumber?: string | Expression<string>;
			/** An URL for the conference bridge. This could be a link to a web conference or Slack channel.
			 */
			conferenceUrl?: string | Expression<string>;
		};
	};
};

/** Create an incident */
export type PagerDutyV1IncidentNoteCreateConfig = {
	resource: 'incidentNote';
	operation: 'create';
	/**
	 * Unique identifier for the incident
	 * @displayOptions.show { resource: ["incidentNote"], operation: ["create"] }
	 */
	incidentId: string | Expression<string>;
	/**
	 * The note content
	 * @displayOptions.show { resource: ["incidentNote"], operation: ["create"] }
	 */
	content: string | Expression<string>;
	/**
	 * The email address of a valid user associated with the account making the request
	 * @displayOptions.show { resource: ["incidentNote"], operation: ["create"] }
	 */
	email: string | Expression<string>;
};

/** Get many incidents */
export type PagerDutyV1IncidentNoteGetAllConfig = {
	resource: 'incidentNote';
	operation: 'getAll';
	/**
	 * Unique identifier for the incident
	 * @displayOptions.show { resource: ["incidentNote"], operation: ["getAll"] }
	 */
	incidentId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { operation: ["getAll"], resource: ["incidentNote"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { operation: ["getAll"], resource: ["incidentNote"], returnAll: [false] }
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
	 * @displayOptions.show { resource: ["logEntry"], operation: ["get"] }
	 */
	logEntryId: string | Expression<string>;
};

/** Get many incidents */
export type PagerDutyV1LogEntryGetAllConfig = {
	resource: 'logEntry';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { operation: ["getAll"], resource: ["logEntry"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { operation: ["getAll"], resource: ["logEntry"], returnAll: [false] }
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
	 * @displayOptions.show { resource: ["user"], operation: ["get"] }
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
