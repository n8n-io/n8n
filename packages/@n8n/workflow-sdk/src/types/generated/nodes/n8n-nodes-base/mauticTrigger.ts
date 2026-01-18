/**
 * Mautic Trigger Node Types
 *
 * Handle Mautic events via webhooks
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/mautictrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface MauticTriggerV1Params {
	authentication?: 'credentials' | 'oAuth2' | Expression<string>;
	/**
	 * Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @default []
	 */
	events: string[];
	/**
	 * Order direction for queued events in one webhook. Can be “DESC” or “ASC”.
	 * @default ASC
	 */
	eventsOrder?: 'ASC' | 'DESC' | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface MauticTriggerV1Credentials {
	mauticApi: CredentialReference;
	mauticOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type MauticTriggerNode = {
	type: 'n8n-nodes-base.mauticTrigger';
	version: 1;
	config: NodeConfig<MauticTriggerV1Params>;
	credentials?: MauticTriggerV1Credentials;
	isTrigger: true;
};
