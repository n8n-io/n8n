/**
 * Pushcut Trigger Node - Version 1
 * Starts the workflow when Pushcut events occur
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface PushcutTriggerV1Params {
/**
 * Choose any name you would like. It will show up as a server action in the app.
 */
		actionName?: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface PushcutTriggerV1Credentials {
	pushcutApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface PushcutTriggerV1NodeBase {
	type: 'n8n-nodes-base.pushcutTrigger';
	version: 1;
	credentials?: PushcutTriggerV1Credentials;
	isTrigger: true;
}

export type PushcutTriggerV1ParamsNode = PushcutTriggerV1NodeBase & {
	config: NodeConfig<PushcutTriggerV1Params>;
};

export type PushcutTriggerV1Node = PushcutTriggerV1ParamsNode;