/**
 * Brevo Trigger Node - Version 1
 * Starts the workflow when Brevo events occur
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface SendInBlueTriggerV1Params {
	type: 'inbound' | 'marketing' | 'transactional' | Expression<string>;
	events: Array<'blocked' | 'click' | 'deferred' | 'delivered' | 'hardBounce' | 'invalid' | 'spam' | 'opened' | 'request' | 'softBounce' | 'uniqueOpened' | 'unsubscribed'>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface SendInBlueTriggerV1Credentials {
	sendInBlueApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface SendInBlueTriggerV1NodeBase {
	type: 'n8n-nodes-base.sendInBlueTrigger';
	version: 1;
	credentials?: SendInBlueTriggerV1Credentials;
	isTrigger: true;
}

export type SendInBlueTriggerV1ParamsNode = SendInBlueTriggerV1NodeBase & {
	config: NodeConfig<SendInBlueTriggerV1Params>;
};

export type SendInBlueTriggerV1Node = SendInBlueTriggerV1ParamsNode;