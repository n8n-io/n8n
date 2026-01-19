/**
 * Trello Trigger Node - Version 1
 * Starts the workflow when Trello events occur
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
// Node Types
// ===========================================================================

interface TrelloTriggerV1NodeBase {
	type: 'n8n-nodes-base.trelloTrigger';
	version: 1;
	credentials?: TrelloTriggerV1Credentials;
	isTrigger: true;
}

export type TrelloTriggerV1ParamsNode = TrelloTriggerV1NodeBase & {
	config: NodeConfig<TrelloTriggerV1Params>;
};

export type TrelloTriggerV1Node = TrelloTriggerV1ParamsNode;