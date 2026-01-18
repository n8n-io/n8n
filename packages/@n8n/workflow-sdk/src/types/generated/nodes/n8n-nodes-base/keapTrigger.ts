/**
 * Keap Trigger Node Types
 *
 * Starts the workflow when Infusionsoft events occur
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/keaptrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface KeapTriggerV1Params {
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	eventId: string | Expression<string>;
	/**
	 * Whether to return the data exactly in the way it got received from the API
	 * @default false
	 */
	rawData?: boolean | Expression<boolean>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface KeapTriggerV1Credentials {
	keapOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type KeapTriggerV1Node = {
	type: 'n8n-nodes-base.keapTrigger';
	version: 1;
	config: NodeConfig<KeapTriggerV1Params>;
	credentials?: KeapTriggerV1Credentials;
	isTrigger: true;
};

export type KeapTriggerNode = KeapTriggerV1Node;
