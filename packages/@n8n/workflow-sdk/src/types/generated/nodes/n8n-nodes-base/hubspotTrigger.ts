/**
 * HubSpot Trigger Node Types
 *
 * Starts the workflow when HubSpot events occur
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/hubspottrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface HubspotTriggerV1Params {
	eventsUi?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface HubspotTriggerV1Credentials {
	hubspotDeveloperApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type HubspotTriggerNode = {
	type: 'n8n-nodes-base.hubspotTrigger';
	version: 1;
	config: NodeConfig<HubspotTriggerV1Params>;
	credentials?: HubspotTriggerV1Credentials;
	isTrigger: true;
};
