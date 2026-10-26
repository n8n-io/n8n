/**
 * Draft-lifecycle predicates. A capability is a "draft" while its setup is
 * pending: the agent config until a model is chosen (`model: ""`), an
 * credential-backed integration entry until a credential is connected.
 */

/** True while no model has been chosen yet (setup pending). */
export function isDraftAgentConfig(config: { model?: string } | null | undefined): boolean {
	return typeof config?.model !== 'string' || config.model.trim() === '';
}

/** True while no credential is connected yet (setup pending). */
export function isDraftIntegration(integration: { type: string; credentialId: string }): boolean {
	return integration.type !== 'n8n_chat' && integration.credentialId.trim() === '';
}
