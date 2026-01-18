/**
 * Autopilot Trigger Node - Version 1
 * Handle Autopilot events via webhooks
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface AutopilotTriggerV1Params {
	event: 'contactAdded' | 'contactAddedToList' | 'contactEnteredSegment' | 'contactLeftSegment' | 'contactRemovedFromList' | 'contactUnsubscribed' | 'contactUpdated' | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface AutopilotTriggerV1Credentials {
	autopilotApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type AutopilotTriggerV1Node = {
	type: 'n8n-nodes-base.autopilotTrigger';
	version: 1;
	config: NodeConfig<AutopilotTriggerV1Params>;
	credentials?: AutopilotTriggerV1Credentials;
	isTrigger: true;
};