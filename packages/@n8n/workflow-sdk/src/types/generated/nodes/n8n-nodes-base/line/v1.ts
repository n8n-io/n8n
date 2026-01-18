/**
 * Line Node - Version 1
 * Consume Line API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
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

export type LineV1Params =
	| LineV1NotificationSendConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LineV1Credentials {
	lineNotifyOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LineV1Node = {
	type: 'n8n-nodes-base.line';
	version: 1;
	config: NodeConfig<LineV1Params>;
	credentials?: LineV1Credentials;
};