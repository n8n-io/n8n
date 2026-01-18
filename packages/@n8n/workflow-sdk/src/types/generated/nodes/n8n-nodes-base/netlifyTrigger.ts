/**
 * Netlify Trigger Node Types
 *
 * Handle netlify events via webhooks
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/netlifytrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface NetlifyTriggerV1Params {
	/**
	 * Select the Site ID. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	siteId: string | Expression<string>;
	event:
		| 'deployBuilding'
		| 'deployFailed'
		| 'deployCreated'
		| 'submissionCreated'
		| Expression<string>;
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

export type NetlifyTriggerV1Node = {
	type: 'n8n-nodes-base.netlifyTrigger';
	version: 1;
	config: NodeConfig<NetlifyTriggerV1Params>;
	credentials?: NetlifyTriggerV1Credentials;
	isTrigger: true;
};

export type NetlifyTriggerNode = NetlifyTriggerV1Node;
