/**
 * Pushcut Trigger Node - Version 1
 * Starts the workflow when Pushcut events occur
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface PushcutTriggerV1Params {
/**
 * Choose any name you would like. It will show up as a server action in the app.
 */
		actionName?: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface PushcutTriggerV1Credentials {
	pushcutApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type PushcutTriggerV1Node = {
	type: 'n8n-nodes-base.pushcutTrigger';
	version: 1;
	config: NodeConfig<PushcutTriggerV1Params>;
	credentials?: PushcutTriggerV1Credentials;
	isTrigger: true;
};