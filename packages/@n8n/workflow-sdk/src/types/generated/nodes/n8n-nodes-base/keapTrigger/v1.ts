/**
 * Keap Trigger Node - Version 1
 * Starts the workflow when Infusionsoft events occur
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface KeapTriggerV1Config {
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 */
		eventId: string | Expression<string>;
/**
 * Whether to return the data exactly in the way it got received from the API
 * @default false
 */
		rawData?: boolean | Expression<boolean>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface KeapTriggerV1Credentials {
	keapOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface KeapTriggerV1NodeBase {
	type: 'n8n-nodes-base.keapTrigger';
	version: 1;
	credentials?: KeapTriggerV1Credentials;
	isTrigger: true;
}

export type KeapTriggerV1Node = KeapTriggerV1NodeBase & {
	config: NodeConfig<KeapTriggerV1Config>;
};

export type KeapTriggerV1Node = KeapTriggerV1Node;