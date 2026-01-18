/**
 * Postgres Trigger Node Types
 *
 * Listens to Postgres messages
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/postgrestrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

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
// Node Type
// ===========================================================================

export type PostgresTriggerNode = {
	type: 'n8n-nodes-base.postgresTrigger';
	version: 1;
	config: NodeConfig<PostgresTriggerV1Params>;
	credentials?: PostgresTriggerV1Credentials;
	isTrigger: true;
};
