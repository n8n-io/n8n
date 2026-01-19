/**
 * Help Scout Trigger Node - Version 1
 * Starts the workflow when Help Scout events occur
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface HelpScoutTriggerV1Config {
	events: Array<'convo.assigned' | 'convo.created' | 'convo.deleted' | 'convo.merged' | 'convo.moved' | 'convo.status' | 'convo.tags' | 'convo.agent.reply.created' | 'convo.customer.reply.created' | 'convo.note.created' | 'customer.created' | 'satisfaction.ratings'>;
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

interface HelpScoutTriggerV1NodeBase {
	type: 'n8n-nodes-base.helpScoutTrigger';
	version: 1;
	credentials?: HelpScoutTriggerV1Credentials;
	isTrigger: true;
}

export type HelpScoutTriggerV1Node = HelpScoutTriggerV1NodeBase & {
	config: NodeConfig<HelpScoutTriggerV1Config>;
};

export type HelpScoutTriggerV1Node = HelpScoutTriggerV1Node;