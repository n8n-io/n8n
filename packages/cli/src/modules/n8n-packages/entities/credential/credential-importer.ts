import type { SerializedCredential } from '@n8n/api-types';
import { CredentialsFinderService, EventService } from '@n8n/backend-services';
import type { CredentialsEntity, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError, UnprocessableRequestError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';
import { CredentialDataError } from 'n8n-core';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { UnexpectedError, type ICredentialDataDecryptedObject } from 'n8n-workflow';

import { CredentialDescriptionsService } from '@/credentials/credential-descriptions.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { getExternalSecretExpressionPaths } from '@/credentials/external-secrets.utils';
import { CredentialsOverwrites } from '@/credentials-overwrites';

import {
	credentialDiffers,
	credentialOwnerProjectId,
	isUpdateCandidate,
	mergeIntoStored,
	plannedCredentialUpdates,
} from './credential-conflict-policy';
import { CredentialMatcherFactory } from './credential-matcher-factory';
import {
	credentialBlockingFailures,
	credentialMissingModeUsesPackageData,
	credentialsToStub,
} from './credential-missing-mode';
import type {
	CredentialBindResult,
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
		private readonly eventService: EventService,
		private readonly credentialDescriptions: CredentialDescriptionsService,
		private readonly credentialsOverwrites: CredentialsOverwrites,
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
				excludePersonalRoute: request.personalRoute === 'exclude',
			});
		const stubIds = new Map(
			credentialsToStub(request.missingMode, resolution).map(({ sourceId }) => [
				sourceId,
				request.matchingMode === 'id-only' ? sourceId : generateNanoId(),
			]),
		);

		if (request.conflictPolicy === 'keep-existing') {
			return { ...resolution, stubIds, candidates: [], updates: [], forbidden: [] };
		}

		return {
			...resolution,
			stubIds,
			...(await this.planUpdates(context.user, request, resolution)),
		};
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
			ownerProjectId: string;
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
			const ownerProjectId = credentialOwnerProjectId(destination);
			if (ownerProjectId === undefined) continue;

			inScope.push({
				match: {
					sourceId,
					targetId,
					targetName: destination.name,
					usedBy: mergeRequirementConsumers(requirementsById.get(sourceId)?.usedBy ?? []),
				},
				packageCredential,
				destination,
				ownerProjectId,
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

		for (const { match, packageCredential, destination, ownerProjectId } of inScope) {
			if (!updatableIds.has(match.targetId)) {
				forbidden.push(match);
				continue;
			}

			const candidate: CredentialUpdateCandidate = {
				...match,
				targetType: destination.type,
				ownerProjectId,
				name: packageCredential.name,
				...(packageCredential.data !== undefined ? { data: packageCredential.data } : {}),
			};
			candidates.push(candidate);

			const differs = credentialDiffers(
				{ name: destination.name, data: await this.readStoredData(destination) },
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
		projectPendingCreation: boolean,
	): Promise<void> {
		const toCreate = credentialsToStub(request.missingMode, resolution);
		if (toCreate.length === 0) return;

		// The import creates this project and makes the user its admin, so it has no scopes to look up yet.
		if (!projectPendingCreation) {
			await this.credentialsService.assertCanCreateInProject(context.user, context.projectId);
		}

		if (!credentialMissingModeUsesPackageData(request.missingMode)) return;

		const packageData = packageDataBySourceId(request.requirements);
		for (const { sourceId } of toCreate) {
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

	/**
	 * Prepares each planned update without writing it, so that a validation error stops the
	 * import before its first write. Errors of `prepareUpdateData` propagate unchanged: external
	 * secrets permission and provider access, entity validation, OAuth URLs.
	 */
	async assertCanUpdate(
		context: ImportContext,
		request: CredentialBindingRequest,
		plan: CredentialImportPlan,
	): Promise<void> {
		for (const [, [update]] of plannedCredentialUpdates(request.conflictPolicy, [plan])) {
			await this.prepareUpdate(context.user, update);
		}
	}

	async apply(
		context: ImportContext,
		request: CredentialBindingRequest,
		resolution: CredentialImportPlan,
	): Promise<CredentialBindResult> {
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
			const targetId = resolution.stubIds.get(sourceId);
			if (type === undefined || targetId === undefined) {
				throw new UnexpectedError(
					`Cannot create stub for credential "${sourceId}": incomplete credential plan`,
				);
			}

			const data = packageData.get(sourceId);
			const stubCredential = await this.credentialsService.createStubCredential(
				{
					id: targetId,
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

	/**
	 * Writes the planned updates under `overwrite`, one write for each destination credential.
	 * Loads, decrypts and merges again, and skips a credential that no longer differs: another
	 * scope of the import or a concurrent edit already wrote the same values. Emits
	 * `credentials-updated` for each write. Returns the source ids of the credentials it wrote.
	 */
	async applyUpdates(
		context: ImportContext,
		request: CredentialBindingRequest,
		plan: CredentialImportPlan,
	): Promise<string[]> {
		const updated: string[] = [];

		for (const [targetId, group] of plannedCredentialUpdates(request.conflictPolicy, [plan])) {
			const prepared = await this.prepareUpdate(context.user, group[0]);
			if (prepared === null) continue;

			// Like the credential UI route. `createEncryptedData` sets only the id, name, type and
			// data, and the update writes only the set columns: sharing, `isGlobal`,
			// `isResolvable` and the description stay.
			const encrypted = await this.credentialsService.createEncryptedData({
				id: targetId,
				name: prepared.name,
				type: prepared.type,
				data: prepared.data,
			});
			const saved = await this.credentialsService.update(
				targetId,
				encrypted,
				{ kind: 'user', user: context.user },
				prepared.data,
				{ user: context.user },
			);
			if (saved === null) throw credentialNotFound(group[0]);

			await this.emitCredentialUpdated(context.user, saved, prepared.data);
			updated.push(...group.map(({ sourceId }) => sourceId));
		}

		return updated;
	}

	/**
	 * The same event as a credential save in the UI or the public API, so that its listeners
	 * (agent runtime cache, activity, log streaming, telemetry) see an import update too.
	 */
	private async emitCredentialUpdated(
		user: User,
		saved: CredentialsEntity,
		data: ICredentialDataDecryptedObject,
	): Promise<void> {
		this.eventService.emit('credentials-updated', {
			user,
			credentialType: saved.type,
			credentialId: saved.id,
			credentialName: saved.name,
			...((await this.credentialDescriptions.isEnabled()) && {
				credentialDescriptionLength: saved.description?.length ?? 0,
			}),
			isDynamic: saved.isResolvable ?? false,
			usesExternalSecrets: getExternalSecretExpressionPaths(data).length > 0,
			jweEnabled: data.jweEnabled === true,
			supportsManagedAuth: this.credentialsOverwrites.supportsManagedAuth(saved.type),
			usesManagedAuth: this.credentialsOverwrites.usesManagedAuth(saved.type, data),
			managedAppVersion: this.credentialsOverwrites.getManagedAppVersion(saved.type, data),
		});
	}

	/**
	 * The data that one update writes, prepared like the credential UI prepares a save. `null`
	 * when the stored credential already holds what the package writes. The decrypted data
	 * stays with the caller and is never logged.
	 */
	private async prepareUpdate(
		user: User,
		update: CredentialUpdateCandidate,
	): Promise<{ name: string; type: string; data: ICredentialDataDecryptedObject } | null> {
		// `prepareUpdateData` reads the owner project from the `shared` relation.
		const credential = await this.credentialsFinder.findById(update.targetId, {
			includeSharedProject: true,
		});
		if (!credential) throw credentialNotFound(update);

		const stored = await this.readStoredData(credential);
		if (!credentialDiffers({ name: credential.name, data: stored }, update)) return null;

		const merged = mergeIntoStored(stored, update.data ?? {});
		// `prepareUpdateData` adds the stored token back, except when the update points a
		// client-credentials grant at another client. A token in the input skips that decision.
		delete merged.oauthTokenData;

		// The default merge, not `partial`: `partial` adds all stored values back, which also
		// keeps the token that the client-credentials decision drops. `merged` already holds
		// the stored values.
		const prepared = await this.credentialsService.prepareUpdateData(
			user,
			{ name: update.name, type: credential.type, data: merged },
			credential,
		);
		if (!isCredentialData(prepared.data)) {
			throw new UnexpectedError(`Prepared data of credential "${credential.id}" is not an object`);
		}

		return { name: prepared.name, type: credential.type, data: prepared.data };
	}

	/**
	 * The stored data, decrypted. Unreadable data blocks the import: read as empty, it would
	 * compare as different, and the merge would replace the stored values.
	 */
	private async readStoredData(
		credential: CredentialsEntity,
	): Promise<ICredentialDataDecryptedObject> {
		try {
			return await this.credentialsService.decryptOrFail(credential);
		} catch (error) {
			if (!(error instanceof CredentialDataError)) throw error;
			throw new UnprocessableRequestError(
				`n8n cannot read the stored data of credential "${credential.name}" (${credential.id}). The import cannot compare or update it.`,
				'Fix or recreate the credential in this instance, or import with the "keep-existing" conflict policy.',
			);
		}
	}
}

function credentialNotFound(update: CredentialUpdateCandidate): NotFoundError {
	return new NotFoundError(
		`Credential "${update.targetName}" (${update.targetId}) does not exist. The import cannot update it.`,
	);
}

/** `prepareUpdateData` returns the decrypted data in `data`, which the entity types as a string. */
function isCredentialData(data: unknown): data is ICredentialDataDecryptedObject {
	return isRecord(data);
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
