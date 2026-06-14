import { SharedCredentialsRepository } from '@n8n/db';
import type { Project, User } from '@n8n/db';
import { Service } from '@n8n/di';

import { CredentialTypes } from '@/credential-types';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';

import { CredentialMatcher, type CredentialMatcherContext } from './credential-matcher';
import type { ImportBindingMap } from '../../n8n-packages.types';
import type { PackageCredentialRequirement } from '../../spec/requirements.schema';

@Service()
export class IdBasedCredentialMatcher extends CredentialMatcher {
	constructor(
		credentialsFinderService: CredentialsFinderService,
		sharedCredentialsRepository: SharedCredentialsRepository,
		credentialTypes: CredentialTypes,
		private readonly credentialsService: CredentialsService,
	) {
		super(credentialsFinderService, sharedCredentialsRepository, credentialTypes);
	}

	protected async resolve(
		known: PackageCredentialRequirement[],
		context: CredentialMatcherContext,
	): Promise<ImportBindingMap> {
		const resolvableIds = await this.findResolvableCredentialIds(
			known.map((reference) => reference.id),
			context.targetProject,
			context.user,
		);

		return new Map(
			known
				.filter((reference) => resolvableIds.has(reference.id))
				// id-only matching: the target credential id is the source id.
				.map((reference) => [reference.id, reference.id]),
		);
	}

	private async findResolvableCredentialIds(
		sourceIds: string[],
		targetProject: Project,
		user: User,
	): Promise<Set<string>> {
		const uniqueIds = new Set(sourceIds);
		if (uniqueIds.size === 0) {
			return new Set();
		}

		const usableCredentials = await this.credentialsService.getCredentialsAUserCanUseInAWorkflow(
			user,
			{ projectId: targetProject.id },
		);

		return new Set(
			usableCredentials.map((credential) => credential.id).filter((id) => uniqueIds.has(id)),
		);
	}
}
