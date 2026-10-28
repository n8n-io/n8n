import { Logger } from '@n8n/backend-common';
import type { ContentImportTransport } from '@n8n/decorators';
import { Service } from '@n8n/di';

import type { PolicyActor } from '@/policy/policy-enforcement-backend';
import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';

import { credentialsToStub } from '../entities/credential/credential-missing-mode';
import type {
	CredentialBindingRequest,
	CredentialResolution,
	CredentialUpdateCandidate,
} from '../entities/credential/credential.types';
import type { BlockingIssue, ImportPlanMode } from '../n8n-packages.types';
import { mergeRequirementConsumers } from '../spec/requirement-consumers';
import { verdict } from './policy-verdict';

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
		mode: ImportPlanMode,
	): Promise<BlockingIssue[]> {
		// Having no policy at all is the common case, so skip the selection too.
		if (!this.policyEnforcementService.hasChecksFor('credentialSave')) return [];

		const refused: BlockingIssue[] = [];
		let checkFailed = false;

		for (const { sourceId, name, type } of credentialsToStub(request.missingMode, resolution)) {
			// Apply rejects a stub without a type before it reaches the policy, so there is no
			// verdict to ask for.
			if (type === undefined) continue;

			const context = { credential: { id: null, type }, storedCredential: null, projectId };
			// The clearance is discarded: the stub insert mints its own when it writes.
			const { violations, failed } = await verdict(
				mode,
				async () => await this.policyEnforcementService.enforceCredentialSave(context, actor),
				async () => await this.policyEnforcementService.evaluateCredentialSave(context),
			);
			checkFailed ||= failed;
			if (violations.length === 0) continue;

			if (mode === 'enforce') {
				this.logger.warn(
					`Credential "${name ?? sourceId}" is blocked by the credential-save policy`,
					{
						violations,
					},
				);
			}

			refused.push({
				type: 'credential-policy-violation',
				sourceId,
				...(name !== undefined ? { name } : {}),
				credentialType: type,
				usedBy: mergeRequirementConsumers(
					request.requirements?.find(({ id }) => id === sourceId)?.usedBy ?? [],
				),
				violations,
			});
		}

		if (checkFailed) refused.push({ type: 'policy-check-failed', point: 'credentialSave' });
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
		mode: ImportPlanMode,
	): Promise<BlockingIssue[]> {
		const checksSave = this.policyEnforcementService.hasChecksFor('credentialSave');
		const checksImport = this.policyEnforcementService.hasChecksFor('contentImport');
		if (!checksSave && !checksImport) return [];

		const refused: BlockingIssue[] = [];
		const failedPoints = new Set<'credentialSave' | 'contentImport'>();

		for (const [targetId, group] of updatesByTarget) {
			const { targetType: type, ownerProjectId: projectId, targetName } = group[0];
			const credential = { id: targetId, type };
			const saveContext = { credential, storedCredential: credential, projectId };
			const importContext = { credential, projectId, transport };

			// The clearances are discarded: the update mints its own when it writes.
			const save = checksSave
				? await verdict(
						mode,
						async () =>
							await this.policyEnforcementService.enforceCredentialSave(saveContext, actor),
						async () => await this.policyEnforcementService.evaluateCredentialSave(saveContext),
					)
				: { violations: [], failed: false };
			const contentImport = checksImport
				? await verdict(
						mode,
						async () =>
							await this.policyEnforcementService.enforceContentImport(importContext, actor),
						async () => await this.policyEnforcementService.evaluateContentImport(importContext),
					)
				: { violations: [], failed: false };
			if (save.failed) failedPoints.add('credentialSave');
			if (contentImport.failed) failedPoints.add('contentImport');

			const violations = [...save.violations, ...contentImport.violations];
			if (violations.length === 0) continue;

			if (mode === 'enforce') {
				this.logger.warn(
					`Update of credential "${targetName}" is blocked by the credential policy`,
					{
						violations,
					},
				);
			}

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

		for (const point of failedPoints) refused.push({ type: 'policy-check-failed', point });
		return refused;
	}
}
