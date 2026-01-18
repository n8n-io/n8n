/**
 * Cal.com Trigger Node - Version 1
 * Handle Cal.com events via webhooks
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface CalTriggerV1Params {
	events: Array<'BOOKING_CANCELLED' | 'BOOKING_CREATED' | 'BOOKING_RESCHEDULED' | 'MEETING_ENDED'>;
	version?: 1 | 2 | Expression<number>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface CalTriggerV1Credentials {
	calApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type CalTriggerV1Node = {
	type: 'n8n-nodes-base.calTrigger';
	version: 1;
	config: NodeConfig<CalTriggerV1Params>;
	credentials?: CalTriggerV1Credentials;
	isTrigger: true;
};