import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { ExecutionContextService } from 'n8n-core';
import type { ICredentialResolutionContext, IVerifiedClaim } from 'n8n-workflow';

/** The parts of an execution context credential resolution needs. */
export type ResolvableExecutionContext = {
	credentials?: string;
	claims?: string;
};

/**
 * Builds the context resolvers see, from the encrypted fields of an execution
 * context. Single place where "which identity does this execution carry?" is
 * decided, so the node-execution path and the pre-execution credential-status
 * gate can never disagree.
 */
@Service()
export class CredentialResolutionContextBuilder {
	constructor(
		private readonly logger: Logger,
		private readonly executionContextService: ExecutionContextService,
	) {}

	/**
	 * Runs on every credential access - the caller's verified claim is unsealed
	 * here and handed to the resolver, never cached, so the principal is
	 * re-derived (and re-authorized) each time.
	 *
	 * An explicit credential context always wins: a run that captured an n8n
	 * identity (manual, chat-hub, cookie, n8n-oauth) keeps resolving through it,
	 * and the claim only rides along. When there is no credential context but the
	 * execution carries a claim, an `external-idp` context is synthesized so
	 * resolution keys on the claim instead - there is no identity token to carry
	 * in that flow.
	 *
	 * @param workflowId Required to unseal a claim, which is sealed per workflow.
	 *                   Without it the claim is dropped, i.e. resolution fails
	 *                   closed rather than accepting a claim sealed elsewhere.
	 * @returns `undefined` when the execution carries no identity at all.
	 */
	async build(
		executionContext: ResolvableExecutionContext | undefined,
		workflowId: string | undefined,
	): Promise<ICredentialResolutionContext | undefined> {
		if (!executionContext) return undefined;

		const claims = await this.unsealClaims(executionContext.claims, workflowId);

		if (!executionContext.credentials) {
			if (!claims) return undefined;
			return {
				version: 1,
				// No identity token in this flow; the claim is the identity.
				identity: '',
				metadata: { source: 'external-idp' },
				claims,
			};
		}

		try {
			const credentialContext = await this.executionContextService.decryptCredentialContext(
				executionContext.credentials,
			);
			return claims ? { ...credentialContext, claims } : credentialContext;
		} catch (error) {
			this.logger.error('Failed to decrypt credential context from execution context', {
				error: error instanceof Error ? error.message : String(error),
			});
			return undefined;
		}
	}

	private async unsealClaims(
		claims: string | undefined,
		workflowId: string | undefined,
	): Promise<IVerifiedClaim | undefined> {
		if (!claims) return undefined;

		if (!workflowId) {
			this.logger.warn('Cannot unseal claim without a workflow id, dropping it');
			return undefined;
		}

		return await this.executionContextService.decryptClaims(claims, workflowId);
	}
}
