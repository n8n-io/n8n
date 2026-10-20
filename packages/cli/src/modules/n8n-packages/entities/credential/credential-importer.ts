import type { SerializedCredential } from '@n8n/api-types';
import { CredentialsFinderService } from '@n8n/backend-services';
import type { CredentialsEntity, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError, type ICredentialDataDecryptedObject } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';

import { credentialDiffers, isUpdateCandidate } from './credential-conflict-policy';
import { CredentialMatcherFactory } from './credential-matcher-factory';
import {
	credentialBlockingFailures,
	credentialMissingModeUsesPackageData,
	credentialsToStub,
} from './credential-missing-mode';
import type {
	CredentialApplyResult,
	CredentialBindingRequest,
	CredentialImportPlan,
	CredentialMatch,
	CredentialResolution,
	CredentialResolutionFailure,
	CredentialUpdateCandidate,
	PlacedCredentialRequirement,
} from './credential.types';
import type { ImportBindingMap, ImportContext } from '../../n8n-packages.types';
import { mergeRequirementConsumers } from '../../spec/requirement-consumers';

@Service()
export class CredentialImporter {
	constructor(
		private readonly credentialMatcherFactory: CredentialMatcherFactory,
		private readonly credentialsService: CredentialsService,
		private readonly credentialsFinder: CredentialsFinderService,
	) {}

	/**
	 * Resolves which target-project credentials the package's references map to.
	 * Read-only: returns matched `successes` and unresolved `failures` without
	 * acting on the failures. Mirrors the workflow side's `plan`. Unless the conflict
	 * policy is `keep-existing`, also finds the matches the policy can update.
	 */
	async plan(
		context: ImportContext,
		request: CredentialBindingRequest,
	): Promise<CredentialImportPlan> {
		const resolution = await this.credentialMatcherFactory
			.getMatcher(request.matchingMode)
			.match(request.requirements, {
				projectId: context.projectId,
				user: context.user,
				credentialBindings: request.credentialBindings,
			});

		if (request.conflictPolicy === 'keep-existing') {
			return { ...resolution, candidates: [], updates: [], forbidden: [] };
		}

		return { ...resolution, ...(await this.planUpdates(context.user, request, resolution)) };
	}

	/**
	 * Compares each matched credential in the update scope that has a package file with its
	 * stored state. A match the user cannot update is `forbidden` instead, and is not read.
	 * Decrypted values stay in this method: the plan keeps only ids and the package payload.
	 */
	private async planUpdates(
		user: User,
		request: CredentialBindingRequest,
		resolution: CredentialResolution,
	): Promise<Pick<CredentialImportPlan, 'candidates' | 'updates' | 'forbidden'>> {
		const requirementsById = new Map(
			(request.requirements ?? []).map((requirement) => [requirement.id, requirement]),
		);
		const destinations = new Map<string, CredentialsEntity | null>();
		const inScope: Array<{
			match: CredentialMatch;
			packageCredential: SerializedCredential;
			destination: CredentialsEntity;
		}> = [];

		for (const [sourceId, targetId] of resolution.successes) {
			// No file means the exporting user could not read the credential: bind only.
			const packageCredential = request.packageCredentials?.get(sourceId);
			if (packageCredential === undefined) continue;

			if (!destinations.has(targetId)) {
				destinations.set(
					targetId,
					await this.credentialsFinder.findById(targetId, { includeSharedProject: true }),
				);
			}
			const destination = destinations.get(targetId);
			if (!destination || !isUpdateCandidate(destination, request.updateScope)) continue;

			inScope.push({
				match: {
					sourceId,
					targetId,
					targetName: destination.name,
					usedBy: mergeRequirementConsumers(requirementsById.get(sourceId)?.usedBy ?? []),
				},
				packageCredential,
				destination,
			});
		}

		// Matching needs only use access. The comparison reads the stored secret, so a match in
		// scope that the user cannot update blocks without being read.
		const updatableIds =
			inScope.length > 0
				? await this.credentialsFinder.findCredentialIdsWithScopeForUser(
						[...new Set(inScope.map(({ match }) => match.targetId))],
						user,
						['credential:update'],
					)
				: new Set<string>();
		const candidates: CredentialUpdateCandidate[] = [];
		const updates: CredentialUpdateCandidate[] = [];
		const forbidden: CredentialMatch[] = [];

		for (const { match, packageCredential, destination } of inScope) {
			if (!updatableIds.has(match.targetId)) {
				forbidden.push(match);
				continue;
			}

			const candidate: CredentialUpdateCandidate = {
				...match,
				name: packageCredential.name,
				...(packageCredential.data !== undefined ? { data: packageCredential.data } : {}),
			};
			candidates.push(candidate);

			const differs = credentialDiffers(
				{ name: destination.name, data: await this.credentialsService.decrypt(destination, true) },
				packageCredential,
			);
			if (differs) updates.push(candidate);
		}

		return { candidates, updates, forbidden };
	}

