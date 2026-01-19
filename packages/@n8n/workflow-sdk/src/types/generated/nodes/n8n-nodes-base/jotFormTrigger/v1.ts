/**
 * Jotform Trigger Node - Version 1
 * Handle Jotform events via webhooks
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface JotFormTriggerV1Config {
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 */
		form: string | Expression<string>;
/**
 * By default does the webhook-data use internal keys instead of the names. If this option gets activated, it will resolve the keys automatically to the actual names.
 * @default true
 */
		resolveData?: boolean | Expression<boolean>;
/**
 * Whether to return only the answers of the form and not any of the other data
 * @default true
 */
		onlyAnswers?: boolean | Expression<boolean>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface JotFormTriggerV1Credentials {
	jotFormApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface JotFormTriggerV1NodeBase {
	type: 'n8n-nodes-base.jotFormTrigger';
	version: 1;
	credentials?: JotFormTriggerV1Credentials;
	isTrigger: true;
}

export type JotFormTriggerV1Node = JotFormTriggerV1NodeBase & {
	config: NodeConfig<JotFormTriggerV1Config>;
};

export type JotFormTriggerV1Node = JotFormTriggerV1Node;