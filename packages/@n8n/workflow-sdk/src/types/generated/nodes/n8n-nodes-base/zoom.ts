/**
 * Zoom Node Types
 *
 * Consume Zoom API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/zoom/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a meeting */
export type ZoomV1MeetingCreateConfig = {
	resource: 'meeting';
	operation: 'create';
	/**
	 * Topic of the meeting
	 * @displayOptions.show { operation: ["create"], resource: ["meeting"] }
	 */
	topic?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a meeting */
export type ZoomV1MeetingDeleteConfig = {
	resource: 'meeting';
	operation: 'delete';
	/**
	 * Meeting ID
	 * @displayOptions.show { operation: ["delete"], resource: ["meeting"] }
	 */
	meetingId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Retrieve a meeting */
export type ZoomV1MeetingGetConfig = {
	resource: 'meeting';
	operation: 'get';
	/**
	 * Meeting ID
	 * @displayOptions.show { operation: ["get"], resource: ["meeting"] }
	 */
	meetingId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Retrieve many meetings */
export type ZoomV1MeetingGetAllConfig = {
	resource: 'meeting';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { operation: ["getAll"], resource: ["meeting"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { operation: ["getAll"], resource: ["meeting"], returnAll: [false] }
	 * @default 30
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update a meeting */
export type ZoomV1MeetingUpdateConfig = {
	resource: 'meeting';
	operation: 'update';
	/**
	 * Meeting ID
	 * @displayOptions.show { operation: ["update"], resource: ["meeting"] }
	 */
	meetingId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type ZoomV1Params =
	| ZoomV1MeetingCreateConfig
	| ZoomV1MeetingDeleteConfig
	| ZoomV1MeetingGetConfig
	| ZoomV1MeetingGetAllConfig
	| ZoomV1MeetingUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface ZoomV1Credentials {
	zoomApi: CredentialReference;
	zoomOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type ZoomV1Node = {
	type: 'n8n-nodes-base.zoom';
	version: 1;
	config: NodeConfig<ZoomV1Params>;
	credentials?: ZoomV1Credentials;
};

export type ZoomNode = ZoomV1Node;
