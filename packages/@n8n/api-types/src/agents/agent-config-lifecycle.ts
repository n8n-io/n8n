/**
 * Draft-lifecycle predicates. A capability is a "draft" while its setup is
 * pending: the agent config until a model is chosen (`model: ""`), an
 * integration entry until a credential is connected (`credentialId: ""`).
 */

/** True while no model has been chosen yet (setup pending). */
export function isDraftAgentConfig(config: { model?: string } | null | undefined): boolean {
	return typeof config?.model !== 'string' || config.model.trim() === '';
}

/** True while no credential is connected yet (setup pending). */
export function isDraftIntegration(integration: { credentialId: string }): boolean {
	return integration.credentialId.trim() === '';
}
