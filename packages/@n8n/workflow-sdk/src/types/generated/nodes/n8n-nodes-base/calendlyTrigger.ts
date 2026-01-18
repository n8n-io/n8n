/**
 * Calendly Trigger Node Types
 *
 * Starts the workflow when Calendly events occur
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/calendlytrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

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

export type CalendlyTriggerV1Params = CalendlyTriggerV1OAuth2Config | CalendlyTriggerV1ApiKeyConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface CalendlyTriggerV1Credentials {
	calendlyApi: CredentialReference;
	calendlyOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type CalendlyTriggerNode = {
	type: 'n8n-nodes-base.calendlyTrigger';
	version: 1;
	config: NodeConfig<CalendlyTriggerV1Params>;
	credentials?: CalendlyTriggerV1Credentials;
	isTrigger: true;
};
