import type { SerializedCredential } from '@n8n/api-types';
import { CredentialsFinderService, EventService } from '@n8n/backend-services';
import type { CredentialsEntity, OperationContext, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError, UnprocessableRequestError, UnexpectedError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';
import { CredentialDataError } from 'n8n-core';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import { CredentialDescriptionsService } from '@/credentials/credential-descriptions.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import { getExternalSecretExpressionPaths } from '@/credentials/external-secrets.utils';
import { CredentialsOverwrites } from '@/credentials-overwrites';
import { loginIdOf } from '@/events/login-id';

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
	CredentialDependencyPlan,
	CredentialDependencyRequest,
	CredentialImportPlan,
	CredentialMatch,
	CredentialResolution,
	CredentialResolutionFailure,
	CredentialUpdateCandidate,
	PlacedCredentialRequirement,
	PlannedCredentialMove,
} from './credential.types';
import type {
	ImportBindingMap,
	ImportContext,
	ImportedCredentialGrant,
	ImportedCredentialMove,
	ImportedCredentialPlaceholder,
} from '../../n8n-packages.types';
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
		private readonly enterpriseCredentialsService: EnterpriseCredentialsService,
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
		const matched = await this.credentialMatcherFactory
			.getMatcher(request.matchingMode)
			.match(request.requirements, {
				projectId: context.projectId,
				user: context.user,
				credentialBindings: request.credentialBindings,
				excludePersonalRoute: request.personalRoute === 'exclude',
			});
		const dependencies = activeDependencies(request);
		const ownership = await this.planMoves(context, request, dependencies);
		const { failures, ...dependencyPlan } = await this.planDependencies(
			context,
			dependencies,
			{
				successes: matched.successes,
				failures: mergeOwnershipFailures(matched.failures, ownership.failures),
			},
			ownership.moves,
		);
		const resolution: CredentialResolution = { successes: matched.successes, failures };
		const stubIds = new Map(
			credentialsToStub(request.missingMode, resolution).map(({ sourceId }) => [
				sourceId,
				request.matchingMode === 'id-only' ? sourceId : generateNanoId(),
			]),
		);

		if (request.conflictPolicy === 'keep-existing') {
			return {
				...resolution,
				...dependencyPlan,
				stubIds,
				candidates: [],
				updates: [],
				forbidden: [],
			};
		}

		return {
			...resolution,
			...dependencyPlan,
			stubIds,
			...(await this.planUpdates(context, request, resolution, dependencies, ownership.moves)),
		};
	}

	/**
	 * The owner changes for the package credentials that this scope owns: "the owner follows
	 * the package". Read-only. A credential of another type never moves and never changes: it
	 * becomes a `type_mismatch` failure, which blocks the import.
	 */
	private async planMoves(
		context: ImportContext,
		request: CredentialBindingRequest,
		dependencies: CredentialDependencyRequest | undefined,
	): Promise<{ moves: PlannedCredentialMove[]; failures: CredentialResolutionFailure[] }> {
		const moves: PlannedCredentialMove[] = [];
		const failures: CredentialResolutionFailure[] = [];
		if (dependencies?.ownerPolicy !== 'follow-package') return { moves, failures };

		for (const credentialId of dependencies.ownedIds) {
			const packageCredential = request.packageCredentials?.get(credentialId);
			if (packageCredential === undefined) continue;

			const check = await this.enterpriseCredentialsService.checkTransferKeepingShares(
				context.user,
				credentialId,
				context.projectId,
				{ destinationPendingCreation: dependencies.projectPendingCreation },
			);
			if (check.status === 'not-found') continue;

			if (check.type !== packageCredential.type) {
				failures.push({
					kind: 'type_mismatch',
					sourceId: credentialId,
					name: packageCredential.name,
					type: packageCredential.type,
					targetId: credentialId,
					expectedType: packageCredential.type,
					actualType: check.type,
				});
				continue;
			}
			if (check.status === 'not-needed') continue;
			// An instance credential does not match a project credential of the package.
			if (check.status === 'excluded' && check.reason === 'instance') {
				failures.push({
					kind: 'not_found',
					reason: 'incompatible-usage-scope',
					sourceId: credentialId,
					name: packageCredential.name,
					type: packageCredential.type,
				});
				continue;
			}

			moves.push({
				credentialId,
				name: check.name,
				type: check.type,
				toProjectId: context.projectId,
				...(check.fromProjectId !== undefined ? { fromProjectId: check.fromProjectId } : {}),
				...(check.status === 'excluded'
					? { status: 'excluded', reason: check.reason, isPlaceholder: false }
					: { status: check.status, isPlaceholder: check.isPlaceholder }),
			});
		}

		return { moves, failures };
	}

	/**
	 * Settles the unresolved references that the caller named in `credentialDependencies`.
	 * Read-only. A reference that it settles leaves `failures`, so it does not block. A
	 * credential that exists with another type always blocks: the import never binds it.
	 */
	private async planDependencies(
		context: ImportContext,
		dependencies: CredentialDependencyRequest | undefined,
		resolution: CredentialResolution,
		moves: PlannedCredentialMove[],
	): Promise<CredentialDependencyPlan & { failures: CredentialResolutionFailure[] }> {
		const matchedPlaceholderIds = await this.credentialsService.findPlaceholderIds([
			...new Set(resolution.successes.values()),
		]);
		const plan: Required<Omit<CredentialDependencyPlan, 'placeholderForbidden'>> = {
			placeholders: [],
			placeholderBindings: [],
			pendingGrants: [],
			pendingMoves: [],
			unresolvedAllowed: [],
			matchedPlaceholders: [...resolution.successes]
				.filter(([, targetId]) => matchedPlaceholderIds.has(targetId))
				.map(([sourceId]) => sourceId),
			moves,
		};
		if (dependencies === undefined) return { ...plan, failures: resolution.failures };

		const movedIntoScope = new Set(
			moves.filter(({ status }) => status === 'allowed').map(({ credentialId }) => credentialId),
		);
		// A move that cannot run does not stop the import: the credential stays where it is.
		const refusedMoves = new Set(
			moves.filter(({ status }) => status !== 'allowed').map(({ credentialId }) => credentialId),
		);
		const failures: CredentialResolutionFailure[] = [];

		for (const failure of resolution.failures) {
			const { sourceId } = failure;
			if (
				failure.kind === 'not_found' &&
				failure.targetId === undefined &&
				refusedMoves.has(sourceId)
			) {
				plan.unresolvedAllowed.push(sourceId);
				continue;
			}
			const named =
				dependencies.placeholderIds.has(sourceId) ||
				dependencies.allowedUnresolvedIds.has(sourceId) ||
				dependencies.grantIds.has(sourceId) ||
				movedIntoScope.has(sourceId);
			// An explicit binding names another credential, so the id rules do not apply to it.
			if (failure.kind !== 'not_found' || failure.targetId !== undefined || !named) {
				failures.push(failure);
				continue;
			}

			const destination = await this.credentialsFinder.findById(sourceId);
			if (destination === null) {
				if (dependencies.placeholderIds.has(sourceId) && failure.type !== undefined) {
					plan.placeholders.push({
						sourceId,
						name: failure.name ?? sourceId,
						type: failure.type,
						shareWithProjectIds: [],
					});
				} else if (dependencies.allowedUnresolvedIds.has(sourceId)) {
					plan.unresolvedAllowed.push(sourceId);
				} else {
					failures.push(failure);
				}
				continue;
			}

			// The id is taken: the destination credential never gets a placeholder.
			if (failure.type !== undefined && destination.type !== failure.type) {
				failures.push({
					...failure,
					kind: 'type_mismatch',
					targetId: destination.id,
					expectedType: failure.type,
					actualType: destination.type,
				});
				continue;
			}
			if (destination.usageScope !== 'project') {
				failures.push(failure);
				continue;
			}
			if (movedIntoScope.has(sourceId)) {
				plan.pendingMoves.push(sourceId);
				continue;
			}
			if (
				dependencies.grantIds.has(sourceId) &&
				(await this.enterpriseCredentialsService.checkProjectAccessGrant(
					context.user,
					sourceId,
					context.projectId,
				)) === 'grantable'
			) {
				plan.pendingGrants.push(sourceId);
				continue;
			}
			if (dependencies.allowedUnresolvedIds.has(sourceId)) {
				plan.unresolvedAllowed.push(sourceId);
				continue;
			}
			failures.push(failure);
		}

		return { ...plan, failures };
	}

	/**
	 * One id gets one placeholder: the first scope that needs it creates it, and each later
	 * scope binds to it and gets use access. Without `credential:create` in the project of the
	 * first scope, nobody gets the placeholder: the reference is a `not_found` failure again in
	 * each scope. Changes the plans in place. Returns the failures that it put back, so the
	 * caller can report them as blocking issues.
	 */
	async settlePlaceholders(
		scopes: Array<{
			context: ImportContext;
			plan: CredentialImportPlan;
			projectPendingCreation: boolean;
		}>,
	): Promise<Array<{ plan: CredentialImportPlan; failures: CredentialResolutionFailure[] }>> {
		const creators = new Map<string, { shareWithProjectIds: string[] } | 'forbidden'>();
		const mayCreate = new Map<string, boolean>();
		const restored: Array<{ plan: CredentialImportPlan; failures: CredentialResolutionFailure[] }> =
			[];

		for (const { context, plan, projectPendingCreation } of scopes) {
			const own: NonNullable<CredentialImportPlan['placeholders']> = [];
			const failures: CredentialResolutionFailure[] = [];

			for (const placeholder of plan.placeholders ?? []) {
				const { sourceId, name, type } = placeholder;
				let creator = creators.get(sourceId);
				if (creator === undefined) {
					if (!mayCreate.has(context.projectId)) {
						mayCreate.set(
							context.projectId,
							projectPendingCreation || (await this.canCreateIn(context)),
						);
					}
					creator = mayCreate.get(context.projectId) ? placeholder : 'forbidden';
					creators.set(sourceId, creator);
					if (creator !== 'forbidden') {
						own.push(placeholder);
						continue;
					}
				}

				if (creator === 'forbidden') {
					failures.push({ kind: 'not_found', sourceId, name, type });
					plan.placeholderForbidden = [...(plan.placeholderForbidden ?? []), sourceId];
				} else {
					if (!creator.shareWithProjectIds.includes(context.projectId)) {
						creator.shareWithProjectIds.push(context.projectId);
					}
					plan.placeholderBindings = [...(plan.placeholderBindings ?? []), sourceId];
				}
			}

			plan.placeholders = own;
			if (failures.length > 0) {
				plan.failures.push(...failures);
				restored.push({ plan, failures });
			}
		}

		return restored;
	}

	private async canCreateIn(context: ImportContext): Promise<boolean> {
		try {
			await this.credentialsService.assertCanCreateInProject(context.user, context.projectId);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Compares each matched credential in the update scope that has a package file with its
	 * stored state. A match the user cannot update is `forbidden` instead, and is not read.
	 * Decrypted values stay in this method: the plan keeps only ids and the package payload.
	 */
	private async planUpdates(
		context: ImportContext,
		request: CredentialBindingRequest,
		resolution: CredentialResolution,
		dependencies: CredentialDependencyRequest | undefined,
		moves: PlannedCredentialMove[],
	): Promise<Pick<CredentialImportPlan, 'candidates' | 'updates' | 'forbidden'>> {
		const { user } = context;
		const followsPackage = dependencies?.ownerPolicy === 'follow-package';
		const requirementsById = new Map(
			(request.requirements ?? []).map((requirement) => [requirement.id, requirement]),
		);
		const descriptionsEnabled = await this.credentialDescriptions.isEnabled();
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
			// Only the home project of the package writes the credential: see the owned pass below.
			if (followsPackage && dependencies.homes.has(sourceId)) continue;

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
				// With descriptions off, the description decides nothing: no difference, no conflict.
				packageCredential: descriptionsEnabled
					? packageCredential
					: { ...packageCredential, description: undefined },
				destination,
				ownerProjectId,
			});
		}

		// The package credentials that this scope owns, with or without a consumer in the scope.
		// A credential that moves into the project is updated as a credential of the project.
		const movesById = new Map(moves.map((move) => [move.credentialId, move]));
		const movedIds = new Set<string>();
		for (const credentialId of followsPackage ? dependencies.ownedIds : []) {
			const packageCredential = request.packageCredentials?.get(credentialId);
			const move = movesById.get(credentialId);
			if (packageCredential === undefined || (move && move.status !== 'allowed')) continue;

			const destination = await this.credentialsFinder.findById(credentialId, {
				includeSharedProject: true,
			});
			if (
				!destination ||
				destination.type !== packageCredential.type ||
				destination.isManaged ||
				destination.isResolvable ||
				destination.usageScope === 'instance'
			) {
				continue;
			}
			if (!move && credentialOwnerProjectId(destination) !== context.projectId) continue;
			if (move) movedIds.add(credentialId);

			inScope.push({
				match: {
					sourceId: credentialId,
					targetId: credentialId,
					targetName: destination.name,
					usedBy: mergeRequirementConsumers(requirementsById.get(credentialId)?.usedBy ?? []),
				},
				packageCredential: descriptionsEnabled
					? packageCredential
					: { ...packageCredential, description: undefined },
				destination,
				ownerProjectId: context.projectId,
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
		// After the move the project owns the credential, so the right in the project decides.
		if (
			movedIds.size > 0 &&
			(dependencies?.projectPendingCreation ||
				(await this.enterpriseCredentialsService.canUpdateCredentialsInProject(
					user,
					context.projectId,
				)))
		) {
			for (const credentialId of movedIds) updatableIds.add(credentialId);
		}
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
				...(packageCredential.description !== undefined
					? { description: packageCredential.description }
					: {}),
			};
			candidates.push(candidate);

			const differs = credentialDiffers(
				{
					name: destination.name,
					description: destination.description,
					data: await this.readStoredData(destination),
				},
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
		const dependencyResult = await this.applyDependencies(context, resolution, bindings);

		const packageData = credentialMissingModeUsesPackageData(request.missingMode)
			? packageDataBySourceId(request.requirements)
			: new Map<string, ICredentialDataDecryptedObject>();

		const packageDescriptions = new Map(
			(request.requirements ?? [])
				.filter(({ packageDescription }) => packageDescription !== undefined)
				.map(({ id, packageDescription }) => [id, packageDescription]),
		);

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
					...(packageDescriptions.has(sourceId)
						? { description: packageDescriptions.get(sourceId) }
						: {}),
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

		return { bindings, matched, stubbed, seeded, incomplete, ...dependencyResult };
	}

	/**
	 * Writes what the plan settled for `credentialDependencies`, before the workflows of the
	 * scope: the confirmed grants, the placeholders and the owner changes. Each write checks the
	 * rights of the user again. A grant or a move that the plan allowed and that the destination
	 * now refuses stops the import: the destination changed after the plan.
	 */
	private async applyDependencies(
		context: ImportContext,
		plan: CredentialImportPlan,
		bindings: ImportBindingMap,
	): Promise<
		Pick<
			CredentialBindResult,
			'placeholders' | 'placeholderBound' | 'grants' | 'unresolved' | 'moves'
		>
	> {
		const { user, projectId } = context;

		const grants: ImportedCredentialGrant[] = [];
		for (const credentialId of plan.pendingGrants ?? []) {
			const { status } = await this.enterpriseCredentialsService.grantProjectAccess(
				user,
				credentialId,
				projectId,
			);
			if (status !== 'granted' && status !== 'already-usable') {
				throw new UnprocessableRequestError(
					`The import cannot give project "${projectId}" access to credential "${credentialId}".`,
					'The credential or your permissions changed after the check. Run the import again.',
				);
			}
			grants.push({ credentialId, projectId, status });
			bindings.set(credentialId, credentialId);
		}

		const placeholders: ImportedCredentialPlaceholder[] = [];
		for (const { sourceId, name, type, shareWithProjectIds } of plan.placeholders ?? []) {
			const placeholder = await this.enterpriseCredentialsService.createPlaceholderCredential(
				{ id: sourceId, name, type, projectId, shareWithProjectIds },
				user,
			);
			bindings.set(sourceId, placeholder.id);
			placeholders.push({
				id: placeholder.id,
				name,
				type,
				projectId,
				sharedWithProjectIds: shareWithProjectIds,
			});
		}
		for (const sourceId of plan.placeholderBindings ?? []) bindings.set(sourceId, sourceId);

		const moves: ImportedCredentialMove[] = [];
		for (const { status, ...move } of plan.moves ?? []) {
			if (status !== 'allowed') {
				moves.push({ ...move, status });
				continue;
			}
			const result = await this.enterpriseCredentialsService.transferKeepingShares(
				user,
				move.credentialId,
				move.toProjectId,
			);
			// `not-needed`: another scope or a retry already moved it.
			if (result.status !== 'moved' && result.status !== 'not-needed') {
				throw new UnprocessableRequestError(
					`The import cannot move credential "${move.name}" (${move.credentialId}) to project "${move.toProjectId}".`,
					'The credential or your permissions changed after the check. Run the import again.',
				);
			}
			moves.push({ ...move, status: 'moved' });
		}
		for (const sourceId of plan.pendingMoves ?? []) bindings.set(sourceId, sourceId);
		// The caller accepted that the reference does not resolve. The workflow keeps the id, and
		// the write of the workflow must not refuse it as a credential that the user cannot use.
		for (const sourceId of plan.unresolvedAllowed ?? []) bindings.set(sourceId, sourceId);

		return {
			placeholders,
			placeholderBound: [
				...placeholders.map(({ id }) => id),
				...(plan.placeholderBindings ?? []),
				...(plan.matchedPlaceholders ?? []),
			],
			grants,
			unresolved: [...(plan.unresolvedAllowed ?? [])],
			moves,
		};
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
			// data, and the update writes only the set columns: sharing, `isGlobal` and
			// `isResolvable` stay. The description changes only when the package decides it.
			const encrypted = await this.credentialsService.createEncryptedData({
				id: targetId,
				name: prepared.name,
				type: prepared.type,
				data: prepared.data,
			});
			if (prepared.description !== undefined) encrypted.description = prepared.description;
			const saved = await this.credentialsService.update(
				targetId,
				encrypted,
				{ kind: 'user', user: context.user },
				prepared.data,
				{ user: context.user },
			);
			if (saved === null) throw credentialNotFound(group[0]);

			await this.emitCredentialUpdated(context.user, saved, prepared.data, context.ctx);
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
		ctx: OperationContext = {},
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
			loginId: loginIdOf(ctx),
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
	): Promise<{
		name: string;
		type: string;
		data: ICredentialDataDecryptedObject;
		description?: string | null;
	} | null> {
		// `prepareUpdateData` reads the owner project from the `shared` relation.
		const credential = await this.credentialsFinder.findById(update.targetId, {
			includeSharedProject: true,
		});
		if (!credential) throw credentialNotFound(update);
		// A planned move runs before the update. The dry run comes before the move, so it
		// validates the update against the project that owns the credential after it.
		// Changes only this loaded copy, which nothing saves.
		const ownerSharing = credential.shared?.find(({ role }) => role === 'credential:owner');
		if (ownerSharing) ownerSharing.projectId = update.ownerProjectId;

		const stored = await this.readStoredData(credential);
		if (
			!credentialDiffers(
				{ name: credential.name, description: credential.description, data: stored },
				update,
			)
		) {
			return null;
		}

		const merged = mergeIntoStored(stored, update.data ?? {});
		delete merged.oauthTokenData;

		// The default merge, not `partial`: `partial` adds all stored values back, which also
		// keeps the token that the client-credentials decision drops. `merged` already holds
		// the stored values.
		const prepared = await this.credentialsService.prepareUpdateData(
			user,
			{
				name: update.name,
				type: credential.type,
				data: merged,
				...(update.description !== undefined ? { description: update.description } : {}),
			},
			credential,
		);
		if (!isCredentialData(prepared.data)) {
			throw new UnexpectedError(`Prepared data of credential "${credential.id}" is not an object`);
		}

		return {
			name: prepared.name,
			type: credential.type,
			data: prepared.data,
			// Undefined when the package does not decide it or the instance has descriptions off.
			...(prepared.description !== undefined ? { description: prepared.description } : {}),
		};
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

/**
 * One failure for each credential. What the owned pass found for a credential decides over a
 * plain `not_found` of the matcher, which can say less: the matcher sees only what the
 * consumer project can use.
 */
function mergeOwnershipFailures(
	matcherFailures: CredentialResolutionFailure[],
	ownershipFailures: CredentialResolutionFailure[],
): CredentialResolutionFailure[] {
	const ownedIds = new Set(ownershipFailures.map(({ sourceId }) => sourceId));
	const kept = matcherFailures.filter(
		({ sourceId, kind, targetId }) =>
			!(ownedIds.has(sourceId) && kind === 'not_found' && targetId === undefined),
	);
	const keptIds = new Set(kept.map(({ sourceId }) => sourceId));
	return [...kept, ...ownershipFailures.filter(({ sourceId }) => !keptIds.has(sourceId))];
}

/** The decisions of the caller apply only to references that the matcher looks up by id. */
function activeDependencies(
	request: CredentialBindingRequest,
): CredentialDependencyRequest | undefined {
	return request.matchingMode === 'id-only' ? request.dependencies : undefined;
}
