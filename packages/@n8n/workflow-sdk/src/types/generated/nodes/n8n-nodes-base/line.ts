/**
 * Line Node Types
 *
 * Consume Line API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/line/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

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

export type LineV1Params = LineV1NotificationSendConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LineV1Credentials {
	lineNotifyOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LineNode = {
	type: 'n8n-nodes-base.line';
	version: 1;
	config: NodeConfig<LineV1Params>;
	credentials?: LineV1Credentials;
};
