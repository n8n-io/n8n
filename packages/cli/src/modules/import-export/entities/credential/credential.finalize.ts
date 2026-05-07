import { CredentialsEntity, CredentialsRepository, SharedCredentialsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { Credentials } from 'n8n-core';

import type { ImportScope } from '../../import-export.types';
import type { PackageCredentialRequirement } from '../../spec/requirements.types';
import { CredentialResolver } from './credential.resolver';

export interface CredentialFinalizeOptions {
	/** Bindings carried into finalize: source credential ID → target credential ID. */
	bindings: Map<string, string>;
	/** Unresolved credential requirements; if `createStubs`, stubs are created for these. */
	unresolvedRequirements: PackageCredentialRequirement[];
	/** When true, create empty credential stubs for unresolved requirements. */
	createStubs: boolean;
}

/**
 * Owns credential mutations during package import.
 *
 * Credentials don't follow the entity-import pattern (manifest entry → DB
 * row) because their content (encrypted data) is never exported. Instead,
 * credentials are resolved as *requirements* by `BindingResolver`. This
 * class finalises the result of that resolution by:
 *
 *   1. Creating empty stubs for unresolved requirements (when requested).
 *   2. Ensuring every bound credential is shared with the target project,
 *      so workflows referencing it can actually run.
 *
 * The returned map is the final source ID → target ID mapping consumed by
 * `WorkflowImporter` to remap credential references on workflow nodes.
 */
@Service()
export class CredentialImporter {
	constructor(
		private readonly credentialsRepository: CredentialsRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly credentialResolver: CredentialResolver,
	) {}

	async finalize(
		scope: ImportScope,
		options: CredentialFinalizeOptions,
	): Promise<Map<string, string>> {
		const bindings = new Map(options.bindings);

		// 1. Create stubs for unresolved requirements (if requested).
		if (options.createStubs) {
			for (const req of options.unresolvedRequirements) {
				if (bindings.has(req.id)) continue;
				const targetId = await this.createStub(scope, req.name, req.type);
				bindings.set(req.id, targetId);
			}
		}

		// 2. Ensure every bound credential is reachable from the target project.
		// Auto-resolved credentials matched by `CredentialResolver.findInProject`
		// are already shared (the resolver filters on `shared: { projectId }`),
		// so this is a no-op for them. It catches user-provided bindings or
		// future resolvers that don't enforce scope.
		await this.ensureSharedWithProject(bindings, scope.targetProjectId);

		return bindings;
	}

	/**
	 * Backwards-compatible alias for the legacy stubs-from-requirements call.
	 * Prefer `finalize()` for new code paths — it does both stub creation
	 * and credential sharing in one place.
	 */
	async createStubsFromRequirements(
		scope: ImportScope,
		requirements: PackageCredentialRequirement[],
		existingBindings: Map<string, string>,
	): Promise<Map<string, string>> {
		return await this.finalize(scope, {
			bindings: existingBindings,
			unresolvedRequirements: requirements,
			createStubs: true,
		});
	}

	/**
	 * Find an existing credential by name + type in the target project,
	 * or create an empty stub. Returns the target credential ID.
	 */
	private async createStub(scope: ImportScope, name: string, type: string): Promise<string> {
		const existing = await this.credentialResolver.findInProject(name, type, scope.targetProjectId);
		if (existing) return existing.id;

		// Encrypt empty data so the row is valid.
		const credentials = new Credentials({ id: null, name }, type);
		credentials.setData({});
		const encryptedData = credentials.getDataToSave();

		const manager = scope.entityManager ?? this.credentialsRepository.manager;
		const saved = await manager.transaction(async (tx) => {
			const entity = this.credentialsRepository.create({
				name,
				type,
				data: encryptedData.data as string,
			});

			const savedEntity = await tx.save<CredentialsEntity>(entity);

			const sharedCredential = this.sharedCredentialsRepository.create({
				role: 'credential:owner',
				credentials: savedEntity,
				projectId: scope.targetProjectId,
			});

			await tx.save(sharedCredential);

			return savedEntity;
		});

		return saved.id;
	}

	/**
	 * Make sure every bound credential is shared with the target project,
	 * giving the importing workflows usable references.
	 */
	private async ensureSharedWithProject(
		bindings: Map<string, string>,
		targetProjectId: string,
	): Promise<void> {
		const targetCredentialIds = [...new Set(bindings.values())];
		if (targetCredentialIds.length === 0) return;

		for (const credentialId of targetCredentialIds) {
			const existing = await this.sharedCredentialsRepository.findOne({
				where: { credentialsId: credentialId, projectId: targetProjectId },
			});

			if (!existing) {
				const shared = this.sharedCredentialsRepository.create({
					credentialsId: credentialId,
					projectId: targetProjectId,
					role: 'credential:user',
				});
				await this.sharedCredentialsRepository.save(shared);
			}
		}
	}
}
