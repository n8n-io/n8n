/**
 * Cal.com Trigger Node - Version 1
 * Handle Cal.com events via webhooks
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface CalTriggerV1Config {
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
// Node Types
// ===========================================================================

interface CalTriggerV1NodeBase {
	type: 'n8n-nodes-base.calTrigger';
	version: 1;
	credentials?: CalTriggerV1Credentials;
	isTrigger: true;
}

export type CalTriggerV1Node = CalTriggerV1NodeBase & {
	config: NodeConfig<CalTriggerV1Config>;
};

export type CalTriggerV1Node = CalTriggerV1Node;