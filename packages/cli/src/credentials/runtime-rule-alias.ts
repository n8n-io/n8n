import { RuntimeCredentialProxyService } from '@n8n/backend-services';
import { Container } from '@n8n/di';

/** The alias of the rule behind a run-time stub credential, or `null` when the rule is gone. */
export function getRuntimeRuleAlias(credentialId: string): string | null {
	return Container.get(RuntimeCredentialProxyService).getRuleAliasForStub(credentialId) ?? null;
}

/**
 * Adds `ruleAlias` to a run-time stub credential, so that a client does not parse the stub name.
 * Other credentials stay as they are.
 */
export function addRuntimeRuleAlias<T extends { id: string; isRuntime?: boolean }>(
	credential: T,
): T | (T & { ruleAlias: string | null }) {
	if (!credential.isRuntime) return credential;
	return { ...credential, ruleAlias: getRuntimeRuleAlias(credential.id) };
}
