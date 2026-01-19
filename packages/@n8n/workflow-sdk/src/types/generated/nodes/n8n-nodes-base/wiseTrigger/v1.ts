/**
 * Wise Trigger Node - Version 1
 * Handle Wise events via webhooks
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface WiseTriggerV1Config {
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 */
		profileId: string | Expression<string>;
	event: 'balanceCredit' | 'balanceUpdate' | 'transferActiveCases' | 'tranferStateChange' | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface WiseTriggerV1Credentials {
	wiseApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface WiseTriggerV1NodeBase {
	type: 'n8n-nodes-base.wiseTrigger';
	version: 1;
	credentials?: WiseTriggerV1Credentials;
	isTrigger: true;
}

export type WiseTriggerV1Node = WiseTriggerV1NodeBase & {
	config: NodeConfig<WiseTriggerV1Config>;
};

export type WiseTriggerV1Node = WiseTriggerV1Node;