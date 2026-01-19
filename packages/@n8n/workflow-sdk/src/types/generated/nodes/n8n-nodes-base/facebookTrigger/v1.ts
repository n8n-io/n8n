/**
 * Facebook Trigger Node - Version 1
 * Starts the workflow when Facebook events occur
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface FacebookTriggerV1Params {
/**
 * Facebook APP ID
 */
		appId: string | Expression<string>;
/**
 * The object to subscribe to
 * @default user
 */
		object: 'adAccount' | 'application' | 'certificateTransparency' | 'group' | 'instagram' | 'link' | 'page' | 'permissions' | 'user' | 'whatsappBusinessAccount' | 'workplaceSecurity' | Expression<string>;
/**
 * The set of fields in this object that are subscribed to. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @default []
 */
		fields?: string[];
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface FacebookTriggerV1Credentials {
	facebookGraphAppApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface FacebookTriggerV1NodeBase {
	type: 'n8n-nodes-base.facebookTrigger';
	version: 1;
	credentials?: FacebookTriggerV1Credentials;
	isTrigger: true;
}

export type FacebookTriggerV1ParamsNode = FacebookTriggerV1NodeBase & {
	config: NodeConfig<FacebookTriggerV1Params>;
};

export type FacebookTriggerV1Node = FacebookTriggerV1ParamsNode;