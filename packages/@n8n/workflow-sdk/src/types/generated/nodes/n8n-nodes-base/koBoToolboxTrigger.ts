/**
 * KoBoToolbox Trigger Node Types
 *
 * Process KoBoToolbox submissions
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/kobotoolboxtrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

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

export type KoBoToolboxTriggerV1Node = {
	type: 'n8n-nodes-base.koBoToolboxTrigger';
	version: 1;
	config: NodeConfig<KoBoToolboxTriggerV1Params>;
	credentials?: KoBoToolboxTriggerV1Credentials;
	isTrigger: true;
};

export type KoBoToolboxTriggerNode = KoBoToolboxTriggerV1Node;
