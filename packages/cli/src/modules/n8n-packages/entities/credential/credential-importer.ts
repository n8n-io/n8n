import { Service } from '@n8n/di';
import { UnexpectedError, type ICredentialDataDecryptedObject } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';

import { CredentialMatcherFactory } from './credential-matcher-factory';
import {
	credentialBlockingFailures,
	credentialMissingModeUsesPackageData,
	credentialsToStub,
} from './credential-missing-mode';
import type {
	CredentialApplyResult,
	CredentialBindingRequest,
	CredentialResolution,
	CredentialResolutionFailure,
	PlacedCredentialRequirement,
} from './credential.types';
import type { ImportBindingMap, ImportContext } from '../../n8n-packages.types';

@Service()
export class CredentialImporter {
	constructor(
		private readonly credentialMatcherFactory: CredentialMatcherFactory,
		private readonly credentialsService: CredentialsService,
	) {}

	/**
	 * Resolves which target-project credentials the package's references map to.
	 * Read-only: returns matched `successes` and unresolved `failures` without
	 * acting on the failures. Mirrors the workflow side's `plan`.
	 */
	async plan(
		context: ImportContext,
		request: CredentialBindingRequest,
	): Promise<CredentialResolution> {
		return await this.credentialMatcherFactory
			.getMatcher(request.matchingMode)
			.match(request.requirements, {
				projectId: context.projectId,
				user: context.user,
				credentialBindings: request.credentialBindings,
			});
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
			(data !== undefined ? seeded : stubbed).push(sourceId);
		}

		return { bindings, matched, stubbed, seeded };
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
