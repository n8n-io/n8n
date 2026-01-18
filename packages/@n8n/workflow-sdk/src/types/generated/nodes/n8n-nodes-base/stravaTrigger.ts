/**
 * Strava Trigger Node Types
 *
 * Starts the workflow when Strava events occur
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/stravatrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface StravaTriggerV1Params {
	object?: '*' | 'activity' | 'athlete' | Expression<string>;
	event?: '*' | 'create' | 'delete' | 'update' | Expression<string>;
	/**
	 * By default the webhook-data only contain the Object ID. If this option gets activated, it will resolve the data automatically.
	 * @default true
	 */
	resolveData?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface StravaTriggerV1Credentials {
	stravaOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type StravaTriggerV1Node = {
	type: 'n8n-nodes-base.stravaTrigger';
	version: 1;
	config: NodeConfig<StravaTriggerV1Params>;
	credentials?: StravaTriggerV1Credentials;
	isTrigger: true;
};

export type StravaTriggerNode = StravaTriggerV1Node;
