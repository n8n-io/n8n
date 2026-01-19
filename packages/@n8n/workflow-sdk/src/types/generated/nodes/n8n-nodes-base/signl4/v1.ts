/**
 * SIGNL4 Node - Version 1
 * Consume SIGNL4 API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Send an alert */
export type Signl4V1AlertSendConfig = {
	resource: 'alert';
	operation: 'send';
/**
 * A more detailed description for the alert
 * @displayOptions.show { operation: ["send"], resource: ["alert"] }
 */
		message?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Resolve an alert */
export type Signl4V1AlertResolveConfig = {
	resource: 'alert';
	operation: 'resolve';
/**
 * If the event originates from a record in a 3rd party system, use this parameter to pass the unique ID of that record. That ID will be communicated in outbound webhook notifications from SIGNL4, which is great for correlation/synchronization of that record with the alert. If you resolve / close an alert you must use the same External ID as in the original alert.
 * @displayOptions.show { operation: ["resolve"], resource: ["alert"] }
 */
		externalId?: string | Expression<string>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface Signl4V1Credentials {
	signl4Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface Signl4V1NodeBase {
	type: 'n8n-nodes-base.signl4';
	version: 1;
	credentials?: Signl4V1Credentials;
}

export type Signl4V1AlertSendNode = Signl4V1NodeBase & {
	config: NodeConfig<Signl4V1AlertSendConfig>;
};

export type Signl4V1AlertResolveNode = Signl4V1NodeBase & {
	config: NodeConfig<Signl4V1AlertResolveConfig>;
};

export type Signl4V1Node =
	| Signl4V1AlertSendNode
	| Signl4V1AlertResolveNode
	;