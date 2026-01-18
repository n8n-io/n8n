/**
 * Emelia Trigger Node - Version 1
 * Handle Emelia campaign activity events via webhooks
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface EmeliaTriggerV1Params {
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
// Node Type
// ===========================================================================

export type EmeliaTriggerV1Node = {
	type: 'n8n-nodes-base.emeliaTrigger';
	version: 1;
	config: NodeConfig<EmeliaTriggerV1Params>;
	credentials?: EmeliaTriggerV1Credentials;
	isTrigger: true;
};