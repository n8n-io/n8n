/**
 * Venafi TLS Protect Cloud Trigger Node Types
 *
 * Starts the workflow when Venafi events occur
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/venafitlsprotectcloudtrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface VenafiTlsProtectCloudTriggerV1Params {
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	resource: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	triggerOn: string[];
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface VenafiTlsProtectCloudTriggerV1Credentials {
	venafiTlsProtectCloudApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type VenafiTlsProtectCloudTriggerV1Node = {
	type: 'n8n-nodes-base.venafiTlsProtectCloudTrigger';
	version: 1;
	config: NodeConfig<VenafiTlsProtectCloudTriggerV1Params>;
	credentials?: VenafiTlsProtectCloudTriggerV1Credentials;
	isTrigger: true;
};

export type VenafiTlsProtectCloudTriggerNode = VenafiTlsProtectCloudTriggerV1Node;
