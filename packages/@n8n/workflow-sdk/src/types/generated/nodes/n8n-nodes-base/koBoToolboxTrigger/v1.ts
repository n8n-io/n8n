/**
 * KoBoToolbox Trigger Node - Version 1
 * Process KoBoToolbox submissions
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface KoBoToolboxTriggerV1Params {
/**
 * Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 */
		formId: string | Expression<string>;
	triggerOn: 'formSubmission' | Expression<string>;
	formatOptions?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface KoBoToolboxTriggerV1Credentials {
	koBoToolboxApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface KoBoToolboxTriggerV1NodeBase {
	type: 'n8n-nodes-base.koBoToolboxTrigger';
	version: 1;
	credentials?: KoBoToolboxTriggerV1Credentials;
	isTrigger: true;
}

export type KoBoToolboxTriggerV1ParamsNode = KoBoToolboxTriggerV1NodeBase & {
	config: NodeConfig<KoBoToolboxTriggerV1Params>;
};

export type KoBoToolboxTriggerV1Node = KoBoToolboxTriggerV1ParamsNode;