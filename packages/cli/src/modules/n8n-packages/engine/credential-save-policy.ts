import { Logger } from '@n8n/backend-common';
import type { ContentImportTransport, PolicyViolation } from '@n8n/decorators';
import { Service } from '@n8n/di';

import type { PolicyActor } from '@/policy/policy-enforcement-backend';
import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { PolicyViolationError } from '@/policy/policy-violation.error';

import { credentialsToStub } from '../entities/credential/credential-missing-mode';
import type {
	CredentialBindingRequest,
	CredentialResolution,
	CredentialUpdateCandidate,
} from '../entities/credential/credential.types';
import type { BlockingIssue } from '../n8n-packages.types';
import { mergeRequirementConsumers } from '../spec/requirement-consumers';

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

		for (const { sourceId, name, type } of credentialsToStub(request.missingMode, resolution)) {
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
					usedBy: mergeRequirementConsumers(
						request.requirements?.find(({ id }) => id === sourceId)?.usedBy ?? [],
					),
					violations: error.violations,
				});
			}
		}

		return refused;
	}

	/**
	 * Admits every planned credential update, and reports the ones policy refused. Asks the
	 * `credentialSave` and `contentImport` checks, with the context that each write-time check
	 * builds. The update itself enforces `credentialSave` again when it writes.
	 *
	 * Takes the updates of every scope at once, grouped by destination credential, so that a
	 * credential reached from several projects is asked about, and reported, once.
	 */
	async refusedUpdates(
		updatesByTarget: ReadonlyMap<string, CredentialUpdateCandidate[]>,
		transport: ContentImportTransport,
		actor: PolicyActor,
	): Promise<BlockingIssue[]> {
		const checksSave = this.policyEnforcementService.hasChecksFor('credentialSave');
		const checksImport = this.policyEnforcementService.hasChecksFor('contentImport');
		if (!checksSave && !checksImport) return [];

		const refused: BlockingIssue[] = [];

		for (const [targetId, group] of updatesByTarget) {
			const { targetType: type, ownerProjectId: projectId, targetName } = group[0];
			const credential = { id: targetId, type };

			// The clearances are discarded: the update mints its own when it writes.
			const violations = [
				...(checksSave
					? await violationsOf(
							this.policyEnforcementService.enforceCredentialSave(
								{ credential, storedCredential: credential, projectId },
								actor,
							),
						)
					: []),
				...(checksImport
					? await violationsOf(
							this.policyEnforcementService.enforceContentImport(
								{ credential, projectId, transport },
								actor,
							),
						)
					: []),
			];
			if (violations.length === 0) continue;

			this.logger.warn(`Update of credential "${targetName}" is blocked by the credential policy`, {
				violations,
			});

			for (const { sourceId, name, usedBy } of group) {
				refused.push({
					type: 'credential-policy-violation',
					sourceId,
					targetId,
					name,
					credentialType: type,
					usedBy: mergeRequirementConsumers(usedBy),
					violations,
				});
			}
		}

		return refused;
	}
}

/**
 * The violations of one enforcement, or none when it clears. A check that broke is not scoped
 * to one credential, so its error fails the import outright.
 */
async function violationsOf(enforcement: Promise<unknown>): Promise<PolicyViolation[]> {
	try {
		await enforcement;
		return [];
	} catch (error) {
		if (!(error instanceof PolicyViolationError)) throw error;
		return error.violations;
	}
}
