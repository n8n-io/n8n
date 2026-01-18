/**
 * Cal.com Trigger Node - Version 2
 * Handle Cal.com events via webhooks
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface CalTriggerV2Params {
	events: Array<'BOOKING_CANCELLED' | 'BOOKING_CREATED' | 'BOOKING_RESCHEDULED' | 'MEETING_ENDED'>;
	version?: 1 | 2 | Expression<number>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface CalTriggerV2Credentials {
	calApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type CalTriggerV2Node = {
	type: 'n8n-nodes-base.calTrigger';
	version: 2;
	config: NodeConfig<CalTriggerV2Params>;
	credentials?: CalTriggerV2Credentials;
	isTrigger: true;
};