import { CredentialsRepository, SharedCredentialsRepository } from '@n8n/db';
import type { Project, User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Scope } from '@n8n/permissions';
import { In } from '@n8n/typeorm';

import { CredentialTypes } from '@/credential-types';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';

import { CredentialMatcher, type CredentialMatcherContext } from './credential-matcher';
import {
	createSuccessBinding,
	type CredentialBinding,
	type WorkflowCredentialRequirement,
} from './credential.types';

const READ_SCOPE: Scope[] = ['credential:read'];

@Service()
export class IdBasedCredentialMatcher extends CredentialMatcher {
	constructor(
		credentialsFinderService: CredentialsFinderService,
		sharedCredentialsRepository: SharedCredentialsRepository,
		credentialTypes: CredentialTypes,
		private readonly credentialsRepository: CredentialsRepository,
	) {
		super(credentialsFinderService, sharedCredentialsRepository, credentialTypes);
	}

	protected async resolve(
		known: WorkflowCredentialRequirement[],
		context: CredentialMatcherContext,
	): Promise<CredentialBinding[]> {
		const resolvableIds = await this.findResolvableCredentialIds(
			known.map((reference) => reference.id),
			context.targetProject,
			context.user,
		);

		return (
			known
				.filter((reference) => resolvableIds.has(reference.id))
				// id-only matching: the target credential id is the source id.
				.map((reference) => createSuccessBinding(reference.id, reference.id))
		);
	}

	/**
	 * A source id resolves when a credential with that id is owned by the target project, or,
	 * failing that, is shared globally — and, in either case, the importing user can read it.
	 *
	 * Ownership is checked first with an id-scoped query so the global lookup is skipped once
	 * every id is accounted for. The `credential:read` accessibility filter is then layered on
	 * top so a custom role granting `workflow:import` without `credential:read` cannot bind
	 * credentials the user is not allowed to read.
	 */
	private async findResolvableCredentialIds(
		sourceIds: string[],
		targetProject: Project,
		user: User,
	): Promise<Set<string>> {
		const uniqueIds = [...new Set(sourceIds)];
		if (uniqueIds.length === 0) {
			return new Set();
		}

		const ownedByTargetProject = await this.sharedCredentialsRepository.find({
			where: {
				credentialsId: In(uniqueIds),
				role: 'credential:owner',
				projectId: targetProject.id,
			},
			select: { credentialsId: true },
		});
		const candidateIds = new Set(ownedByTargetProject.map((row) => row.credentialsId));

		const unownedIds = uniqueIds.filter((id) => !candidateIds.has(id));
		if (unownedIds.length > 0) {
			const globalCredentials = await this.credentialsRepository.find({
				where: { id: In(unownedIds), isGlobal: true },
				select: { id: true },
			});
			for (const credential of globalCredentials) {
				candidateIds.add(credential.id);
			}
		}

		if (candidateIds.size === 0) {
			return candidateIds;
		}

		const readableIds = await this.credentialsFinderService.findCredentialIdsWithScopeForUser(
			[...candidateIds],
			user,
			READ_SCOPE,
		);

		return new Set([...candidateIds].filter((id) => readableIds.has(id)));
	}
}
