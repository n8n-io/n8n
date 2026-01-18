/**
 * Pushcut Node - Version 1
 * Consume Pushcut API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Send a notification */
export type PushcutV1NotificationSendConfig = {
	resource: 'notification';
	operation: 'send';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["notification"], operation: ["send"] }
 */
		notificationName?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type PushcutV1Params =
	| PushcutV1NotificationSendConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface PushcutV1Credentials {
	pushcutApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type PushcutV1Node = {
	type: 'n8n-nodes-base.pushcut';
	version: 1;
	config: NodeConfig<PushcutV1Params>;
	credentials?: PushcutV1Credentials;
};