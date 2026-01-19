/**
 * Venafi TLS Protect Cloud Trigger Node - Version 1
 * Starts the workflow when Venafi events occur
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
// Node Types
// ===========================================================================

interface VenafiTlsProtectCloudTriggerV1NodeBase {
	type: 'n8n-nodes-base.venafiTlsProtectCloudTrigger';
	version: 1;
	credentials?: VenafiTlsProtectCloudTriggerV1Credentials;
	isTrigger: true;
}

export type VenafiTlsProtectCloudTriggerV1ParamsNode = VenafiTlsProtectCloudTriggerV1NodeBase & {
	config: NodeConfig<VenafiTlsProtectCloudTriggerV1Params>;
};

export type VenafiTlsProtectCloudTriggerV1Node = VenafiTlsProtectCloudTriggerV1ParamsNode;