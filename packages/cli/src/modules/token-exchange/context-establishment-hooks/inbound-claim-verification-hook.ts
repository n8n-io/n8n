import { Logger } from '@n8n/backend-common';
import type {
	ContextEstablishmentOptions,
	ContextEstablishmentResult,
	HookDescription,
	IContextEstablishmentHook,
} from '@n8n/decorators';
import { ContextEstablishmentHook } from '@n8n/decorators';
import type { IVerifiedClaim } from 'n8n-workflow';

import { extractBearerToken } from '@/modules/identity-substrate/context-establishment-hooks/extract-bearer-token';
import { ExternalTokenVerifierProxy } from '@/services/external-token-verifier-proxy.service';

import { InboundAudienceService } from './inbound-audience.service';

/**
 * Verifies the inbound bearer token, once, at context establishment, and
 * carries the resulting attested facts forward as a sealed `IVerifiedClaim`.
 * Deliberately does not resolve or store an n8n principal - the principal is
 * re-derived from the claim on every access (see IAM-1168/IAM-1169), never
 * stored here, since a stored principal id would itself work as a bearer
 * credential.
 *
 * Global (`alwaysExecute`), not a per-node opt-in: verification should apply
 * automatically wherever a bearer token shows up, not require a trigger node
 * to explicitly list this hook. That means the per-node `isAllowedToFail`
 * gate never applies to it - global hooks that throw fail the execution
 * outright. So this hook must never throw, full stop; every failure mode
 * degrades to "no claim" (optionally with `authFailureReason` recorded),
 * never an exception. Not re-run for sub-executions
 * (`runForSubExecution: false`): sub-executions receive `triggerItems: null`
 * (no fresh inbound request of their own), and the parent's claim is already
 * re-sealed for the child workflow by `augmentSubExecutionContext`.
 */
@ContextEstablishmentHook({ alwaysExecute: true, runForSubExecution: false })
export class InboundClaimVerificationHook implements IContextEstablishmentHook {
	constructor(
		private readonly logger: Logger,
		private readonly externalTokenVerifierProxy: ExternalTokenVerifierProxy,
		private readonly inboundAudienceService: InboundAudienceService,
	) {}

	hookDescription: HookDescription = {
		name: 'InboundClaimVerificationHook',
	};

	isApplicableToTriggerNode(_nodeType: string): boolean {
		// Global hook, never user-facing.
		return false;
	}

	async execute(options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
		try {
			const token = extractBearerToken(options.triggerItems);
			if (!token) {
				// No credential presented - proceed, no claim, exactly as today.
				return {};
			}

			const audienceResult = await this.inboundAudienceService.getExpectedAudiences(
				options.workflow,
				options.triggerNode,
			);
			if (!audienceResult.audiences) {
				// Audience belongs to the resource being called - with no resource
				// resolvable, there is nothing to verify against. Fail closed
				// rather than guess an instance-wide value (D4 still applies: this
				// only withholds the claim, it never blocks the execution).
				return { contextUpdate: { authFailureReason: audienceResult.reason } };
			}

			const result = await this.externalTokenVerifierProxy.verifyExternalToken(
				token,
				audienceResult.audiences,
			);

			if (!result.claim) {
				// Covers both 'verifier_not_registered' and 'invalid_token' - both
				// must proceed with no claim; record why for diagnostics.
				return { contextUpdate: { authFailureReason: result.context.reason } };
			}

			const claim: IVerifiedClaim = {
				version: 1,
				sourceId: result.claim.sourceId,
				issuer: result.claim.issuer,
				subject: result.claim.subject,
				audience: Array.isArray(result.claim.audience)
					? result.claim.audience[0]
					: result.claim.audience,
				// Attribution only - whether an active binding exists, and whether
				// the claim is still fresh enough to matter, are decided at access
				// time, not here.
				expiresAt: result.claim.expiresAt.getTime(),
				// actorClaim intentionally omitted - OBO is out of scope here.
				// ExecutionContextService.sealClaims() overwrites this with the
				// real workflow id when sealing; see its own tests for this convention.
				boundWorkflowId: 'not-yet-sealed',
			};

			return { contextUpdate: { claims: claim } };
		} catch (error) {
			// Defense in depth: extractBearerToken and the proxy are themselves
			// designed not to throw, but a global hook throwing fails the whole
			// execution, so this is the backstop, not the primary mechanism.
			this.logger.warn(
				'InboundClaimVerificationHook failed unexpectedly, proceeding without a claim',
				{ error },
			);
			return { contextUpdate: { authFailureReason: 'internal_error' } };
		}
	}
}
