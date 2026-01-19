/**
 * Autopilot Trigger Node - Version 1
 * Handle Autopilot events via webhooks
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface AutopilotTriggerV1Config {
	event: 'contactAdded' | 'contactAddedToList' | 'contactEnteredSegment' | 'contactLeftSegment' | 'contactRemovedFromList' | 'contactUnsubscribed' | 'contactUpdated' | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface AutopilotTriggerV1Credentials {
	autopilotApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface AutopilotTriggerV1NodeBase {
	type: 'n8n-nodes-base.autopilotTrigger';
	version: 1;
	credentials?: AutopilotTriggerV1Credentials;
	isTrigger: true;
}

export type AutopilotTriggerV1Node = AutopilotTriggerV1NodeBase & {
	config: NodeConfig<AutopilotTriggerV1Config>;
};

export type AutopilotTriggerV1Node = AutopilotTriggerV1Node;