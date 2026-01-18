/**
 * Help Scout Trigger Node Types
 *
 * Starts the workflow when Help Scout events occur
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/helpscouttrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface HelpScoutTriggerV1Params {
	events: Array<
		| 'convo.assigned'
		| 'convo.created'
		| 'convo.deleted'
		| 'convo.merged'
		| 'convo.moved'
		| 'convo.status'
		| 'convo.tags'
		| 'convo.agent.reply.created'
		| 'convo.customer.reply.created'
		| 'convo.note.created'
		| 'customer.created'
		| 'satisfaction.ratings'
	>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface HelpScoutTriggerV1Credentials {
	helpScoutOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type HelpScoutTriggerV1Node = {
	type: 'n8n-nodes-base.helpScoutTrigger';
	version: 1;
	config: NodeConfig<HelpScoutTriggerV1Params>;
	credentials?: HelpScoutTriggerV1Credentials;
	isTrigger: true;
};

export type HelpScoutTriggerNode = HelpScoutTriggerV1Node;
