/**
 * Emelia Trigger Node - Version 1
 * Handle Emelia campaign activity events via webhooks
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface EmeliaTriggerV1Config {
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 */
		campaignId: string | Expression<string>;
	events: Array<'bounced' | 'opened' | 'replied' | 'sent' | 'clicked' | 'unsubscribed'>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface EmeliaTriggerV1Credentials {
	emeliaApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface EmeliaTriggerV1NodeBase {
	type: 'n8n-nodes-base.emeliaTrigger';
	version: 1;
	credentials?: EmeliaTriggerV1Credentials;
	isTrigger: true;
}

export type EmeliaTriggerV1Node = EmeliaTriggerV1NodeBase & {
	config: NodeConfig<EmeliaTriggerV1Config>;
};

export type EmeliaTriggerV1Node = EmeliaTriggerV1Node;