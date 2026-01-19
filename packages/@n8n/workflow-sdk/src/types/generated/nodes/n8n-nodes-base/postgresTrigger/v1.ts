/**
 * Postgres Trigger Node - Version 1
 * Listens to Postgres messages
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

export interface PostgresTriggerV1Params {
	triggerMode?: 'createTrigger' | 'listenTrigger' | Expression<string>;
	schema: ResourceLocatorValue;
	tableName: ResourceLocatorValue;
/**
 * Name of the channel to listen to
 * @displayOptions.show { triggerMode: ["listenTrigger"] }
 */
		channelName: string | Expression<string>;
	firesOn?: 'INSERT' | 'UPDATE' | 'DELETE' | Expression<string>;
	additionalFields?: Record<string, unknown>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface PostgresTriggerV1Credentials {
	postgres: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface PostgresTriggerV1NodeBase {
	type: 'n8n-nodes-base.postgresTrigger';
	version: 1;
	credentials?: PostgresTriggerV1Credentials;
	isTrigger: true;
}

export type PostgresTriggerV1ParamsNode = PostgresTriggerV1NodeBase & {
	config: NodeConfig<PostgresTriggerV1Params>;
};

export type PostgresTriggerV1Node = PostgresTriggerV1ParamsNode;