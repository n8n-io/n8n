/**
 * Venafi TLS Protect Cloud Trigger Node - Version 1
 * Starts the workflow when Venafi events occur
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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
// Node Type
// ===========================================================================

export type VenafiTlsProtectCloudTriggerV1Node = {
	type: 'n8n-nodes-base.venafiTlsProtectCloudTrigger';
	version: 1;
	config: NodeConfig<VenafiTlsProtectCloudTriggerV1Params>;
	credentials?: VenafiTlsProtectCloudTriggerV1Credentials;
	isTrigger: true;
};