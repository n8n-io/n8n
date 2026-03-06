import { CredentialsRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import type { PackageCredentialRequirement } from '../import-export.types';
import type { RequirementResolver, ResolveContext } from '../requirement-resolver';

/**
 * Resolves credential requirements by matching name + type within the
 * target project. This is the default (and currently only) strategy.
 *
 * Also exposes `findInProject()` for reuse by `CredentialImporter`
 * when creating stubs (same lookup, different consumer).
 */
@Service()
export class CredentialResolver implements RequirementResolver<PackageCredentialRequirement> {
	constructor(private readonly credentialsRepository: CredentialsRepository) {}

	async resolve(
		requirement: PackageCredentialRequirement,
		context: ResolveContext,
	): Promise<string | null> {
		if (!context.targetProjectId) return null;

		const match = await this.findInProject(
			requirement.name,
			requirement.type,
			context.targetProjectId,
		);
		return match?.id ?? null;
	}

	/** Find a credential by name + type in a project. */
	async findInProject(
		name: string,
		type: string,
		projectId: string,
	): Promise<{ id: string } | null> {
		return await this.credentialsRepository.findOne({
			select: ['id'],
			where: { name, type, shared: { projectId } },
		});
	}
}
