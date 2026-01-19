/**
 * Netlify Trigger Node - Version 1
 * Handle netlify events via webhooks
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface NetlifyTriggerV1Params {
/**
 * Select the Site ID. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 */
		siteId: string | Expression<string>;
	event: 'deployBuilding' | 'deployFailed' | 'deployCreated' | 'submissionCreated' | Expression<string>;
/**
 * Select a form. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { event: ["submissionCreated"] }
 */
		formId: string | Expression<string>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { event: ["submissionCreated"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface NetlifyTriggerV1Credentials {
	netlifyApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface NetlifyTriggerV1NodeBase {
	type: 'n8n-nodes-base.netlifyTrigger';
	version: 1;
	credentials?: NetlifyTriggerV1Credentials;
	isTrigger: true;
}

export type NetlifyTriggerV1ParamsNode = NetlifyTriggerV1NodeBase & {
	config: NodeConfig<NetlifyTriggerV1Params>;
};

export type NetlifyTriggerV1Node = NetlifyTriggerV1ParamsNode;