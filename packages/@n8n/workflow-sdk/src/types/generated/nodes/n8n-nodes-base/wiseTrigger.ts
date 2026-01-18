/**
 * Wise Trigger Node Types
 *
 * Handle Wise events via webhooks
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/wisetrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface WiseTriggerV1Params {
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	profileId: string | Expression<string>;
	event:
		| 'balanceCredit'
		| 'balanceUpdate'
		| 'transferActiveCases'
		| 'tranferStateChange'
		| Expression<string>;
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

export type WiseTriggerV1Node = {
	type: 'n8n-nodes-base.wiseTrigger';
	version: 1;
	config: NodeConfig<WiseTriggerV1Params>;
	credentials?: WiseTriggerV1Credentials;
	isTrigger: true;
};

export type WiseTriggerNode = WiseTriggerV1Node;
