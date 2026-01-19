/**
 * Calendly Trigger Node - Version 1
 * Starts the workflow when Calendly events occur
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type CalendlyTriggerV1OAuth2Config = {
	authentication: 'oAuth2';
	scope: 'organization' | 'user' | Expression<string>;
	events: Array<'invitee.created' | 'invitee.canceled'>;
};

export type CalendlyTriggerV1ApiKeyConfig = {
	authentication: 'apiKey';
	scope: 'organization' | 'user' | Expression<string>;
	events: Array<'invitee.created' | 'invitee.canceled'>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface CalendlyTriggerV1Credentials {
	calendlyApi: CredentialReference;
	calendlyOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface CalendlyTriggerV1NodeBase {
	type: 'n8n-nodes-base.calendlyTrigger';
	version: 1;
	credentials?: CalendlyTriggerV1Credentials;
	isTrigger: true;
}

export type CalendlyTriggerV1OAuth2Node = CalendlyTriggerV1NodeBase & {
	config: NodeConfig<CalendlyTriggerV1OAuth2Config>;
};

export type CalendlyTriggerV1ApiKeyNode = CalendlyTriggerV1NodeBase & {
	config: NodeConfig<CalendlyTriggerV1ApiKeyConfig>;
};

export type CalendlyTriggerV1Node =
	| CalendlyTriggerV1OAuth2Node
	| CalendlyTriggerV1ApiKeyNode
	;