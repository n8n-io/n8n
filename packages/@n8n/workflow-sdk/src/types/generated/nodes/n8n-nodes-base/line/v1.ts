/**
 * Line Node - Version 1
 * Consume Line API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Sends notifications to users or groups */
export type LineV1NotificationSendConfig = {
	resource: 'notification';
	operation: 'send';
	message: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};


// ===========================================================================
// Output Types
// ===========================================================================

export type LineV1NotificationSendOutput = {
	message?: string;
	status?: number;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface LineV1Credentials {
	lineNotifyOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LineV1NodeBase {
	type: 'n8n-nodes-base.line';
	version: 1;
	credentials?: LineV1Credentials;
}

export type LineV1NotificationSendNode = LineV1NodeBase & {
	config: NodeConfig<LineV1NotificationSendConfig>;
	output?: LineV1NotificationSendOutput;
};

export type LineV1Node = LineV1NotificationSendNode;