import { SharedCredentialsRepository } from '@n8n/db';
import type { Project, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { In } from '@n8n/typeorm';

import { CredentialTypes } from '@/credential-types';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';

import {
	createSuccessBinding,
	type CredentialBinding,
	type WorkflowCredentialRequirement,
} from './credential.types';
import { CredentialMatcher, type CredentialMatcherContext } from './credential-matcher';

const READ_SCOPE = ['credential:read'] as const;

@Service()
export class IdBasedCredentialMatcher extends CredentialMatcher {
	constructor(
		credentialsFinderService: CredentialsFinderService,
		sharedCredentialsRepository: SharedCredentialsRepository,
		credentialTypes: CredentialTypes,
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

	/** A source id resolves when a credential with that id is owned by the target project, or is global, and the user can read it. */
	private async findResolvableCredentialIds(
		sourceIds: string[],
		targetProject: Project,
		user: User,
	): Promise<Set<string>> {
		const uniqueIds = [...new Set(sourceIds)];
		if (uniqueIds.length === 0) {
			return new Set();
		}

		const ownedByTargetProject = new Set(
			(
				await this.sharedCredentialsRepository.find({
					where: {
						credentialsId: In(uniqueIds),
						role: 'credential:owner',
						projectId: targetProject.id,
					},
					select: { credentialsId: true },
				})
			).map((row) => row.credentialsId),
		);

		const readableCredentials = await this.credentialsFinderService.findAllCredentialsForUser(
			user,
			[...READ_SCOPE],
			undefined,
			{ includeGlobalCredentials: true },
		);
		const credentialById = new Map(
			readableCredentials.map((credential) => [credential.id, credential]),
		);

		return new Set(
			uniqueIds.filter((id) => {
				const credential = credentialById.get(id);
				return credential !== undefined && (ownedByTargetProject.has(id) || credential.isGlobal);
			}),
		);
	}
}