	/**
	 * Classifies which unresolved references block the import under the chosen
	 * missing-mode policy. Pure — the pipeline gates or reports these uniformly
	 * alongside other blocking issues.
	 */
	blockingFailures(
		request: CredentialBindingRequest,
		resolution: CredentialResolution,
	): CredentialResolutionFailure[] {
		return credentialBlockingFailures(request.missingMode, resolution);
	}

	async assertCanCreate(
		context: ImportContext,
		request: CredentialBindingRequest,
		resolution: CredentialResolution,
	): Promise<void> {
		if (!credentialMissingModeUsesPackageData(request.missingMode)) return;

		const packageData = packageDataBySourceId(request.requirements);
		for (const { sourceId } of credentialsToStub(request.missingMode, resolution)) {
			const data = packageData.get(sourceId);
			if (data !== undefined) {
				await this.credentialsService.validateStubCredentialData(
					data,
					context.user,
					context.projectId,
				);
			}
		}
	}

	async apply(
		context: ImportContext,
		request: CredentialBindingRequest,
		resolution: CredentialResolution,
	): Promise<CredentialApplyResult> {
		const bindings: ImportBindingMap = new Map(resolution.successes);
		const matched = [...resolution.successes.keys()];
		const stubbed: string[] = [];
		const seeded: string[] = [];
		const incomplete: string[] = [];

		const packageData = credentialMissingModeUsesPackageData(request.missingMode)
			? packageDataBySourceId(request.requirements)
			: new Map<string, ICredentialDataDecryptedObject>();

		for (const credential of credentialsToStub(request.missingMode, resolution)) {
			const { sourceId, type, name } = credential;
			if (type === undefined) {
				throw new UnexpectedError(
					`Cannot create stub for credential "${sourceId}": missing credential type`,
				);
			}

			const data = packageData.get(sourceId);
			const stubCredential = await this.credentialsService.createStubCredential(
				{
					// Preserve source identity only when matching by id.
					id: request.matchingMode === 'id-only' ? sourceId : undefined,
					name: name ?? sourceId,
					type,
					projectId: context.projectId,
					...(data !== undefined ? { data } : {}),
				},
				context.user,
			);

			bindings.set(sourceId, stubCredential.id);
			if (data === undefined) {
				stubbed.push(sourceId);
			} else {
				(request.requirements?.find(({ id }) => id === sourceId)?.packageDataIsComplete
					? seeded
					: incomplete
				).push(sourceId);
			}
		}

		return { bindings, matched, stubbed, seeded, incomplete };
	}
}

/** Non-empty bundled expression data per source id; empty data means an empty stub. */
function packageDataBySourceId(
	requirements: PlacedCredentialRequirement[] | undefined,
): Map<string, ICredentialDataDecryptedObject> {
	const data = new Map<string, ICredentialDataDecryptedObject>();
	for (const requirement of requirements ?? []) {
		if (requirement.packageData !== undefined && Object.keys(requirement.packageData).length > 0) {
			// Zod-validated plain JSON is what Cipher encrypts at rest, but CredentialInformation
			// cannot type a mixed-element array, so the compatibility is asserted, not inferred.
			data.set(requirement.id, requirement.packageData as ICredentialDataDecryptedObject);
		}
	}
	return data;
}
