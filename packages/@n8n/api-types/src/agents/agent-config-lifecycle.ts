import {
	isCredentialAgentIntegration,
	WEBHOOK_INTEGRATION_TYPE,
	webhookAuthentication,
	type AgentIntegrationConfig,
	type CredentialAgentIntegrationConfig,
} from './agent-integration.schema';

/**
 * Draft-lifecycle predicates. A capability is a "draft" while its setup is
 * pending: the agent config until a model is chosen (`model: ""`), an
 * credential-backed integration entry until a credential is connected.
 *
 * A platform channel (Slack, Telegram, …) holds a credential and runs a platform
 * connection. n8n Chat has neither. A webhook has no connection, and holds a
 * credential only when its authentication needs one.
 */

/** True while no model has been chosen yet (setup pending). */
export function isDraftAgentConfig(config: { model?: string } | null | undefined): boolean {
	return typeof config?.model !== 'string' || config.model.trim() === '';
}

/** Whether the channel runs a platform connection (Chat SDK adapter) and attaches channel tools. */
export function hasChannelRuntime(
	integration: AgentIntegrationConfig,
): integration is Exclude<
	CredentialAgentIntegrationConfig,
	{ type: typeof WEBHOOK_INTEGRATION_TYPE }
> {
	return isCredentialAgentIntegration(integration) && integration.type !== WEBHOOK_INTEGRATION_TYPE;
}

/** Whether the channel entry must hold a credential to be set up. */
export function integrationNeedsCredential(integration: {
	type: string;
	settings?: unknown;
}): boolean {
	if (integration.type === WEBHOOK_INTEGRATION_TYPE) {
		return webhookAuthentication(integration) !== 'none';
	}
	return integration.type !== 'n8n_chat';
}

/** True while no credential is connected yet, or a webhook has no authentication yet (setup pending). */
export function isDraftIntegration(integration: {
	type: string;
	credentialId: string;
	settings?: unknown;
}): boolean {
	if (integration.type === WEBHOOK_INTEGRATION_TYPE && !webhookAuthentication(integration)) {
		return true;
	}
	return integrationNeedsCredential(integration) && integration.credentialId.trim() === '';
}

/** The entry that a copy of an agent gets: a draft that needs setup in the destination. */
export function toDraftIntegration(integration: AgentIntegrationConfig): AgentIntegrationConfig {
	if (integration.type === WEBHOOK_INTEGRATION_TYPE) {
		// Without settings the copy has no authentication, so it is a draft in every mode.
		const { settings: _settings, ...entry } = integration;
		return { ...entry, credentialId: '' };
	}
	return isCredentialAgentIntegration(integration)
		? { ...integration, credentialId: '' }
		: integration;
}

/** The entry that an import gets when the destination agent already has a channel of that type. */
export function reuseIntegrationSetup(
	source: CredentialAgentIntegrationConfig,
	existing: AgentIntegrationConfig,
): AgentIntegrationConfig {
	if (source.type === WEBHOOK_INTEGRATION_TYPE && existing.type === WEBHOOK_INTEGRATION_TYPE) {
		// The authentication and its credential belong together.
		return { ...source, credentialId: existing.credentialId, settings: existing.settings };
	}
	return { ...source, credentialId: existing.credentialId };
}
