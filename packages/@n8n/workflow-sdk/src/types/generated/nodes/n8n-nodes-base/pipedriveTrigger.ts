/**
 * Pipedrive Trigger Node Types
 *
 * Starts the workflow when Pipedrive events occur
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/pipedrivetrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

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
	entity?:
		| 'activity'
		| 'activityType'
		| '*'
		| 'deal'
		| 'note'
		| 'organization'
		| 'person'
		| 'pipeline'
		| 'product'
		| 'stage'
		| 'user'
		| Expression<string>;
	/**
	 * Type of object to receive notifications about
	 * @default *
	 */
	object?:
		| 'activity'
		| 'activityType'
		| '*'
		| 'deal'
		| 'note'
		| 'organization'
		| 'person'
		| 'pipeline'
		| 'product'
		| 'stage'
		| 'user'
		| Expression<string>;
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
// Node Type
// ===========================================================================

export type PipedriveTriggerNode = {
	type: 'n8n-nodes-base.pipedriveTrigger';
	version: 1 | 1.1;
	config: NodeConfig<PipedriveTriggerV11Params>;
	credentials?: PipedriveTriggerV11Credentials;
	isTrigger: true;
};
