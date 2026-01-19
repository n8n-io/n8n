/**
 * Pushcut Node - Version 1
 * Consume Pushcut API
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
// Output Types
// ===========================================================================

export type PushcutV1NotificationSendOutput = {
	id?: string;
	message?: string;
	notificationId?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface PushcutV1Credentials {
	pushcutApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface PushcutV1NodeBase {
	type: 'n8n-nodes-base.pushcut';
	version: 1;
	credentials?: PushcutV1Credentials;
}

export type PushcutV1NotificationSendNode = PushcutV1NodeBase & {
	config: NodeConfig<PushcutV1NotificationSendConfig>;
	output?: PushcutV1NotificationSendOutput;
};

export type PushcutV1Node = PushcutV1NotificationSendNode;