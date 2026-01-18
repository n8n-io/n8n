/**
 * Taiga Trigger Node - Version 1
 * Handle Taiga events via webhook
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface TaigaTriggerV1Params {
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 */
		projectId: string | Expression<string>;
/**
 * Resources to listen to
 * @default ["all"]
 */
		resources: Array<'all' | 'issue' | 'milestone' | 'task' | 'userstory' | 'wikipage'>;
/**
 * Operations to listen to
 * @default ["all"]
 */
		operations: Array<'all' | 'create' | 'delete' | 'change'>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface TaigaTriggerV1Credentials {
	taigaApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type TaigaTriggerV1Node = {
	type: 'n8n-nodes-base.taigaTrigger';
	version: 1;
	config: NodeConfig<TaigaTriggerV1Params>;
	credentials?: TaigaTriggerV1Credentials;
	isTrigger: true;
};