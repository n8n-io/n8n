/**
 * Webex by Cisco Trigger Node - Version 1
 * Starts the workflow when Cisco Webex events occur.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface CiscoWebexTriggerV1Config {
	resource: 'all' | 'attachmentAction' | 'meeting' | 'membership' | 'message' | 'recording' | 'room' | Expression<string>;
	event: 'created' | 'deleted' | 'updated' | 'all' | Expression<string>;
/**
 * By default the response only contain a reference to the data the user inputed. If this option gets activated, it will resolve the data automatically.
 * @displayOptions.show { resource: ["attachmentAction"] }
 * @default true
 */
		resolveData?: boolean | Expression<boolean>;
	filters?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface CiscoWebexTriggerV1Credentials {
	ciscoWebexOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface CiscoWebexTriggerV1NodeBase {
	type: 'n8n-nodes-base.ciscoWebexTrigger';
	version: 1;
	credentials?: CiscoWebexTriggerV1Credentials;
	isTrigger: true;
}

export type CiscoWebexTriggerV1Node = CiscoWebexTriggerV1NodeBase & {
	config: NodeConfig<CiscoWebexTriggerV1Config>;
};

export type CiscoWebexTriggerV1Node = CiscoWebexTriggerV1Node;