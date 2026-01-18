/**
 * Gmail Trigger Node Types
 *
 * Fetches emails from Gmail and starts the workflow on specified polling intervals.
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/gmailtrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface GmailTriggerV13Params {
	/**
	 * Time at which polling should occur
	 * @default {"item":[{"mode":"everyMinute"}]}
	 */
	pollTimes?: Record<string, unknown>;
	authentication?: 'oAuth2' | 'serviceAccount' | Expression<string>;
	event?: 'messageReceived' | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	filters?: Record<string, unknown>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface GmailTriggerV13Credentials {
	googleApi: CredentialReference;
	gmailOAuth2: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type GmailTriggerNode = {
	type: 'n8n-nodes-base.gmailTrigger';
	version: 1 | 1.1 | 1.2 | 1.3;
	config: NodeConfig<GmailTriggerV13Params>;
	credentials?: GmailTriggerV13Credentials;
	isTrigger: true;
};
