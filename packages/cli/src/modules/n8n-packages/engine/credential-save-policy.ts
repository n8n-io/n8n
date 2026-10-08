import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import type { PolicyActor } from '@/policy/policy-enforcement-backend';
import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { PolicyViolationError } from '@/policy/policy-violation.error';

import { credentialsToStub } from '../entities/credential/credential-missing-mode';
import type {
	CredentialBindingRequest,
	CredentialResolution,
} from '../entities/credential/credential.types';
import type { BlockingIssue } from '../n8n-packages.types';

@Service()
export class CredentialSavePolicyGate {
	constructor(
		private readonly policyEnforcementService: PolicyEnforcementService,
		private readonly logger: Logger,
	) {}

	/**
	 * Admits every stub credential the import would create, and reports the ones policy refused.
	 *
	 * The stub insert enforces the same point, but only after tags and folders are written. This
	 * check runs at plan time, so a refusal blocks the import before its first write.
	 */
	async refusedStubs(
		request: CredentialBindingRequest,
		resolution: CredentialResolution,
		projectId: string,
		actor: PolicyActor,
	): Promise<BlockingIssue[]> {
		// Having no policy at all is the common case, so skip the selection too.
		if (!this.policyEnforcementService.hasChecksFor('credentialSave')) return [];

		const refused: BlockingIssue[] = [];

		for (const { sourceId, name, type, usedByWorkflows } of credentialsToStub(
			request.missingMode,
			resolution,
		)) {
			// Apply rejects a stub without a type before it reaches the policy, so there is no
			// verdict to ask for.
			if (type === undefined) continue;

			try {
				// The clearance is discarded: the stub insert mints its own when it writes.
				await this.policyEnforcementService.enforceCredentialSave(
					{ credential: { id: null, type }, storedCredential: null, projectId },
					actor,
				);
			} catch (error) {
				// A check that broke is not scoped to one credential, so it fails the import outright.
				if (!(error instanceof PolicyViolationError)) throw error;

				this.logger.warn(
					`Credential "${name ?? sourceId}" is blocked by the credential-save policy`,
					{ violations: error.violations },
				);

				refused.push({
					type: 'credential-policy-violation',
					sourceId,
					...(name !== undefined ? { name } : {}),
					credentialType: type,
					usedByWorkflows,
					violations: error.violations,
				});
			}
		}

		return refused;
	}
}
