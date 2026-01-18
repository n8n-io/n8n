/**
 * Wufoo Trigger Node Types
 *
 * Handle Wufoo events via webhooks
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/wufootrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface WufooTriggerV1Params {
	/**
	 * The form upon which will trigger this node when a new entry is made. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	form: string | Expression<string>;
	/**
	 * Whether to return only the answers of the form and not any of the other data
	 * @default true
	 */
	onlyAnswers?: boolean | Expression<boolean>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface WufooTriggerV1Credentials {
	wufooApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type WufooTriggerV1Node = {
	type: 'n8n-nodes-base.wufooTrigger';
	version: 1;
	config: NodeConfig<WufooTriggerV1Params>;
	credentials?: WufooTriggerV1Credentials;
	isTrigger: true;
};

export type WufooTriggerNode = WufooTriggerV1Node;
