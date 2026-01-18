/**
 * Brevo Trigger Node Types
 *
 * Starts the workflow when Brevo events occur
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/sendinbluetrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface SendInBlueTriggerV1Params {
	type: 'inbound' | 'marketing' | 'transactional' | Expression<string>;
	events: Array<
		| 'blocked'
		| 'click'
		| 'deferred'
		| 'delivered'
		| 'hardBounce'
		| 'invalid'
		| 'spam'
		| 'opened'
		| 'request'
		| 'softBounce'
		| 'uniqueOpened'
		| 'unsubscribed'
	>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface SendInBlueTriggerV1Credentials {
	sendInBlueApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type SendInBlueTriggerNode = {
	type: 'n8n-nodes-base.sendInBlueTrigger';
	version: 1;
	config: NodeConfig<SendInBlueTriggerV1Params>;
	credentials?: SendInBlueTriggerV1Credentials;
	isTrigger: true;
};
