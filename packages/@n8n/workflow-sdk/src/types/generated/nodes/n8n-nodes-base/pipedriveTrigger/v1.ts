/**
 * Pipedrive Trigger Node - Version 1
 * Starts the workflow when Pipedrive events occur
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface PipedriveTriggerV1Config {
	authentication?: 'apiToken' | 'oAuth2' | Expression<string>;
/**
 * If authentication should be activated for the webhook (makes it more secure)
 * @default none
 */
		incomingAuthentication?: 'basicAuth' | 'none' | Expression<string>;
/**
 * Type of action to receive notifications about
 * @default *
 */
		action?: 'added' | '*' | 'deleted' | 'merged' | 'updated' | Expression<string>;
/**
 * Type of object to receive notifications about
 * @default *
 */
		entity?: 'activity' | 'activityType' | '*' | 'deal' | 'note' | 'organization' | 'person' | 'pipeline' | 'product' | 'stage' | 'user' | Expression<string>;
/**
 * Type of object to receive notifications about
 * @default *
 */
		object?: 'activity' | 'activityType' | '*' | 'deal' | 'note' | 'organization' | 'person' | 'pipeline' | 'product' | 'stage' | 'user' | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface PipedriveTriggerV1Credentials {
	pipedriveApi: CredentialReference;
	pipedriveOAuth2Api: CredentialReference;
	httpBasicAuth: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface PipedriveTriggerV1NodeBase {
	type: 'n8n-nodes-base.pipedriveTrigger';
	version: 1;
	credentials?: PipedriveTriggerV1Credentials;
	isTrigger: true;
}

export type PipedriveTriggerV1Node = PipedriveTriggerV1NodeBase & {
	config: NodeConfig<PipedriveTriggerV1Config>;
};

export type PipedriveTriggerV1Node = PipedriveTriggerV1Node;