/**
 * Trello Trigger Node - Version 1
 * Starts the workflow when Trello events occur
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface TrelloTriggerV1Params {
/**
 * ID of the model of which to subscribe to events
 */
		id: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface TrelloTriggerV1Credentials {
	trelloApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type TrelloTriggerV1Node = {
	type: 'n8n-nodes-base.trelloTrigger';
	version: 1;
	config: NodeConfig<TrelloTriggerV1Params>;
	credentials?: TrelloTriggerV1Credentials;
	isTrigger: true;
};