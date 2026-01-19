/**
 * Strava Trigger Node - Version 1
 * Starts the workflow when Strava events occur
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface StravaTriggerV1Config {
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

interface StravaTriggerV1NodeBase {
	type: 'n8n-nodes-base.stravaTrigger';
	version: 1;
	credentials?: StravaTriggerV1Credentials;
	isTrigger: true;
}

export type StravaTriggerV1Node = StravaTriggerV1NodeBase & {
	config: NodeConfig<StravaTriggerV1Config>;
};

export type StravaTriggerV1Node = StravaTriggerV1Node;