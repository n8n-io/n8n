/**
 * Linear Trigger Node - Version 1
 * Starts the workflow when Linear events occur
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LinearTriggerV1Params {
	authentication?: 'apiToken' | 'oAuth2' | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 */
		teamId?: string | Expression<string>;
	resources: Array<'reaction' | 'cycle' | 'issue' | 'comment' | 'issueLabel' | 'project'>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface LinearTriggerV1Credentials {
	linearApi: CredentialReference;
	linearOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LinearTriggerV1NodeBase {
	type: 'n8n-nodes-base.linearTrigger';
	version: 1;
	credentials?: LinearTriggerV1Credentials;
	isTrigger: true;
}

export type LinearTriggerV1ParamsNode = LinearTriggerV1NodeBase & {
	config: NodeConfig<LinearTriggerV1Params>;
};

export type LinearTriggerV1Node = LinearTriggerV1ParamsNode;