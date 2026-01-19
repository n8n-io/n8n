/**
 * Pipedrive Trigger Node - Version 1.1
 * Starts the workflow when Pipedrive events occur
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface PipedriveTriggerV11Params {
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

export interface PipedriveTriggerV11Credentials {
	pipedriveApi: CredentialReference;
	pipedriveOAuth2Api: CredentialReference;
	httpBasicAuth: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface PipedriveTriggerV11NodeBase {
	type: 'n8n-nodes-base.pipedriveTrigger';
	version: 1.1;
	credentials?: PipedriveTriggerV11Credentials;
	isTrigger: true;
}

export type PipedriveTriggerV11ParamsNode = PipedriveTriggerV11NodeBase & {
	config: NodeConfig<PipedriveTriggerV11Params>;
};

export type PipedriveTriggerV11Node = PipedriveTriggerV11ParamsNode;