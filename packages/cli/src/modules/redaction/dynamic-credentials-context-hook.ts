import { Logger } from '@n8n/backend-common';
import { CredentialsRepository } from '@n8n/db';
import {
	ContextEstablishmentHook,
	ContextEstablishmentOptions,
	ContextEstablishmentResult,
	HookDescription,
	IContextEstablishmentHook,
} from '@n8n/decorators';
import type { PlaintextExecutionContext } from 'n8n-workflow';

import { ExecutingUserIdentifierProxy } from '@/credentials/executing-user-identifier-proxy';

@ContextEstablishmentHook({
	alwaysExecute: true,
	// Re-run for sub-workflows so a child that references a private credential
	// stamps its own flag, independent of the parent.
	runForSubExecution: true,
})
export class DynamicCredentialsContextHook implements IContextEstablishmentHook {
	constructor(
		private readonly logger: Logger,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly executingUserIdentifierProxy: ExecutingUserIdentifierProxy,
	) {}

	hookDescription: HookDescription = {
		name: 'DynamicCredentialsContextHook',
	};

	isApplicableToTriggerNode(_nodeType: string): boolean {
		// Global hook, never user-facing.
		return false;
	}

	/**
	 * Establishes the two signals the redaction layer needs at execution start,
	 * before any node runs, so a run that fails or stops before a private
	 * credential resolves is still handled consistently with a successful run:
	 *
	 * - `usesDynamicCredentials`: true when the workflow references a private
	 *   (resolvable) credential. Drives redaction-for-everyone.
	 * - `executedByUserId`: the n8n user the run executes as, derived from the
	 *   established identity carrier by the same identifier credential resolution
	 *   uses — so the redaction owner cannot drift from the resolved user. Grants
	 *   that user access to their own run. One place covers every identity path
	 *   (manual, chat, MCP, webhook, form) because they all carry the identity.
	 *
	 * Not gated by the data-redaction license: private-credential redaction is
	 * unconditional, unlike the policy-driven redaction snapshot.
	 */
	async execute(options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
		const contextUpdate: Partial<PlaintextExecutionContext> = {};

		const credentialIds = new Set<string>();
		for (const node of Object.values(options.workflow.nodes)) {
			for (const credential of Object.values(node.credentials ?? {})) {
				if (credential.id) credentialIds.add(credential.id);
			}
		}
		let hasResolvable: boolean;
		try {
			hasResolvable = await this.credentialsRepository.hasResolvableCredential([...credentialIds]);
		} catch (error) {
			// A redaction-support query must not abort the run. On uncertainty, over-redact:
			// hide the run from everyone and skip owner attribution.
			this.logger.warn('Could not check for resolvable credentials; redacting run for everyone', {
				error,
			});
			return { contextUpdate: { usesDynamicCredentials: true } };
		}
		if (!hasResolvable) return {};
		contextUpdate.usesDynamicCredentials = true;

		// Only a private-credential run needs its owner attributed, so identify here
		// rather than for every identity run. The token is still valid at execution
		// start, so a later view (after it expires) still finds the persisted user.
		const credentials = options.context?.credentials;
		if (credentials) {
			const executedByUserId = await this.executingUserIdentifierProxy.identify(credentials);
			if (executedByUserId) contextUpdate.executedByUserId = executedByUserId;
		}

		return { contextUpdate };
	}
}
