/**
 * FE-local registry of agent app toolsets — UI metadata only.
 *
 * This file deliberately ships **no** scope curation, classification, or
 * operation walker. Anything that requires knowing which OAuth scope an op
 * needs (e.g. status badges in `AgentAppConfigModal`) lives behind the
 * `/agents/v2/catalog/apps/:kind/operations` endpoint, so Google API URLs
 * and similar provider-specific identifiers stay on the backend.
 *
 * Drift discipline: when adding a new app, mirror it in
 * `packages/@n8n/agents/src/toolsets/registry/`. Code review is the safety
 * net.
 */

export interface AppDefinition {
	kind: string;
	nodeType: string;
	nodeTypeVersion: number;
	credentialType: string;
	disabled?: boolean;
}

const GMAIL_APP: AppDefinition = {
	kind: 'gmail',
	nodeType: 'n8n-nodes-base.gmail',
	nodeTypeVersion: 2.2,
	credentialType: 'gmailOAuth2',
};

const GOOGLE_SHEETS_APP: AppDefinition = {
	kind: 'googleSheets',
	nodeType: 'n8n-nodes-base.googleSheets',
	nodeTypeVersion: 4.7,
	credentialType: 'googleSheetsOAuth2Api',
};

const SLACK_APP: AppDefinition = {
	kind: 'slack',
	nodeType: 'n8n-nodes-base.slack',
	nodeTypeVersion: 2.4,
	credentialType: 'slackApi',
};

export const APP_REGISTRY: readonly AppDefinition[] = [GMAIL_APP, GOOGLE_SHEETS_APP, SLACK_APP];

export function findAppDefinition(kind: string): AppDefinition | undefined {
	return APP_REGISTRY.find((a) => a.kind === kind);
}
